const express = require("express");

const pool = require("../db");
const auth = require("../middleware/auth");
const { requireRole } = require("../middleware/role");

const router = express.Router();

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

router.post("/", auth, requireRole("victim"), async (req, res, next) => {
  try {
    const victimProfile = await getVictimProfileByUserId(req.user.userId);
    if (!victimProfile) return res.status(404).json({ error: "Victim profile not found" });

    const {
      title,
      description,
      legal_domain,
      urgency_level,
      city,
      province,
      budget_min,
      budget_max,
      expires_at,
    } = req.body || {};

    if (!title || !description || !legal_domain) {
      return res.status(400).json({ error: "title, description, and legal_domain are required" });
    }
    if (urgency_level && !["low", "medium", "high", "critical"].includes(String(urgency_level))) {
      return res.status(400).json({ error: "Invalid urgency_level" });
    }
    if (budget_min !== undefined && Number(budget_min) < 0) {
      return res.status(400).json({ error: "budget_min must be >= 0" });
    }
    if (budget_max !== undefined && budget_min !== undefined && Number(budget_max) < Number(budget_min)) {
      return res.status(400).json({ error: "budget_max must be >= budget_min" });
    }

    const sql = `
      INSERT INTO cases (
        victim_id, title, description, legal_domain, urgency_level,
        city, province, budget_min, budget_max, status, expires_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'open',$10)
      RETURNING *
    `;
    const { rows } = await pool.query(sql, [
      victimProfile.id,
      String(title),
      String(description),
      String(legal_domain),
      urgency_level ? String(urgency_level) : "medium",
      city ?? null,
      province ?? null,
      budget_min ?? null,
      budget_max ?? null,
      expires_at ?? null,
    ]);

    return res.status(201).json({ data: rows[0] });
  } catch (err) {
    return next(err);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const { legal_domain, city, urgency_level, budget_min, budget_max } = req.query || {};
    const { page, limit, offset } = parsePagination(req.query || {});

    const where = ["c.status = 'open'"];
    const params = [];

    if (legal_domain) {
      params.push(String(legal_domain));
      where.push(`c.legal_domain = $${params.length}`);
    }
    if (city) {
      params.push(String(city));
      where.push(`c.city = $${params.length}`);
    }
    if (urgency_level) {
      if (!["low", "medium", "high", "critical"].includes(String(urgency_level))) {
        return res.status(400).json({ error: "Invalid urgency_level" });
      }
      params.push(String(urgency_level));
      where.push(`c.urgency_level = $${params.length}`);
    }
    if (budget_min !== undefined) {
      const v = Number(budget_min);
      if (Number.isNaN(v) || v < 0) return res.status(400).json({ error: "budget_min must be >= 0" });
      params.push(v);
      where.push(`(c.budget_max IS NULL OR c.budget_max >= $${params.length})`);
    }
    if (budget_max !== undefined) {
      const v = Number(budget_max);
      if (Number.isNaN(v) || v < 0) return res.status(400).json({ error: "budget_max must be >= 0" });
      params.push(v);
      where.push(`(c.budget_min IS NULL OR c.budget_min <= $${params.length})`);
    }

    const whereSql = `WHERE ${where.join(" AND ")}`;

    const countSql = `SELECT COUNT(*)::int AS total FROM cases c ${whereSql}`;
    const count = await pool.query(countSql, params);
    const total = count.rows[0]?.total || 0;

    params.push(limit);
    params.push(offset);

    const listSql = `
      SELECT *
      FROM cases c
      ${whereSql}
      ORDER BY c.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;
    const { rows } = await pool.query(listSql, params);
    return res.json({ data: rows, total, page, limit });
  } catch (err) {
    return next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    await client.query("BEGIN");
    const { rows } = await client.query(`SELECT * FROM cases WHERE id = $1 LIMIT 1`, [id]);
    if (rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Case not found" });
    }
    await client.query(`UPDATE cases SET view_count = view_count + 1 WHERE id = $1`, [id]);
    await client.query("COMMIT");
    return res.json({ data: rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    return next(err);
  } finally {
    client.release();
  }
});

router.put("/:id", auth, requireRole("victim"), async (req, res, next) => {
  try {
    const victimProfile = await getVictimProfileByUserId(req.user.userId);
    if (!victimProfile) return res.status(404).json({ error: "Victim profile not found" });

    const { id } = req.params;
    const { title, description, urgency_level, budget_min, budget_max, expires_at } = req.body || {};

    if (urgency_level && !["low", "medium", "high", "critical"].includes(String(urgency_level))) {
      return res.status(400).json({ error: "Invalid urgency_level" });
    }
    if (budget_min !== undefined && Number(budget_min) < 0) {
      return res.status(400).json({ error: "budget_min must be >= 0" });
    }
    if (budget_max !== undefined && budget_min !== undefined && Number(budget_max) < Number(budget_min)) {
      return res.status(400).json({ error: "budget_max must be >= budget_min" });
    }

    const sql = `
      UPDATE cases
      SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        urgency_level = COALESCE($3, urgency_level),
        budget_min = COALESCE($4, budget_min),
        budget_max = COALESCE($5, budget_max),
        expires_at = COALESCE($6, expires_at)
      WHERE id = $7 AND victim_id = $8
      RETURNING *
    `;
    const { rows } = await pool.query(sql, [
      title ?? null,
      description ?? null,
      urgency_level ?? null,
      budget_min ?? null,
      budget_max ?? null,
      expires_at ?? null,
      id,
      victimProfile.id,
    ]);
    if (rows.length === 0) return res.status(404).json({ error: "Case not found" });
    return res.json({ data: rows[0] });
  } catch (err) {
    return next(err);
  }
});

router.delete("/:id", auth, requireRole("victim"), async (req, res, next) => {
  try {
    const victimProfile = await getVictimProfileByUserId(req.user.userId);
    if (!victimProfile) return res.status(404).json({ error: "Victim profile not found" });

    const { id } = req.params;
    const { rows } = await pool.query(
      `UPDATE cases SET status = 'cancelled' WHERE id = $1 AND victim_id = $2 RETURNING *`,
      [id, victimProfile.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Case not found" });
    return res.json({ data: rows[0] });
  } catch (err) {
    return next(err);
  }
});

router.put("/:id/expire", auth, async (req, res, next) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { id } = req.params;
    const sql = `
      UPDATE cases
      SET status = 'expired'
      WHERE id = $1
        AND expires_at IS NOT NULL
        AND expires_at < NOW()
        AND status != 'expired'
      RETURNING *
    `;
    const { rows } = await pool.query(sql, [id]);
    if (rows.length === 0) return res.status(404).json({ error: "Case not found or not eligible to expire" });
    return res.json({ data: rows[0] });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;

