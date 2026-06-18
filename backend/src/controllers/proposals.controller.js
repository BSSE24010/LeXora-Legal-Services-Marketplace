const { getSupabaseAdmin } = require("../db/supabase");
const { ok, fail } = require("../utils/response");

async function getLawyerProfileId(userId) {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("lawyer_profiles")
    .select("id,is_verified")
    .eq("user_id", userId)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

async function getVictimProfileId(userId) {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("victim_profiles")
    .select("id")
    .eq("user_id", userId)
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}

exports.createProposal = async (req, res) => {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { case_id, proposed_fee, estimated_timeline, cover_note } = req.body || {};
    
    if (!case_id || !proposed_fee || !estimated_timeline) {
      return fail(res, "case_id, proposed_fee, estimated_timeline are required", 400);
    }

    const lawyer = await getLawyerProfileId(req.user.id);
    if (!lawyer.is_verified) return fail(res, "Lawyer must be verified to submit proposals", 403);

    const { data: c, error: cErr } = await supabaseAdmin
      .from("cases")
      .select("id,victim_id,status,title")
      .eq("id", case_id)
      .single();
    if (cErr) return fail(res, cErr.message, 404);
    if (c.status !== "open") return fail(res, "Case is not open", 400);

    // Check if lawyer already submitted proposal for this case
    const { data: existing } = await supabaseAdmin
      .from("proposals")
      .select("id")
      .eq("case_id", case_id)
      .eq("lawyer_id", lawyer.id)
      .maybeSingle();
    if (existing) return fail(res, "You have already submitted a proposal for this case", 400);

    const { data, error } = await supabaseAdmin
      .from("proposals")
      .insert({
        case_id,
        lawyer_id: lawyer.id,
        proposed_fee,
        estimated_timeline,
        cover_note: cover_note ?? null,
        status: "pending",
      })
      .select("*")
      .single();
    if (error) return fail(res, error.message, 400);

    // Notify victim
    const { data: victimUser } = await supabaseAdmin
      .from("victim_profiles")
      .select("user_id")
      .eq("id", c.victim_id)
      .single();
    if (victimUser?.user_id) {
      await supabaseAdmin.from("notifications").insert({
        user_id: victimUser.user_id,
        type: "new_proposal",
        title: "New Proposal Received",
        body: `A lawyer has submitted a proposal for your case: ${c.title}`,
        reference_id: data.id,
        reference_type: "proposal",
      });
    }

    return ok(res, data, 201);
  } catch (e) {
    return fail(res, e.message || "Failed to submit proposal", 500);
  }
};

exports.getForCase = async (req, res) => {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const caseId = req.params.caseId;
    const victimId = await getVictimProfileId(req.user.id);

    const { data: c, error: cErr } = await supabaseAdmin
      .from("cases")
      .select("id,victim_id")
      .eq("id", caseId)
      .single();
    if (cErr) return fail(res, cErr.message, 404);
    if (c.victim_id !== victimId) return fail(res, "Forbidden", 403);

    const { data, error } = await supabaseAdmin
      .from("proposals")
      .select("*, lawyer_profiles(*)")
      .eq("case_id", caseId)
      .order("created_at", { ascending: false });
    if (error) return fail(res, error.message, 400);
    return ok(res, data);
  } catch (e) {
    return fail(res, e.message || "Failed to fetch proposals", 500);
  }
};

exports.acceptProposal = async (req, res) => {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const proposalId = req.params.id;
    const victimId = await getVictimProfileId(req.user.id);

    // Proposal fetch karo
    const { data: proposal, error: pErr } = await supabaseAdmin
      .from("proposals")
      .select("*, cases(*)")
      .eq("id", proposalId)
      .single();
    if (pErr) return fail(res, pErr.message, 404);
    if (proposal.cases?.victim_id !== victimId) return fail(res, "Forbidden", 403);
    if (proposal.status !== "pending") return fail(res, "Proposal is not pending", 400);

    // Proposal accept karo
    const { error: updateErr } = await supabaseAdmin
      .from("proposals")
      .update({ status: "accepted" })
      .eq("id", proposalId);
    if (updateErr) return fail(res, updateErr.message, 400);

    // Engagement banao
    const { data: engagement, error: engErr } = await supabaseAdmin
      .from("engagements")
      .insert({
        case_id: proposal.case_id,
        victim_id: victimId,
        lawyer_id: proposal.lawyer_id,
        proposal_id: proposalId,
        status: "active",
        started_at: new Date().toISOString(),
      })
      .select("*")
      .single();
    if (engErr) return fail(res, engErr.message, 400);

    // Case status update karo
    await supabaseAdmin
      .from("cases")
      .update({ status: "in_progress" })
      .eq("id", proposal.case_id);

    // Lawyer ko notify karo
    const { data: lawyerProfile } = await supabaseAdmin
      .from("lawyer_profiles")
      .select("user_id")
      .eq("id", proposal.lawyer_id)
      .single();
    if (lawyerProfile?.user_id) {
      await supabaseAdmin.from("notifications").insert({
        user_id: lawyerProfile.user_id,
        type: "proposal_accepted",
        title: "Proposal Accepted!",
        body: `Your proposal for case "${proposal.cases?.title}" has been accepted!`,
        reference_id: engagement.id,
        reference_type: "engagement",
      });
    }

    return ok(res, { proposal, engagement });
  } catch (e) {
    return fail(res, e.message || "Failed to accept proposal", 500);
  }
};

exports.declineProposal = async (req, res) => {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const proposalId = req.params.id;
    const victimId = await getVictimProfileId(req.user.id);

    const { data: p, error: pErr } = await supabaseAdmin
      .from("proposals")
      .select("id,case_id,status")
      .eq("id", proposalId)
      .single();
    if (pErr) return fail(res, pErr.message, 404);

    const { data: c, error: cErr } = await supabaseAdmin
      .from("cases")
      .select("victim_id")
      .eq("id", p.case_id)
      .single();
    if (cErr) return fail(res, cErr.message, 404);
    if (c.victim_id !== victimId) return fail(res, "Forbidden", 403);
    if (p.status !== "pending") return fail(res, "Proposal is not pending", 400);

    const { data, error } = await supabaseAdmin
      .from("proposals")
      .update({ status: "declined" })
      .eq("id", proposalId)
      .select("*")
      .single();
    if (error) return fail(res, error.message, 400);

    return ok(res, data);
  } catch (e) {
    return fail(res, e.message || "Failed to decline proposal", 500);
  }
};