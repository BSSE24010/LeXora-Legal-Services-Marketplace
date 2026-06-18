const express = require("express");

const pool = require("../db");
const auth = require("../middleware/auth");
const { requireRole } = require("../middleware/role");
const { createNotification } = require("../utils/notifications");

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

async function getVictimProfileByUserId(userId) {
  const { rows } = await pool.query(
    `SELECT * FROM victim_profiles WHERE user_id = $1 LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

async function getEngagementForUser(engagementId, userId) {
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
  const e = rows[0] || null;
  if (!e) return null;
  const isParticipant = e.victim_user_id === userId || e.lawyer_user_id === userId;
  return isParticipant ? e : null;
}

router.post("/", requireRole("victim"), async (req, res, next) => {
  try {
    const { engagement_id, amount, payment_method, transaction_ref, file_url } = req.body || {};
    if (!engagement_id || amount === undefined || !payment_method) {
      return res.status(400).json({ error: "engagement_id, amount, payment_method are required" });
    }
    if (Number(amount) <= 0) return res.status(400).json({ error: "amount must be > 0" });
    if (!["easypaisa", "jazzcash", "card", "bank_transfer", "other"].includes(String(payment_method))) {
      return res.status(400).json({ error: "Invalid payment_method" });
    }

    const vp = await getVictimProfileByUserId(req.user.userId);
    if (!vp) return res.status(404).json({ error: "Victim profile not found" });

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
    const engagementRes = await pool.query(engagementSql, [engagement_id]);
    if (engagementRes.rows.length === 0) return res.status(404).json({ error: "Engagement not found" });
    const e = engagementRes.rows[0];
    if (e.victim_user_id !== req.user.userId) return res.status(403).json({ error: "Forbidden" });

    const sql = `
      INSERT INTO payments (
        engagement_id, payer_id, payee_id, amount, payment_method,
        payment_status, escrow_status, transaction_ref, file_url, paid_at
      )
      VALUES ($1,$2,$3,$4,$5,'held_in_escrow','held_in_escrow',$6,$7,NOW())
      RETURNING *
    `;
    const { rows } = await pool.query(sql, [
      engagement_id,
      req.user.userId,
      e.lawyer_user_id,
      amount,
      payment_method,
      transaction_ref ?? null,
      file_url ?? null,
    ]);
    const payment = rows[0];

    await createNotification(
      pool,
      e.lawyer_user_id,
      "payment_received",
      "Payment received",
      `A payment was created for engagement on case: ${e.case_title}`,
      payment.id,
      "payments"
    );

    return res.status(201).json({ data: payment });
  } catch (err) {
    return next(err);
  }
});

router.get("/engagement/:engagementId", async (req, res, next) => {
  try {
    const { engagementId } = req.params;
    const e = await getEngagementForUser(engagementId, req.user.userId);
    if (!e) return res.status(404).json({ error: "Engagement not found" });

    const { rows } = await pool.query(
      `SELECT * FROM payments WHERE engagement_id = $1 ORDER BY created_at DESC`,
      [engagementId]
    );
    return res.json({ data: rows });
  } catch (err) {
    return next(err);
  }
});

router.put("/:id/release", requireRole("victim"), async (req, res, next) => {
  try {
    const { id } = req.params;

    const paySql = `
      SELECT p.*, e.id AS engagement_id, vp.user_id AS victim_user_id
      FROM payments p
      JOIN engagements e ON e.id = p.engagement_id
      JOIN victim_profiles vp ON vp.id = e.victim_id
      WHERE p.id = $1
      LIMIT 1
    `;
    const payRes = await pool.query(paySql, [id]);
    if (payRes.rows.length === 0) return res.status(404).json({ error: "Payment not found" });
    const p = payRes.rows[0];

    if (p.victim_user_id !== req.user.userId) return res.status(403).json({ error: "Forbidden" });

    const { rows } = await pool.query(
      `UPDATE payments
       SET escrow_status = 'released', payment_status = 'released'
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    return res.json({ data: rows[0] });
  } catch (err) {
    return next(err);
  }
});

router.put("/:id/refund", requireRole("admin"), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { refund_amount, refund_status } = req.body || {};

    if (refund_amount === undefined || refund_status === undefined) {
      return res.status(400).json({ error: "refund_amount and refund_status are required" });
    }
    if (!["none", "partial", "full", "pending"].includes(String(refund_status))) {
      return res.status(400).json({ error: "Invalid refund_status" });
    }
    if (Number(refund_amount) < 0) return res.status(400).json({ error: "refund_amount must be >= 0" });

    const { rows } = await pool.query(
      `UPDATE payments
       SET refund_amount = $1, refund_status = $2, payment_status = 'refunded', escrow_status = 'refunded'
       WHERE id = $3
       RETURNING *`,
      [refund_amount, refund_status, id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Payment not found" });

    await logAdminAction(
      req.user.userId,
      "payment_refund",
      "payments",
      id,
      `Payment refunded (${refund_status})`,
      `refund_amount=${refund_amount}`
    );

    return res.json({ data: rows[0] });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;

