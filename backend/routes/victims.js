const express = require("express");

const pool = require("../db");
const auth = require("../middleware/auth");
const { requireRole } = require("../middleware/role");

const router = express.Router();

async function getVictimProfileByUserId(userId) {
  const { rows } = await pool.query(
    `SELECT * FROM victim_profiles WHERE user_id = $1 LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

router.get("/me", auth, requireRole("victim"), async (req, res, next) => {
  try {
    const profile = await getVictimProfileByUserId(req.user.userId);
    if (!profile) return res.status(404).json({ error: "Victim profile not found" });
    return res.json({ data: profile });
  } catch (err) {
    return next(err);
  }
});

router.put("/me", auth, requireRole("victim"), async (req, res, next) => {
  try {
    const existing = await getVictimProfileByUserId(req.user.userId);
    if (!existing) return res.status(404).json({ error: "Victim profile not found" });

    const {
      full_name,
      city,
      province,
      preferred_language,
      cnic,
    } = req.body || {};

    if (preferred_language && !["en", "ur"].includes(preferred_language)) {
      return res.status(400).json({ error: "preferred_language must be en or ur" });
    }
    if (cnic && !/^\d{13}$/.test(String(cnic))) {
      return res.status(400).json({ error: "cnic must be 13 digits" });
    }

    const sql = `
      UPDATE victim_profiles
      SET
        full_name = COALESCE($1, full_name),
        city = COALESCE($2, city),
        province = COALESCE($3, province),
        preferred_language = COALESCE($4, preferred_language),
        cnic = COALESCE($5, cnic)
      WHERE user_id = $6
      RETURNING *
    `;
    const params = [
      full_name ?? null,
      city ?? null,
      province ?? null,
      preferred_language ?? null,
      cnic ?? null,
      req.user.userId,
    ];
    const { rows } = await pool.query(sql, params);
    return res.json({ data: rows[0] });
  } catch (err) {
    return next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const sql = `
      SELECT
        vp.id,
        vp.full_name,
        vp.city,
        vp.province,
        vp.preferred_language,
        vp.created_at,
        vp.updated_at
      FROM victim_profiles vp
      WHERE vp.id = $1
      LIMIT 1
    `;
    const { rows } = await pool.query(sql, [id]);
    if (rows.length === 0) return res.status(404).json({ error: "Victim not found" });
    return res.json({ data: rows[0] });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;

