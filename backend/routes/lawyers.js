const express = require("express");

const pool = require("../db");
const auth = require("../middleware/auth");
const { requireRole } = require("../middleware/role");

const router = express.Router();

async function getLawyerProfileByUserId(userId) {
  const { rows } = await pool.query(
    `SELECT * FROM lawyer_profiles WHERE user_id = $1 LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

function parsePagination(query) {
  const page = Math.max(parseInt(query.page || "1", 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit || "10", 10) || 10, 1), 50);
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

router.get("/me", auth, requireRole("lawyer"), async (req, res, next) => {
  try {
    const profile = await getLawyerProfileByUserId(req.user.userId);
    if (!profile) return res.status(404).json({ error: "Lawyer profile not found" });
    return res.json({ data: profile });
  } catch (err) {
    return next(err);
  }
});

router.put("/me", auth, requireRole("lawyer"), async (req, res, next) => {
  try {
    const existing = await getLawyerProfileByUserId(req.user.userId);
    if (!existing) return res.status(404).json({ error: "Lawyer profile not found" });

    const {
      bio,
      specializations,
      city,
      province,
      fee_min,
      fee_max,
      availability_status,
      contact_number,
      bar_council_no,
      years_experience,
      profile_photo_url,
      full_name,
    } = req.body || {};

    if (availability_status && !["available", "busy", "offline"].includes(availability_status)) {
      return res.status(400).json({ error: "Invalid availability_status" });
    }
    if (years_experience !== undefined && (Number.isNaN(Number(years_experience)) || Number(years_experience) < 0)) {
      return res.status(400).json({ error: "years_experience must be >= 0" });
    }
    if (fee_min !== undefined && (Number.isNaN(Number(fee_min)) || Number(fee_min) < 0)) {
      return res.status(400).json({ error: "fee_min must be >= 0" });
    }
    if (fee_max !== undefined && (Number.isNaN(Number(fee_max)) || Number(fee_max) < 0)) {
      return res.status(400).json({ error: "fee_max must be >= 0" });
    }

    const specsArray =
      Array.isArray(specializations) ? specializations.map((s) => String(s)) : null;

    const sql = `
      UPDATE lawyer_profiles
      SET
        bio = COALESCE($1, bio),
        specializations = COALESCE($2, specializations),
        city = COALESCE($3, city),
        province = COALESCE($4, province),
        fee_min = COALESCE($5, fee_min),
        fee_max = COALESCE($6, fee_max),
        availability_status = COALESCE($7, availability_status),
        contact_number = COALESCE($8, contact_number),
        bar_council_no = COALESCE($9, bar_council_no),
        years_experience = COALESCE($10, years_experience),
        profile_photo_url = COALESCE($11, profile_photo_url),
        full_name = COALESCE($12, full_name)
      WHERE user_id = $13
      RETURNING *
    `;
    const params = [
      bio ?? null,
      specsArray,
      city ?? null,
      province ?? null,
      fee_min ?? null,
      fee_max ?? null,
      availability_status ?? null,
      contact_number ?? null,
      bar_council_no ?? null,
      years_experience ?? null,
      profile_photo_url ?? null,
      full_name ?? null,
      req.user.userId,
    ];
    const { rows } = await pool.query(sql, params);
    return res.json({ data: rows[0] });
  } catch (err) {
    return next(err);
  }
});

router.get("/search", async (req, res, next) => {
  try {
    const {
      city,
      province,
      specialization,
      min_rating,
      max_fee,
      availability,
      verified_only,
      sort_by,
    } = req.query || {};

    const { page, limit, offset } = parsePagination(req.query || {});

    const where = [];
    const params = [];

    // Only verified lawyers in public search.
    where.push(`lp.is_verified = TRUE`);

    if (verified_only === "true") {
      where.push(`lp.is_verified = TRUE`);
    }
    if (city) {
      params.push(String(city));
      where.push(`lp.city = $${params.length}`);
    }
    if (province) {
      params.push(String(province));
      where.push(`lp.province = $${params.length}`);
    }
    if (availability) {
      if (!["available", "busy", "offline"].includes(String(availability))) {
        return res.status(400).json({ error: "Invalid availability" });
      }
      params.push(String(availability));
      where.push(`lp.availability_status = $${params.length}`);
    }
    if (specialization) {
      params.push(String(specialization));
      where.push(`$${params.length} = ANY(lp.specializations)`);
    }
    if (min_rating !== undefined) {
      const v = Number(min_rating);
      if (Number.isNaN(v) || v < 0 || v > 5) {
        return res.status(400).json({ error: "min_rating must be between 0 and 5" });
      }
      params.push(v);
      where.push(`lp.avg_rating >= $${params.length}`);
    }
    if (max_fee !== undefined) {
      const v = Number(max_fee);
      if (Number.isNaN(v) || v < 0) {
        return res.status(400).json({ error: "max_fee must be >= 0" });
      }
      params.push(v);
      where.push(`lp.fee_min <= $${params.length}`);
    }

    let orderBy = "lp.avg_rating DESC";
    if (sort_by) {
      const s = String(sort_by);
      if (s === "rating") orderBy = "lp.avg_rating DESC";
      else if (s === "fee_min") orderBy = "lp.fee_min ASC";
      else if (s === "years_experience") orderBy = "lp.years_experience DESC";
      else return res.status(400).json({ error: "Invalid sort_by" });
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const countSql = `SELECT COUNT(*)::int AS total FROM lawyer_profiles lp ${whereSql}`;
    const countResult = await pool.query(countSql, params);
    const total = countResult.rows[0]?.total || 0;

    params.push(limit);
    params.push(offset);

    const listSql = `
      SELECT
        lp.id,
        lp.full_name,
        lp.specializations,
        lp.years_experience,
        lp.bio,
        lp.city,
        lp.province,
        lp.fee_min,
        lp.fee_max,
        lp.avg_rating,
        lp.is_verified,
        lp.availability_status,
        lp.profile_photo_url,
        lp.contact_number,
        lp.created_at,
        lp.updated_at
      FROM lawyer_profiles lp
      ${whereSql}
      ORDER BY ${orderBy}
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;
    const { rows } = await pool.query(listSql, params);
    return res.json({ data: rows, total, page, limit });
  } catch (err) {
    return next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const sql = `
      SELECT
        lp.id,
        lp.full_name,
        lp.bar_council_no,
        lp.specializations,
        lp.years_experience,
        lp.bio,
        lp.city,
        lp.province,
        lp.fee_min,
        lp.fee_max,
        lp.avg_rating,
        lp.is_verified,
        lp.availability_status,
        lp.profile_photo_url,
        lp.contact_number,
        lp.created_at,
        lp.updated_at
      FROM lawyer_profiles lp
      WHERE lp.id = $1
      LIMIT 1
    `;
    const { rows } = await pool.query(sql, [id]);
    if (rows.length === 0) return res.status(404).json({ error: "Lawyer not found" });
    return res.json({ data: rows[0] });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;

