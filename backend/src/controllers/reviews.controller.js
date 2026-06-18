const { getSupabaseAdmin } = require("../db/supabase");
const { ok, fail } = require("../utils/response");

exports.createReview = async (req, res) => {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { engagement_id, rating, comment } = req.body || {};
    if (!engagement_id || !rating) return fail(res, "engagement_id and rating are required", 400);

    const { data: eng, error: eErr } = await supabaseAdmin
      .from("engagements")
      .select("id,status,lawyer_id,cases(victim_id),lawyer_profiles(user_id)")
      .eq("id", engagement_id)
      .single();
    if (eErr) return fail(res, eErr.message, 404);
    if (eng.status !== "completed") return fail(res, "Engagement must be completed before review", 400);

    const { data: vp } = await supabaseAdmin.from("victim_profiles").select("id").eq("user_id", req.user.id).maybeSingle();
    if (!vp?.id || eng.cases?.victim_id !== vp.id) return fail(res, "Forbidden", 403);

    const reviewedId = eng.lawyer_profiles?.user_id;
    if (!reviewedId) return fail(res, "Could not resolve reviewed user", 400);

    const { data, error } = await supabaseAdmin
      .from("reviews")
      .insert({
        engagement_id,
        reviewer_id: req.user.id,
        reviewed_id: reviewedId,
        rating,
        comment: comment ?? null,
      })
      .select("*")
      .single();
    if (error) return fail(res, error.message, 400);

    // // recalc rating via RPC
    // const { error: rpcErr } = await supabaseAdmin.rpc("recalc_lawyer_rating", {
    //   p_lawyer_id: eng.lawyer_id,
    // });
    // if (rpcErr) return fail(res, rpcErr.message, 400);

    return ok(res, data, 201);
  } catch (e) {
    return fail(res, e.message || "Failed to submit review", 500);
  }
};

exports.listForLawyer = async (req, res) => {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const lawyerId = req.params.lawyerId;
    const { data: lp, error: lpErr } = await supabaseAdmin
      .from("lawyer_profiles")
      .select("user_id")
      .eq("id", lawyerId)
      .single();
    if (lpErr) return fail(res, lpErr.message, 404);

    const { data, error } = await supabaseAdmin
      .from("reviews")
      .select("*")
      .eq("reviewed_id", lp.user_id)
      .order("created_at", { ascending: false });
    if (error) return fail(res, error.message, 400);
    return ok(res, data);
  } catch (e) {
    return fail(res, e.message || "Failed to fetch reviews", 500);
  }
};

