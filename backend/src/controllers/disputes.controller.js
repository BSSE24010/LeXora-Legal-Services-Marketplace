const { getSupabaseAdmin } = require("../db/supabase");
const { ok, fail } = require("../utils/response");

exports.createDispute = async (req, res) => {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { engagement_id, reason } = req.body || {};
    if (!engagement_id || !reason) return fail(res, "engagement_id and reason are required", 400);

    const { data: eng, error: eErr } = await supabaseAdmin
      .from("engagements")
      .select("id,lawyer_id,cases(victim_id)")
      .eq("id", engagement_id)
      .single();
    if (eErr) return fail(res, eErr.message, 404);

    // must be participant
    let allowed = false;
    if (req.user.role === "lawyer") {
      const { data: lp } = await supabaseAdmin
        .from("lawyer_profiles")
        .select("id")
        .eq("user_id", req.user.id)
        .maybeSingle();
      allowed = lp?.id && eng.lawyer_id === lp.id;
    } else if (req.user.role === "victim") {
      const { data: vp } = await supabaseAdmin
        .from("victim_profiles")
        .select("id")
        .eq("user_id", req.user.id)
        .maybeSingle();
      allowed = vp?.id && eng.cases?.victim_id === vp.id;
    } else if (req.user.role === "admin") {
      allowed = true;
    }
    if (!allowed) return fail(res, "Forbidden", 403);

    // 7 din ki deadline
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 7);

    const { data, error } = await supabaseAdmin
      .from("disputes")
      .insert({
        engagement_id,
        raised_by: req.user.id,
        reason,
        status: "open",
        resolution_deadline: deadline.toISOString(),
      })
      .select("*")
      .single();
    if (error) return fail(res, error.message, 400);

    return ok(res, data, 201);
  } catch (e) {
    return fail(res, e.message || "Failed to raise dispute", 500);
  }
};

exports.myDisputes = async (req, res) => {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    let q = supabaseAdmin.from("disputes").select("*");
    if (req.user.role !== "admin") q = q.eq("raised_by", req.user.id);
    const { data, error } = await q.order("created_at", { ascending: false });
    if (error) return fail(res, error.message, 400);
    return ok(res, data);
  } catch (e) {
    return fail(res, e.message || "Failed to fetch disputes", 500);
  }
};

exports.resolveDispute = async (req, res) => {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const id = req.params.id;
   // const { status, resolution_note } = req.body || {};
    const { status, admin_notes } = req.body || {};
    if (!status) return fail(res, "status is required", 400);
    if (!["resolved", "dismissed"].includes(status)) {
      return fail(res, "status must be resolved or dismissed", 400);
    }

    const { data, error } = await supabaseAdmin
      .from("disputes")
      .update({
        status,
        admin_notes: admin_notes ?? null,
        resolved_by: req.user.id,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();
    if (error) return fail(res, error.message, 400);

    return ok(res, data);
  } catch (e) {
    return fail(res, e.message || "Failed to resolve dispute", 500);
  }
};