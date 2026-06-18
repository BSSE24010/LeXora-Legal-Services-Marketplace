const express = require("express");

const pool = require("../db");
const auth = require("../middleware/auth");

const router = express.Router();

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

router.post("/", auth, async (req, res, next) => {
  try {
    const { engagement_id, reviewed_id, rating, comment } = req.body || {};
    if (!engagement_id || !reviewed_id || rating === undefined) {
      return res.status(400).json({ error: "engagement_id, reviewed_id, rating are required" });
    }
    const r = Number(rating);
    if (Number.isNaN(r) || r < 1 || r > 5) return res.status(400).json({ error: "rating must be 1-5" });
    if (reviewed_id === req.user.userId) return res.status(400).json({ error: "Cannot review yourself" });

    const e = await getEngagementWithUsers(engagement_id);
    if (!e) return res.status(404).json({ error: "Engagement not found" });

    const userId = req.user.userId;
    const isParticipant = e.victim_user_id === userId || e.lawyer_user_id === userId;
    if (!isParticipant) return res.status(403).json({ error: "Forbidden" });

    if (e.status !== "completed") {
      return res.status(400).json({ error: "Engagement must be completed to review" });
    }

    const otherUser = e.victim_user_id === userId ? e.lawyer_user_id : e.victim_user_id;
    if (String(reviewed_id) !== String(otherUser)) {
      return res.status(400).json({ error: "reviewed_id must be the other party in the engagement" });
    }

    const exists = await pool.query(
      `SELECT id FROM reviews WHERE reviewer_id = $1 AND engagement_id = $2 LIMIT 1`,
      [userId, engagement_id]
    );
    if (exists.rows.length) return res.status(409).json({ error: "You already reviewed this engagement" });

    const sql = `
      INSERT INTO reviews (engagement_id, reviewer_id, reviewed_id, rating, comment)
      VALUES ($1,$2,$3,$4,$5)
      RETURNING *
    `;
    const { rows } = await pool.query(sql, [
      engagement_id,
      userId,
      reviewed_id,
      r,
      comment ?? null,
    ]);
    return res.status(201).json({ data: rows[0] });
  } catch (err) {
    return next(err);
  }
});

router.get("/lawyer/:lawyerProfileId", async (req, res, next) => {
  try {
    const { lawyerProfileId } = req.params;
    const lawyerUser = await pool.query(
      `SELECT user_id FROM lawyer_profiles WHERE id = $1 LIMIT 1`,
      [lawyerProfileId]
    );
    if (lawyerUser.rows.length === 0) return res.status(404).json({ error: "Lawyer not found" });
    const lawyerUserId = lawyerUser.rows[0].user_id;

    const sql = `
      SELECT
        r.*,
        u.email AS reviewer_email
      FROM reviews r
      JOIN users u ON u.id = r.reviewer_id
      WHERE r.reviewed_id = $1
      ORDER BY r.created_at DESC
    `;
    const { rows } = await pool.query(sql, [lawyerUserId]);
    return res.json({ data: rows });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;

