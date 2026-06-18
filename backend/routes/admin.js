const express = require("express");

const pool = require("../db");
const auth = require("../middleware/auth");
const { requireRole } = require("../middleware/role");

const router = express.Router();

router.use(auth);

function parsePagination(query) {
  const page = Math.max(parseInt(query.page || "1", 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit || "10", 10) || 10, 1), 50);
  const offset = (page - 1) * limit;
  return { page, limit, offset };
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

router.get("/users", requireRole("admin"), async (req, res, next) => {
  try {
    const { role, account_status } = req.query || {};
    const { page, limit, offset } = parsePagination(req.query || {});

    const where = [];
    const params = [];

    if (role) {
      if (!["victim", "lawyer", "admin"].includes(String(role))) {
        return res.status(400).json({ error: "Invalid role" });
      }
      params.push(String(role));
      where.push(`u.role = $${params.length}`);
    }
    if (account_status) {
      if (!["active", "suspended", "pending"].includes(String(account_status))) {
        return res.status(400).json({ error: "Invalid account_status" });
      }
      params.push(String(account_status));
      where.push(`u.account_status = $${params.length}`);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const countSql = `SELECT COUNT(*)::int AS total FROM users u ${whereSql}`;
    const countRes = await pool.query(countSql, params);
    const total = countRes.rows[0]?.total || 0;

    params.push(limit);
    params.push(offset);

    const sql = `
      SELECT
        u.id, u.email, u.role, u.contact_number, u.account_status,
        u.last_login_at, u.is_deleted, u.deleted_at, u.created_at, u.updated_at
      FROM users u
      ${whereSql}
      ORDER BY u.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;
    const { rows } = await pool.query(sql, params);
    return res.json({ data: rows, total, page, limit });
  } catch (err) {
    return next(err);
  }
});

router.put("/users/:id/status", requireRole("admin"), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { account_status } = req.body || {};
    if (!["active", "suspended", "pending"].includes(String(account_status || ""))) {
      return res.status(400).json({ error: "account_status must be active, suspended, or pending" });
    }

    const { rows } = await pool.query(
      `UPDATE users SET account_status = $1 WHERE id = $2 RETURNING id, email, role, contact_number, account_status, last_login_at, is_deleted, deleted_at, created_at, updated_at`,
      [account_status, id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "User not found" });

    await logAdminAction(
      req.user.userId,
      "user_status_change",
      "users",
      id,
      `User status set to ${account_status}`,
      null
    );

    return res.json({ data: rows[0] });
  } catch (err) {
    return next(err);
  }
});

router.get("/logs", requireRole("admin"), async (req, res, next) => {
  try {
    const { action_type, admin_id } = req.query || {};
    const { page, limit, offset } = parsePagination(req.query || {});

    const where = [];
    const params = [];

    if (action_type) {
      params.push(String(action_type));
      where.push(`al.action_type = $${params.length}`);
    }
    if (admin_id) {
      params.push(String(admin_id));
      where.push(`al.admin_id = $${params.length}`);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const countSql = `SELECT COUNT(*)::int AS total FROM admin_logs al ${whereSql}`;
    const countRes = await pool.query(countSql, params);
    const total = countRes.rows[0]?.total || 0;

    params.push(limit);
    params.push(offset);

    const sql = `
      SELECT *
      FROM admin_logs al
      ${whereSql}
      ORDER BY performed_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;
    const { rows } = await pool.query(sql, params);
    return res.json({ data: rows, total, page, limit });
  } catch (err) {
    return next(err);
  }
});

router.get("/analytics", requireRole("admin"), async (req, res, next) => {
  try {
    const usersByRole = await pool.query(
      `SELECT role, COUNT(*)::int AS count FROM users GROUP BY role`
    );
    const casesByStatus = await pool.query(
      `SELECT status, COUNT(*)::int AS count FROM cases GROUP BY status`
    );
    const engagementsByStatus = await pool.query(
      `SELECT status, COUNT(*)::int AS count FROM engagements GROUP BY status`
    );
    const paymentsSum = await pool.query(
      `SELECT COALESCE(SUM(amount), 0)::numeric AS total_amount FROM payments`
    );
    const disputesByStatus = await pool.query(
      `SELECT status, COUNT(*)::int AS count FROM disputes GROUP BY status`
    );

    return res.json({
      data: {
        users_by_role: usersByRole.rows,
        cases_by_status: casesByStatus.rows,
        engagements_by_status: engagementsByStatus.rows,
        total_payments_amount: paymentsSum.rows[0]?.total_amount ?? "0",
        disputes_by_status: disputesByStatus.rows,
      },
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;

