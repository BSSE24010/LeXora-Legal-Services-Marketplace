const express = require("express");

const pool = require("../db");
const auth = require("../middleware/auth");
const { requireRole } = require("../middleware/role");
const { createNotification } = require("../utils/notifications");

const router = express.Router();

router.use(auth);

function parsePagination(query) {
  const page = Math.max(parseInt(query.page || "1", 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit || "10", 10) || 10, 1), 50);
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

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

router.post("/", requireRole("lawyer"), async (req, res, next) => {
  try {
    const lawyerProfile = await getLawyerProfileByUserId(req.user.userId);
    if (!lawyerProfile) return res.status(404).json({ error: "Lawyer profile not found" });

    const { case_id, proposed_fee, estimated_timeline, cover_note, proposal_deadline } =
      req.body || {};

    if (!case_id || proposed_fee === undefined) {
      return res.status(400).json({ error: "case_id and proposed_fee are required" });
    }
    if (Number(proposed_fee) <= 0) return res.status(400).json({ error: "proposed_fee must be > 0" });

    const caseRes = await pool.query(`SELECT * FROM cases WHERE id = $1 LIMIT 1`, [case_id]);
    if (caseRes.rows.length === 0) return res.status(404).json({ error: "Case not found" });
    const c = caseRes.rows[0];
    if (c.status !== "open") return res.status(400).json({ error: "Case is not open" });

    const exists = await pool.query(
      `SELECT id FROM proposals WHERE case_id = $1 AND lawyer_id = $2 LIMIT 1`,
      [case_id, lawyerProfile.id]
    );
    if (exists.rows.length) return res.status(409).json({ error: "You already proposed on this case" });

    const sql = `
      INSERT INTO proposals (case_id, lawyer_id, proposed_fee, estimated_timeline, cover_note, proposal_deadline, status)
      VALUES ($1,$2,$3,$4,$5,$6,'pending')
      RETURNING *
    `;
    const { rows } = await pool.query(sql, [
      case_id,
      lawyerProfile.id,
      proposed_fee,
      estimated_timeline ?? null,
      cover_note ?? null,
      proposal_deadline ?? null,
    ]);
    const proposal = rows[0];

    // Notify victim (by victim user_id)
    const victimUser = await pool.query(
      `SELECT u.id AS user_id
       FROM victim_profiles vp
       JOIN users u ON u.id = vp.user_id
       WHERE vp.id = $1
       LIMIT 1`,
      [c.victim_id]
    );
    if (victimUser.rows.length) {
      await createNotification(
        pool,
        victimUser.rows[0].user_id,
        "new_proposal",
        "New proposal received",
        `A lawyer submitted a proposal on your case: ${c.title}`,
        proposal.id,
        "proposals"
      );
    }

    return res.status(201).json({ data: proposal });
  } catch (err) {
    return next(err);
  }
});

router.get("/case/:caseId", requireRole("victim"), async (req, res, next) => {
  try {
    const victimProfile = await getVictimProfileByUserId(req.user.userId);
    if (!victimProfile) return res.status(404).json({ error: "Victim profile not found" });

    const { caseId } = req.params;
    const owner = await pool.query(`SELECT id FROM cases WHERE id = $1 AND victim_id = $2 LIMIT 1`, [
      caseId,
      victimProfile.id,
    ]);
    if (owner.rows.length === 0) return res.status(404).json({ error: "Case not found" });

    const { page, limit, offset } = parsePagination(req.query || {});

    const count = await pool.query(
      `SELECT COUNT(*)::int AS total FROM proposals WHERE case_id = $1`,
      [caseId]
    );
    const total = count.rows[0]?.total || 0;

    const sql = `
      SELECT
        p.*,
        lp.full_name AS lawyer_name,
        lp.avg_rating AS lawyer_avg_rating,
        lp.is_verified AS lawyer_is_verified,
        lp.years_experience AS lawyer_years_experience,
        lp.city AS lawyer_city,
        lp.province AS lawyer_province
      FROM proposals p
      JOIN lawyer_profiles lp ON lp.id = p.lawyer_id
      WHERE p.case_id = $1
      ORDER BY p.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const { rows } = await pool.query(sql, [caseId, limit, offset]);
    return res.json({ data: rows, total, page, limit });
  } catch (err) {
    return next(err);
  }
});

router.get("/my", requireRole("lawyer"), async (req, res, next) => {
  try {
    const lawyerProfile = await getLawyerProfileByUserId(req.user.userId);
    if (!lawyerProfile) return res.status(404).json({ error: "Lawyer profile not found" });

    const { page, limit, offset } = parsePagination(req.query || {});

    const count = await pool.query(
      `SELECT COUNT(*)::int AS total FROM proposals WHERE lawyer_id = $1`,
      [lawyerProfile.id]
    );
    const total = count.rows[0]?.total || 0;

    const { rows } = await pool.query(
      `SELECT * FROM proposals WHERE lawyer_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [lawyerProfile.id, limit, offset]
    );
    return res.json({ data: rows, total, page, limit });
  } catch (err) {
    return next(err);
  }
});

