const { getSupabaseAdmin } = require("../db/supabase");
const { ok, fail } = require("../utils/response");

exports.getMe = async (req, res) => {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from("notifications")
      .select("*")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false });
    if (error) return fail(res, error.message, 400);
    return ok(res, data);
  } catch (e) {
    return fail(res, e.message || "Failed to fetch notifications", 500);
  }
};

exports.markRead = async (req, res) => {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const id = req.params.id;
    const { data, error } = await supabaseAdmin
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id)
      .eq("user_id", req.user.id)
      .select("*")
      .single();
    if (error) return fail(res, error.message, 400);
    return ok(res, data);
  } catch (e) {
    return fail(res, e.message || "Failed to mark read", 500);
  }
};

