const express = require("express");

const pool = require("../db");
const auth = require("../middleware/auth");

const router = express.Router();

router.use(auth);

router.get("/", async (req, res, next) => {
  try {
    const unreadOnly = String(req.query.unread_only || "") === "true";

    const params = [req.user.userId];
    let where = `WHERE user_id = $1`;
    if (unreadOnly) where += ` AND is_read = FALSE`;

    const sql = `
      SELECT *
      FROM notifications
      ${where}
      ORDER BY created_at DESC
    `;
    const { rows } = await pool.query(sql, params);
    return res.json({ data: rows });
  } catch (err) {
    return next(err);
  }
});

router.put("/:id/read", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      `UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, req.user.userId]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Notification not found" });
    return res.json({ data: rows[0] });
  } catch (err) {
    return next(err);
  }
});

router.put("/read-all", async (req, res, next) => {
  try {
    await pool.query(`UPDATE notifications SET is_read = TRUE WHERE user_id = $1`, [
      req.user.userId,
    ]);
    return res.json({ data: { ok: true } });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;

