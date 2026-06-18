const express = require("express");
const bcrypt = require("bcryptjs");
const { body, validationResult } = require("express-validator");

const pool = require("../db");
const { signToken } = require("../utils/jwt");

const router = express.Router();

function validationError(res, errors) {
  return res.status(400).json({
    error: "Validation error",
    details: errors.array().map((e) => ({ field: e.path, message: e.msg })),
  });
}

router.post(
  "/register",
  [
    body("email").isEmail().withMessage("Valid email is required"),
    body("password")
      .isString()
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
    body("role")
      .isIn(["victim", "lawyer", "admin"])
      .withMessage("Role must be victim, lawyer, or admin"),
    body("contact_number").optional().isString().isLength({ min: 7, max: 20 }),
    body("full_name").optional().isString().isLength({ min: 2, max: 100 }),
    body("cnic")
      .optional()
      .matches(/^\d{13}$/)
      .withMessage("CNIC must be 13 digits"),
    body("bar_council_no").optional().isString().isLength({ min: 2, max: 50 }),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return validationError(res, errors);

    const { email, password, role, contact_number } = req.body;

    // Schema requires these to exist for profiles; we enforce on register.
    const fullName = req.body.full_name;
    const cnic = req.body.cnic;
    const barCouncilNo = req.body.bar_council_no;

    if (role === "victim" && (!fullName || !cnic)) {
      return res
        .status(400)
        .json({ error: "full_name and cnic are required for victim registration" });
    }
    if (role === "lawyer" && (!fullName || !barCouncilNo)) {
      return res.status(400).json({
        error: "full_name and bar_council_no are required for lawyer registration",
      });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const hashed = await bcrypt.hash(password, 10);

      const insertUserSql = `
        INSERT INTO users (email, hashed_password, role, contact_number, account_status)
        VALUES ($1, $2, $3, $4, 'active')
        RETURNING id, email, role, contact_number, account_status, created_at, updated_at
      `;
      const userResult = await client.query(insertUserSql, [
        email,
        hashed,
        role,
        contact_number || null,
      ]);
      const user = userResult.rows[0];

      if (role === "victim") {
        const sql = `
          INSERT INTO victim_profiles (user_id, full_name, cnic, preferred_language)
          VALUES ($1, $2, $3, 'en')
          RETURNING id
        `;
        await client.query(sql, [user.id, fullName, cnic]);
      } else if (role === "lawyer") {
        const sql = `
          INSERT INTO lawyer_profiles (user_id, full_name, bar_council_no)
          VALUES ($1, $2, $3)
          RETURNING id
        `;
        await client.query(sql, [user.id, fullName, barCouncilNo]);
      }

      await client.query("COMMIT");

      const token = signToken({ userId: user.id, role: user.role });
      return res.status(201).json({ data: { token, user } });
    } catch (err) {
      await client.query("ROLLBACK");
      return next(err);
    } finally {
      client.release();
    }
  }
);

router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Valid email is required"),
    body("password").isString().withMessage("Password is required"),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return validationError(res, errors);

    const { email, password } = req.body;
    try {
      const sql = `
        SELECT id, email, hashed_password, role, contact_number, account_status, created_at, updated_at
        FROM users
        WHERE email = $1 AND is_deleted = FALSE
        LIMIT 1
      `;
      const { rows } = await pool.query(sql, [email]);
      if (rows.length === 0) return res.status(401).json({ error: "Invalid credentials" });

      const userRow = rows[0];
      const ok = await bcrypt.compare(password, userRow.hashed_password);
      if (!ok) return res.status(401).json({ error: "Invalid credentials" });

      if (userRow.account_status !== "active") {
        return res.status(403).json({ error: "Account is not active" });
      }

      await pool.query(`UPDATE users SET last_login_at = NOW() WHERE id = $1`, [userRow.id]);

      const user = {
        id: userRow.id,
        email: userRow.email,
        role: userRow.role,
        contact_number: userRow.contact_number,
        account_status: userRow.account_status,
        created_at: userRow.created_at,
        updated_at: userRow.updated_at,
      };

      const token = signToken({ userId: user.id, role: user.role });
      return res.json({ data: { token, user } });
    } catch (err) {
      return next(err);
    }
  }
);

module.exports = router;

