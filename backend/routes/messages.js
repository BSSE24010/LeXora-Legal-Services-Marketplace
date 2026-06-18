const express = require("express");

const pool = require("../db");
const auth = require("../middleware/auth");
const { createNotification } = require("../utils/notifications");

const router = express.Router();

router.use(auth);

async function getEngagementWithUsers(engagementId) {
  const sql = `
    SELECT
      e.*,
      vp.user_id AS victim_user_id,
      lp.user_id AS lawyer_user_id
    FROM engagements e
    JOIN victim_profiles vp ON vp.id = e.victim_id
    JOIN lawyer_profiles lp ON lp.id = e.lawyer_id
    WHERE e.id = $1
    LIMIT 1
  `;
  const { rows } = await pool.query(sql, [engagementId]);
  return rows[0] || null;
}

router.post("/", async (req, res, next) => {
  try {
    const { engagement_id, content } = req.body || {};
    if (!engagement_id || !content || !String(content).trim()) {
      return res.status(400).json({ error: "engagement_id and content are required" });
    }

    const e = await getEngagementWithUsers(engagement_id);
    if (!e) return res.status(404).json({ error: "Engagement not found" });

    const userId = req.user.userId;
    const isParticipant = e.victim_user_id === userId || e.lawyer_user_id === userId;
    if (!isParticipant) return res.status(403).json({ error: "Forbidden" });

    const { rows } = await pool.query(
      `INSERT INTO messages (engagement_id, sender_id, content)
       VALUES ($1,$2,$3)
       RETURNING *`,
      [engagement_id, userId, String(content)]
    );
    const msg = rows[0];

    const recipientId = e.victim_user_id === userId ? e.lawyer_user_id : e.victim_user_id;
    await createNotification(
      pool,
      recipientId,
      "new_message",
      "New message",
      "You received a new message in an engagement chat.",
      msg.id,
      "messages"
    );

    return res.status(201).json({ data: msg });
  } catch (err) {
    return next(err);
  }
});

router.get("/engagement/:engagementId", async (req, res, next) => {
  try {
    const { engagementId } = req.params;
    const e = await getEngagementWithUsers(engagementId);
    if (!e) return res.status(404).json({ error: "Engagement not found" });

    const userId = req.user.userId;
    const isParticipant = e.victim_user_id === userId || e.lawyer_user_id === userId;
    if (!isParticipant) return res.status(403).json({ error: "Forbidden" });

    await pool.query(
      `UPDATE messages
       SET is_read = TRUE
       WHERE engagement_id = $1 AND sender_id != $2 AND is_read = FALSE`,
      [engagementId, userId]
    );

    const { rows } = await pool.query(
      `SELECT * FROM messages
       WHERE engagement_id = $1 AND is_deleted = FALSE
       ORDER BY sent_at ASC`,
      [engagementId]
    );
    return res.json({ data: rows });
  } catch (err) {
    return next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      `UPDATE messages
       SET is_deleted = TRUE
       WHERE id = $1 AND sender_id = $2
       RETURNING *`,
      [id, req.user.userId]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Message not found" });
    return res.json({ data: rows[0] });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;

