const express = require("express");

const pool = require("../db");
const auth = require("../middleware/auth");
const { requireRole } = require("../middleware/role");
const { createNotification } = require("../utils/notifications");

const router = express.Router();

router.use(auth);

async function getVictimProfileByUserId(userId) {
  const { rows } = await pool.query(
    `SELECT * FROM victim_profiles WHERE user_id = $1 LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

async function getLawyerProfileByUserId(userId) {
  const { rows } = await pool.query(
    `SELECT * FROM lawyer_profiles WHERE user_id = $1 LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

router.get("/my", async (req, res, next) => {
  try {
    if (req.user.role !== "victim" && req.user.role !== "lawyer") {
      return res.status(403).json({ error: "Forbidden" });
    }

    let whereSql = "";
    let params = [];

    if (req.user.role === "victim") {
      const vp = await getVictimProfileByUserId(req.user.userId);
      if (!vp) return res.status(404).json({ error: "Victim profile not found" });
      whereSql = `e.victim_id = $1`;
      params = [vp.id];
    } else {
      const lp = await getLawyerProfileByUserId(req.user.userId);
      if (!lp) return res.status(404).json({ error: "Lawyer profile not found" });
      whereSql = `e.lawyer_id = $1`;
      params = [lp.id];
    }

    const sql = `
      SELECT e.*
      FROM engagements e
      WHERE ${whereSql}
      ORDER BY e.started_at DESC
    `;
    const { rows } = await pool.query(sql, params);
    return res.json({ data: rows });
  } catch (err) {
    return next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const sql = `
      SELECT
        e.*,
        c.title AS case_title,
        c.description AS case_description,
        c.legal_domain AS case_legal_domain,
        c.urgency_level AS case_urgency_level,
        c.city AS case_city,
        c.province AS case_province,
        c.status AS case_status,
        vp.full_name AS victim_full_name,
        vp.city AS victim_city,
        vp.province AS victim_province,
        vp.preferred_language AS victim_preferred_language,
        lp.full_name AS lawyer_full_name,
        lp.bar_council_no AS lawyer_bar_council_no,
        lp.specializations AS lawyer_specializations,
        lp.years_experience AS lawyer_years_experience,
        lp.avg_rating AS lawyer_avg_rating,
        lp.is_verified AS lawyer_is_verified,
        lp.city AS lawyer_city,
        lp.province AS lawyer_province,
        lp.availability_status AS lawyer_availability_status,
        p.proposed_fee AS proposal_fee,
        p.estimated_timeline AS proposal_timeline,
        p.cover_note AS proposal_cover_note
      FROM engagements e
      JOIN cases c ON c.id = e.case_id
      JOIN victim_profiles vp ON vp.id = e.victim_id
      JOIN lawyer_profiles lp ON lp.id = e.lawyer_id
      JOIN proposals p ON p.id = e.proposal_id
      WHERE e.id = $1
      LIMIT 1
    `;
    const result = await pool.query(sql, [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Engagement not found" });

    const row = result.rows[0];

    // Ownership check for victim/lawyer; admins can view
    if (req.user.role !== "admin") {
      if (req.user.role === "victim") {
        const vp = await getVictimProfileByUserId(req.user.userId);
        if (!vp || vp.id !== row.victim_id) return res.status(403).json({ error: "Forbidden" });
      } else if (req.user.role === "lawyer") {
        const lp = await getLawyerProfileByUserId(req.user.userId);
        if (!lp || lp.id !== row.lawyer_id) return res.status(403).json({ error: "Forbidden" });
      } else {
        return res.status(403).json({ error: "Forbidden" });
      }
    }

    return res.json({ data: row });
  } catch (err) {
    return next(err);
  }
});

router.put("/:id/close", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};

    if (!["completed", "terminated"].includes(String(status || ""))) {
      return res.status(400).json({ error: "status must be completed or terminated" });
    }
    if (req.user.role !== "victim" && req.user.role !== "lawyer") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const engagementSql = `
      SELECT
        e.*,
        vp.user_id AS victim_user_id,
        lp.user_id AS lawyer_user_id,
        c.title AS case_title
      FROM engagements e
      JOIN victim_profiles vp ON vp.id = e.victim_id
      JOIN lawyer_profiles lp ON lp.id = e.lawyer_id
      JOIN cases c ON c.id = e.case_id
      WHERE e.id = $1
      LIMIT 1
    `;
    const engagementRes = await pool.query(engagementSql, [id]);
    if (engagementRes.rows.length === 0) return res.status(404).json({ error: "Engagement not found" });
    const e = engagementRes.rows[0];

    if (req.user.role === "victim") {
      if (e.victim_user_id !== req.user.userId) return res.status(403).json({ error: "Forbidden" });
    } else {
      if (e.lawyer_user_id !== req.user.userId) return res.status(403).json({ error: "Forbidden" });
    }

    if (e.status !== "active") {
      return res.status(400).json({ error: "Engagement is not active" });
    }

    const updateSql = `
      UPDATE engagements
      SET status = $1, closed_at = NOW(), closed_by = $2
      WHERE id = $3
      RETURNING *
    `;
    const updated = await pool.query(updateSql, [status, req.user.userId, id]);

    const message = `Engagement closed (${status}) for case: ${e.case_title}`;
    await Promise.all([
      createNotification(pool, e.victim_user_id, "case_closed", "Case closed", message, e.case_id, "cases"),
      createNotification(pool, e.lawyer_user_id, "case_closed", "Case closed", message, e.case_id, "cases"),
    ]);

    return res.json({ data: updated.rows[0] });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;

