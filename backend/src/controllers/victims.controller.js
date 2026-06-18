const { getSupabaseAdmin } = require("../db/supabase");
const { ok, fail } = require("../utils/response");

exports.getMe = async (req, res) => {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from("victim_profiles")
      .select("*")
      .eq("user_id", req.user.id)
      .single();
    if (error) return fail(res, error.message, 500);
    return ok(res, data);
  } catch (e) {
    return fail(res, e.message || "Failed to fetch profile", 500);
  }
};

exports.updateMe = async (req, res) => {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const allowed = ["full_name", "cnic", "contact_number", "location", "preferred_language"];
    const payload = {};
    for (const k of allowed) if (k in (req.body || {})) payload[k] = req.body[k];

    const { data, error } = await supabaseAdmin
      .from("victim_profiles")
      .update(payload)
      .eq("user_id", req.user.id)
      .select("*")
      .single();

    if (error) return fail(res, error.message, 400);
    return ok(res, data);
  } catch (e) {
    return fail(res, e.message || "Failed to update profile", 500);
  }
};

