const express = require("express");

const pool = require("../db");
const auth = require("../middleware/auth");
const { requireRole } = require("../middleware/role");

const router = express.Router();

router.use(auth);

async function logAdminAction(adminId, actionType, targetTable, targetId, description, adminNotes) {
  const sql = `
    INSERT INTO admin_logs (admin_id, action_type, target_table, target_id, description, admin_notes)
    VALUES ($1, $2, $3, $4, $5, $6)
  `;
  await pool.query(sql, [
    adminId,
    actionType,
    targetTable || null,
    targetId || null,
    description || null,
    adminNotes || null,
  ]);
}

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
    const { engagement_id, reason, resolution_deadline } = req.body || {};
    if (!engagement_id || !reason || !resolution_deadline) {
      return res.status(400).json({ error: "engagement_id, reason, resolution_deadline are required" });
    }

    const e = await getEngagementWithUsers(engagement_id);
    if (!e) return res.status(404).json({ error: "Engagement not found" });

    const userId = req.user.userId;
    const isParticipant = e.victim_user_id === userId || e.lawyer_user_id === userId;
    if (!isParticipant) return res.status(403).json({ error: "Forbidden" });

    const sql = `
      INSERT INTO disputes (engagement_id, raised_by, reason, status, resolution_deadline)
      VALUES ($1,$2,$3,'open',$4)
      RETURNING *
    `;
    const { rows } = await pool.query(sql, [
      engagement_id,
      userId,
      String(reason),
      resolution_deadline,
    ]);
    return res.status(201).json({ data: rows[0] });
  } catch (err) {
    return next(err);
  }
});

router.get("/my", async (req, res, next) => {
  try {
    const sql = `
      SELECT d.*
      FROM disputes d
      JOIN engagements e ON e.id = d.engagement_id
      JOIN victim_profiles vp ON vp.id = e.victim_id
      JOIN lawyer_profiles lp ON lp.id = e.lawyer_id
      WHERE d.raised_by = $1 OR vp.user_id = $1 OR lp.user_id = $1
      ORDER BY d.created_at DESC
    `;
    const { rows } = await pool.query(sql, [req.user.userId]);
    return res.json({ data: rows });
  } catch (err) {
    return next(err);
  }
});

router.get("/", requireRole("admin"), async (req, res, next) => {
  try {
    const { status } = req.query || {};
    const params = [];
    const where = [];

    if (status) {
      if (!["open", "under_review", "resolved", "dismissed"].includes(String(status))) {
        return res.status(400).json({ error: "Invalid status" });
      }
      params.push(String(status));
      where.push(`d.status = $${params.length}`);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const sql = `
      SELECT d.*
      FROM disputes d
      ${whereSql}
      ORDER BY d.created_at DESC
    `;
    const { rows } = await pool.query(sql, params);
    return res.json({ data: rows });
  } catch (err) {
    return next(err);
  }
});

router.put("/:id/status", requireRole("admin"), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, admin_notes } = req.body || {};

    if (!["open", "under_review", "resolved", "dismissed"].includes(String(status || ""))) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const setResolved = status === "resolved" || status === "dismissed";

    const sql = `
      UPDATE disputes
      SET
        status = $1,
        admin_notes = $2,
        resolved_by = CASE WHEN $3::boolean THEN $4::uuid ELSE resolved_by END,
        resolved_at = CASE WHEN $3::boolean THEN NOW() ELSE resolved_at END
      WHERE id = $5
      RETURNING *
    `;
    const { rows } = await pool.query(sql, [
      status,
      admin_notes ?? null,
      setResolved,
      req.user.userId,
      id,
    ]);
    if (rows.length === 0) return res.status(404).json({ error: "Dispute not found" });

    await logAdminAction(
      req.user.userId,
      "dispute_status_change",
      "disputes",
      id,
      `Dispute status set to ${status}`,
      admin_notes || null
    );

    return res.json({ data: rows[0] });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;

