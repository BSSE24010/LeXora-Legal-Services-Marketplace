const { getSupabaseAdmin } = require("../db/supabase");
const { ok, fail } = require("../utils/response");

async function myLawyerId(userId) {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin.from("lawyer_profiles").select("id").eq("user_id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  return data?.id || null;
}

async function myVictimId(userId) {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin.from("victim_profiles").select("id").eq("user_id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  return data?.id || null;
}

exports.getMyEngagements = async (req, res) => {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const role = req.user.role;
    let q = supabaseAdmin.from("engagements").select("*, cases(*), proposals(*)");

    if (role === "victim") {
      const vId = await myVictimId(req.user.id);
      q = q.eq("cases.victim_id", vId);
    } else if (role === "lawyer") {
      const lId = await myLawyerId(req.user.id);
      q = q.eq("lawyer_id", lId);
    }

    const { data, error } = await q.order("created_at", { ascending: false });
    if (error) return fail(res, error.message, 400);
    return ok(res, data);
  } catch (e) {
    return fail(res, e.message || "Failed to get engagements", 500);
  }
};

exports.getById = async (req, res) => {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const engagementId = req.params.id;
    const { data, error } = await supabaseAdmin
      .from("engagements")
      .select("*, cases(*), proposals(*)")
      .eq("id", engagementId)
      .single();
    if (error) return fail(res, error.message, 404);

    // basic access: victim of case or lawyer on engagement or admin
    if (req.user.role !== "admin") {
      if (req.user.role === "lawyer") {
        const lId = await myLawyerId(req.user.id);
        if (data.lawyer_id !== lId) return fail(res, "Forbidden", 403);
      }
      if (req.user.role === "victim") {
        const vId = await myVictimId(req.user.id);
        if (data.cases?.victim_id !== vId) return fail(res, "Forbidden", 403);
      }
    }

    return ok(res, data);
  } catch (e) {
    return fail(res, e.message || "Failed to get engagement", 500);
  }
};

exports.closeEngagement = async (req, res) => {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const engagementId = req.params.id;

    // atomic close + release payment via RPC (created in schema.sql)
    const { data, error } = await supabaseAdmin.rpc("close_engagement", {
      p_engagement_id: engagementId,
      p_user_id: req.user.id,
    });
    if (error) return fail(res, error.message, 400);
    return ok(res, data);
  } catch (e) {
    return fail(res, e.message || "Failed to close engagement", 500);
  }
};

exports.completeEngagement = async (req, res) => {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const engagementId = req.params.id;
    const lId = await myLawyerId(req.user.id);

    const { data: eng, error: eErr } = await supabaseAdmin
      .from("engagements")
      .select("*, cases(victim_id, title)")
      .eq("id", engagementId)
      .single();
    if (eErr) return fail(res, eErr.message, 404);
    if (eng.lawyer_id !== lId) return fail(res, "Forbidden", 403);
    if (eng.status !== "active") return fail(res, "Engagement is not active", 400);

    // Engagement complete karo
    const { data, error } = await supabaseAdmin
      .from("engagements")
      .update({ 
        status: "completed",
        closed_at: new Date().toISOString(),
        closed_by: req.user.id,
      })
      .eq("id", engagementId)
      .select("*")
      .single();
    if (error) return fail(res, error.message, 400);

    // Case status bhi update karo
    await supabaseAdmin
      .from("cases")
      .update({ status: "completed" })
      .eq("id", eng.case_id);

    // Victim ko notify karo
    const { data: vp } = await supabaseAdmin
      .from("victim_profiles")
      .select("user_id")
      .eq("id", eng.cases?.victim_id)
      .single();
    if (vp?.user_id) {
      await supabaseAdmin.from("notifications").insert({
        user_id: vp.user_id,
        type: "case_completed",
        title: "Lawyer marked case as complete!",
        body: `Your case "${eng.cases?.title}" has been marked complete. Please release payment or raise a dispute.`,
        reference_id: engagementId,
        reference_type: "engagement",
      });
    }

    return ok(res, data);
  } catch (e) {
    return fail(res, e.message || "Failed to complete engagement", 500);
  }
};

// exports.completeEngagement = async (req, res) => {
//   try {
//     const supabaseAdmin = getSupabaseAdmin();
//     const engagementId = req.params.id;
//     const lId = await myLawyerId(req.user.id);

//     const { data: eng, error: eErr } = await supabaseAdmin
//       .from("engagements")
//       .select("*, cases(victim_id)")
//       .eq("id", engagementId)
//       .single();
//     if (eErr) return fail(res, eErr.message, 404);
//     if (eng.lawyer_id !== lId) return fail(res, "Forbidden", 403);
//     if (eng.status !== "active") return fail(res, "Engagement is not active", 400);

//     const { data, error } = await supabaseAdmin
//       .from("engagements")
//       .update({ status: "completed", 
//         closed_at: new Date().toISOString(),
//         closed_by: req.user.id,
//       })

//       // Case status bhi update karo
// await supabaseAdmin
//   .from("cases")
//   .update({ status: "completed" })
//   .eq("id", eng.case_id);
//       .eq("id", engagementId)
//       .select("*")
//       .single();
//     if (error) return fail(res, error.message, 400);

//     // Victim ko notify karo
//     const { data: vp } = await supabaseAdmin
//       .from("victim_profiles")
//       .select("user_id")
//       .eq("id", eng.cases?.victim_id)
//       .single();
//     if (vp?.user_id) {
//       await supabaseAdmin.from("notifications").insert({
//         user_id: vp.user_id,
//         type: "case_completed",
//         title: "Lawyer marked case as complete!",
//         body: `Your case "${eng.cases?.title}" has been marked complete. Please release payment or raise a dispute.`,
//         reference_id: engagementId,
//         reference_type: "engagement",
//       });
//     }

//     return ok(res, data);
//   } catch (e) {
//     return fail(res, e.message || "Failed to complete engagement", 500);
//   }
// };

