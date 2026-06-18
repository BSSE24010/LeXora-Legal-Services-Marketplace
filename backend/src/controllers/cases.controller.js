const { getSupabaseAdmin } = require("../db/supabase");
const { ok, fail } = require("../utils/response");

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

exports.createCase = async (req, res) => {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const victimId = await getVictimProfileId(req.user.id);
    const { title, description, legal_domain, urgency_level, city, province, budget_min, budget_max } = req.body || {};
    
    if (!title || !description || !legal_domain || !urgency_level) {
      return fail(res, "title, description, legal_domain, urgency_level are required", 400);
    }

    const { data, error } = await supabaseAdmin
      .from("cases")
      .insert({
        victim_id: victimId,
        title,
        description,
        legal_domain,
        urgency_level,
        city: city ?? null,
        province: province ?? null,
        budget_min: budget_min ?? null,
        budget_max: budget_max ?? null,
        status: "open",
      })
      .select("*")
      .single();
    if (error) return fail(res, error.message, 400);
    return ok(res, data, 201);
  } catch (e) {
    return fail(res, e.message || "Failed to create case", 500);
  }
};

exports.listCases = async (req, res) => {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const role = req.user.role;
    let q = supabaseAdmin.from("cases").select("*");

    if (role === "victim") {
      const victimId = await getVictimProfileId(req.user.id);
      q = q.eq("victim_id", victimId);
    }
    const all = String(req.query?.all || "") === "1";
    if ((role === "lawyer" || role === "admin") && !all) q = q.eq("status", "open");

    const { data, error } = await q.order("created_at", { ascending: false });
    if (error) return fail(res, error.message, 400);
    return ok(res, data);
  } catch (e) {
    return fail(res, e.message || "Failed to list cases", 500);
  }
};

exports.getCase = async (req, res) => {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const caseId = req.params.id;
    const { data, error } = await supabaseAdmin.from("cases").select("*").eq("id", caseId).single();
    if (error) return fail(res, error.message, 404);

    if (req.user.role === "victim") {
      const victimId = await getVictimProfileId(req.user.id);
      if (data.victim_id !== victimId) return fail(res, "Forbidden", 403);
    }
    return ok(res, data);
  } catch (e) {
    return fail(res, e.message || "Failed to get case", 500);
  }
};

exports.patchStatus = async (req, res) => {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const caseId = req.params.id;
    const { status } = req.body || {};
    if (!status) return fail(res, "status is required", 400);

    const victimId = await getVictimProfileId(req.user.id);
    const allowed = ["closed", "cancelled"];
    if (!allowed.includes(status)) return fail(res, "status must be closed or cancelled", 400);

    const { data, error } = await supabaseAdmin
      .from("cases")
      .update({ status })
      .eq("id", caseId)
      .eq("victim_id", victimId)
      .select("*")
      .single();
    if (error) return fail(res, error.message, 400);
    return ok(res, data);
  } catch (e) {
    return fail(res, e.message || "Failed to update status", 500);
  }
};