router.put("/:id/accept", requireRole("victim"), async (req, res, next) => {
  const client = await pool.connect();
  try {
    const victimProfile = await getVictimProfileByUserId(req.user.userId);
    if (!victimProfile) return res.status(404).json({ error: "Victim profile not found" });

    const { id } = req.params;

    await client.query("BEGIN");

    const propSql = `
      SELECT
        p.*,
        c.id AS case_id,
        c.title AS case_title,
        c.victim_id AS case_victim_id,
        c.status AS case_status,
        lp.user_id AS lawyer_user_id
      FROM proposals p
      JOIN cases c ON c.id = p.case_id
      JOIN lawyer_profiles lp ON lp.id = p.lawyer_id
      WHERE p.id = $1
      FOR UPDATE
    `;
    const propRes = await client.query(propSql, [id]);
    if (propRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Proposal not found" });
    }
    const p = propRes.rows[0];

    if (p.case_victim_id !== victimProfile.id) {
      await client.query("ROLLBACK");
      return res.status(403).json({ error: "Forbidden" });
    }
    if (p.case_status !== "open") {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Case is not open" });
    }
    if (p.status !== "pending") {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Proposal is not pending" });
    }

    const accepted = await client.query(
      `UPDATE proposals SET status = 'accepted' WHERE id = $1 RETURNING *`,
      [id]
    );

    const engagementSql = `
      INSERT INTO engagements (case_id, victim_id, lawyer_id, proposal_id, status)
      VALUES ($1,$2,$3,$4,'active')
      RETURNING *
    `;
    const engagementRes = await client.query(engagementSql, [
      p.case_id,
      p.case_victim_id,
      p.lawyer_id,
      p.id,
    ]);

    await client.query(`UPDATE cases SET status = 'in_progress' WHERE id = $1`, [p.case_id]);

    const declinedRes = await client.query(
      `UPDATE proposals
       SET status = 'declined'
       WHERE case_id = $1 AND id != $2 AND status = 'pending'
       RETURNING id, lawyer_id`,
      [p.case_id, p.id]
    );

    await client.query("COMMIT");

    // Notifications
    await createNotification(
      pool,
      p.lawyer_user_id,
      "proposal_accepted",
      "Proposal accepted",
      `Your proposal was accepted for case: ${p.case_title}`,
      p.id,
      "proposals"
    );

    if (declinedRes.rows.length) {
      const lawyerUsers = await pool.query(
        `SELECT id, user_id FROM lawyer_profiles WHERE id = ANY($1::uuid[])`,
        [declinedRes.rows.map((r) => r.lawyer_id)]
      );
      await Promise.all(
        lawyerUsers.rows.map((lu) =>
          createNotification(
            pool,
            lu.user_id,
            "proposal_declined",
            "Proposal declined",
            `Your proposal was declined for case: ${p.case_title}`,
            p.case_id,
            "cases"
          )
        )
      );
    }

    return res.json({
      data: {
        proposal: accepted.rows[0],
        engagement: engagementRes.rows[0],
      },
    });
  } catch (err) {
    await client.query("ROLLBACK");
    return next(err);
  } finally {
    client.release();
  }
});

router.put("/:id/decline", requireRole("victim"), async (req, res, next) => {
  try {
    const victimProfile = await getVictimProfileByUserId(req.user.userId);
    if (!victimProfile) return res.status(404).json({ error: "Victim profile not found" });

    const { id } = req.params;

    const infoSql = `
      SELECT p.id, p.status, c.victim_id, c.title AS case_title, lp.user_id AS lawyer_user_id
      FROM proposals p
      JOIN cases c ON c.id = p.case_id
      JOIN lawyer_profiles lp ON lp.id = p.lawyer_id
      WHERE p.id = $1
      LIMIT 1
    `;
    const info = await pool.query(infoSql, [id]);
    if (info.rows.length === 0) return res.status(404).json({ error: "Proposal not found" });
    const p = info.rows[0];
    if (p.victim_id !== victimProfile.id) return res.status(403).json({ error: "Forbidden" });
    if (p.status !== "pending") return res.status(400).json({ error: "Proposal is not pending" });

    const { rows } = await pool.query(
      `UPDATE proposals SET status = 'declined' WHERE id = $1 RETURNING *`,
      [id]
    );

    await createNotification(
      pool,
      p.lawyer_user_id,
      "proposal_declined",
      "Proposal declined",
      `Your proposal was declined for case: ${p.case_title}`,
      id,
      "proposals"
    );

    return res.json({ data: rows[0] });
  } catch (err) {
    return next(err);
  }
});

router.put("/:id/withdraw", requireRole("lawyer"), async (req, res, next) => {
  try {
    const lawyerProfile = await getLawyerProfileByUserId(req.user.userId);
    if (!lawyerProfile) return res.status(404).json({ error: "Lawyer profile not found" });

    const { id } = req.params;
    const { rows } = await pool.query(
      `UPDATE proposals
       SET status = 'withdrawn', withdrawn_at = NOW()
       WHERE id = $1 AND lawyer_id = $2 AND status = 'pending'
       RETURNING *`,
      [id, lawyerProfile.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Proposal not found or not withdrawable" });
    return res.json({ data: rows[0] });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;

