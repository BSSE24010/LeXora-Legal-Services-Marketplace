const { getSupabaseAdmin } = require("../db/supabase");
const { ok, fail } = require("../utils/response");
const { uploadToSupabaseStorage } = require("../middlewares/upload.middleware");

exports.listVerified = async (req, res) => {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { specialization, city, rating_min, fee_min, fee_max } = req.query || {};

    let q = supabaseAdmin.from("lawyer_profiles").select("*").eq("is_verified", true);
    if (city) q = q.ilike("city", `%${city}%`);
    if (rating_min) q = q.gte("avg_rating", Number(rating_min));
    if (fee_min) q = q.gte("fee_min", Number(fee_min));
    if (fee_max) q = q.lte("fee_max", Number(fee_max));
    if (specialization) q = q.contains("specializations", [specialization]);

    const { data, error } = await q.order("avg_rating", { ascending: false });
    if (error) return fail(res, error.message, 400);
    return ok(res, data);
  } catch (e) {
    return fail(res, e.message || "Failed to list lawyers", 500);
  }
};

exports.getById = async (req, res) => {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from("lawyer_profiles")
      .select("*")
      .eq("id", req.params.id)
      .single();
    if (error) return fail(res, error.message, 404);
    return ok(res, data);
  } catch (e) {
    return fail(res, e.message || "Failed to get lawyer", 500);
  }
};

exports.updateMe = async (req, res) => {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const allowed = [
      "full_name",
      "bio",
      "specializations",
      "years_experience",
      "bar_council_no",
      "city",
      "province",
      "fee_min",
      "fee_max",
      "contact_number",
      "availability_status",
    ];
    const payload = {};
    for (const k of allowed) if (k in (req.body || {})) payload[k] = req.body[k];

    const { data, error } = await supabaseAdmin
      .from("lawyer_profiles")
      .update(payload)
      .eq("user_id", req.user.id)
      .select("*")
      .single();
    if (error) return fail(res, error.message, 400);
    return ok(res, data);
  } catch (e) {
    return fail(res, e.message || "Failed to update lawyer profile", 500);
  }
};

exports.myProposals = async (req, res) => {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { data: lawyer, error: lpErr } = await supabaseAdmin
      .from("lawyer_profiles")
      .select("id")
      .eq("user_id", req.user.id)
      .single();
    if (lpErr) return fail(res, lpErr.message, 500);

    const { data, error } = await supabaseAdmin
      .from("proposals")
      .select("*, cases(*)")
      .eq("lawyer_id", lawyer.id)
      .order("created_at", { ascending: false });
    if (error) return fail(res, error.message, 400);
    return ok(res, data);
  } catch (e) {
    return fail(res, e.message || "Failed to fetch proposals", 500);
  }
};

exports.uploadCredential = async (req, res) => {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { document_type } = req.body || {};
    if (!document_type) return fail(res, "document_type is required", 400);
    if (!req.file) return fail(res, "file is required (multipart field: file)", 400);

    const { data: lawyer, error: lpErr } = await supabaseAdmin
      .from("lawyer_profiles")
      .select("id")
      .eq("user_id", req.user.id)
      .single();
    if (lpErr) return fail(res, lpErr.message, 500);

    const uploaded = await uploadToSupabaseStorage({
      buffer: req.file.buffer,
      mimetype: req.file.mimetype,
      originalname: req.file.originalname,
      folder: `credentials/${lawyer.id}`,
    });

    const { data, error } = await supabaseAdmin
      .from("lawyer_credentials")
      .insert({
        lawyer_id: lawyer.id,
        document_type,
        file_url: uploaded.publicUrl,
        file_size_bytes: req.file.size,
        verification_status: "pending",
      })
      .select("*")
      .single();
    if (error) return fail(res, error.message, 400);

    return ok(res, data, 201);
  } catch (e) {
    return fail(res, e.message || "Failed to upload credential", 500);
  }
};

exports.myCredentials = async (req, res) => {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { data: lawyer, error: lpErr } = await supabaseAdmin
      .from("lawyer_profiles")
      .select("id")
      .eq("user_id", req.user.id)
      .single();
    if (lpErr) return fail(res, lpErr.message, 500);

    const { data, error } = await supabaseAdmin
      .from("lawyer_credentials")
      .select("*")
      .eq("lawyer_id", lawyer.id)
      .order("submitted_at", { ascending: false });
    if (error) return fail(res, error.message, 400);
    return ok(res, data);
  } catch (e) {
    return fail(res, e.message || "Failed to fetch credentials", 500);
  }
};


