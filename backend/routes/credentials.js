const express = require("express");

const pool = require("../db");
const auth = require("../middleware/auth");
const { requireRole } = require("../middleware/role");
const { createNotification } = require("../utils/notifications");

const router = express.Router();

router.use(auth);

async function getLawyerProfileByUserId(userId) {
  const { rows } = await pool.query(
    `SELECT * FROM lawyer_profiles WHERE user_id = $1 LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

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

router.post("/", requireRole("lawyer"), async (req, res, next) => {
  try {
    const { document_type, file_url, file_size_bytes } = req.body || {};
    if (!document_type || !file_url) {
      return res.status(400).json({ error: "document_type and file_url are required" });
    }
    if (file_size_bytes !== undefined && Number(file_size_bytes) <= 0) {
      return res.status(400).json({ error: "file_size_bytes must be > 0" });
    }

    const lawyerProfile = await getLawyerProfileByUserId(req.user.userId);
    if (!lawyerProfile) return res.status(404).json({ error: "Lawyer profile not found" });

    const sql = `
      INSERT INTO lawyer_credentials (lawyer_id, document_type, file_url, file_size_bytes, verification_status)
      VALUES ($1, $2, $3, $4, 'pending')
      RETURNING *
    `;
    const { rows } = await pool.query(sql, [
      lawyerProfile.id,
      String(document_type),
      String(file_url),
      file_size_bytes ?? null,
    ]);
    const credential = rows[0];

    // Notify all active admins
    const admins = await pool.query(
      `SELECT id FROM users WHERE role = 'admin' AND account_status = 'active' AND is_deleted = FALSE`
    );
    await Promise.all(
      admins.rows.map((a) =>
        createNotification(
          pool,
          a.id,
          "system",
          "New credential submitted",
          `A lawyer submitted ${credential.document_type} for verification.`,
          credential.id,
          "lawyer_credentials"
        )
      )
    );

    return res.status(201).json({ data: credential });
  } catch (err) {
    return next(err);
  }
});

router.get("/my", requireRole("lawyer"), async (req, res, next) => {
  try {
    const lawyerProfile = await getLawyerProfileByUserId(req.user.userId);
    if (!lawyerProfile) return res.status(404).json({ error: "Lawyer profile not found" });

    const { rows } = await pool.query(
      `SELECT * FROM lawyer_credentials WHERE lawyer_id = $1 ORDER BY submitted_at DESC`,
      [lawyerProfile.id]
    );
    return res.json({ data: rows });
  } catch (err) {
    return next(err);
  }
});

router.put("/:id/verify", requireRole("admin"), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { verification_status, rejection_reason } = req.body || {};

    if (!["approved", "rejected", "pending"].includes(String(verification_status || ""))) {
      return res.status(400).json({ error: "verification_status must be pending, approved, or rejected" });
    }
    if (verification_status === "rejected" && !rejection_reason) {
      return res.status(400).json({ error: "rejection_reason is required when rejecting" });
    }

    const before = await pool.query(
      `SELECT lc.*, lp.user_id AS lawyer_user_id
       FROM lawyer_credentials lc
       JOIN lawyer_profiles lp ON lp.id = lc.lawyer_id
       WHERE lc.id = $1
       LIMIT 1`,
      [id]
    );
    if (before.rows.length === 0) return res.status(404).json({ error: "Credential not found" });

    const sql = `
      UPDATE lawyer_credentials
      SET verification_status = $1, verified_by = $2, rejection_reason = $3
      WHERE id = $4
      RETURNING *
    `;
    const { rows } = await pool.query(sql, [
      verification_status,
      req.user.userId,
      rejection_reason || null,
      id,
    ]);
    const updated = rows[0];

    await logAdminAction(
      req.user.userId,
      "credential_verify",
      "lawyer_credentials",
      updated.id,
      `Credential marked as ${verification_status}`,
      rejection_reason || null
    );

    const lawyerUserId = before.rows[0].lawyer_user_id;
    if (verification_status === "approved") {
      await createNotification(
        pool,
        lawyerUserId,
        "credential_approved",
        "Credential approved",
        `Your credential (${before.rows[0].document_type}) has been approved.`,
        updated.id,
        "lawyer_credentials"
      );
    } else if (verification_status === "rejected") {
      await createNotification(
        pool,
        lawyerUserId,
        "credential_rejected",
        "Credential rejected",
        rejection_reason ? `Reason: ${rejection_reason}` : null,
        updated.id,
        "lawyer_credentials"
      );
    }

    return res.json({ data: updated });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;

