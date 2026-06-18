const { getSupabaseAdmin } = require("../db/supabase");
const { ok, fail } = require("../utils/response");

async function victimOwnsEngagement(userId, engagementId) {
  const supabaseAdmin = getSupabaseAdmin();
  const { data: vp } = await supabaseAdmin
    .from("victim_profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!vp?.id) return false;
  const { data: eng } = await supabaseAdmin
    .from("engagements")
    .select("id,victim_id")
    .eq("id", engagementId)
    .single();
  return eng?.victim_id === vp.id;
}

exports.createPayment = async (req, res) => {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { engagement_id, amount, payment_method } = req.body || {};
    if (!engagement_id || !amount) return fail(res, "engagement_id and amount are required", 400);
    if (!payment_method) return fail(res, "payment_method is required", 400);

    const owns = await victimOwnsEngagement(req.user.id, engagement_id);
    if (!owns) return fail(res, "Forbidden", 403);

    // Proposal ki fee check karo
    const { data: engData, error: engErr } = await supabaseAdmin
      .from("engagements")
      .select("id, lawyer_id, proposal_id, proposals(proposed_fee), lawyer_profiles(user_id)")
      .eq("id", engagement_id)
      .single();
    if (engErr) return fail(res, engErr.message, 404);

    const proposedFee = Number(engData?.proposals?.proposed_fee || 0);
    if (Number(amount) !== proposedFee) {
      return fail(res, `Amount must be exactly Rs. ${proposedFee} as per the accepted proposal`, 400);
    }

    // Pehle check karo payment already exist nahi karti
    const { data: existing } = await supabaseAdmin
      .from("payments")
      .select("id")
      .eq("engagement_id", engagement_id)
      .maybeSingle();
    if (existing) return fail(res, "Payment already exists for this engagement", 400);

    const payeeId = engData.lawyer_profiles?.user_id;
    if (!payeeId) return fail(res, "Could not resolve lawyer user_id", 400);

    const { data, error } = await supabaseAdmin
      .from("payments")
      .insert({
        engagement_id,
        payer_id: req.user.id,
        payee_id: payeeId,
        amount,
        payment_method,
        payment_status: "pending",
        escrow_status: "held_in_escrow",
      })
      .select("*")
      .single();
    if (error) return fail(res, error.message, 400);

    // Lawyer ko notify karo
    await supabaseAdmin.from("notifications").insert({
      user_id: payeeId,
      type: "payment",
      title: "Payment Received in Escrow",
      body: `A payment of Rs. ${amount} has been held in escrow for your engagement.`,
      reference_id: data.id,
      reference_type: "payment",
    });

    return ok(res, data, 201);
  } catch (e) {
    return fail(res, e.message || "Failed to create payment", 500);
  }
};

exports.releasePayment = async (req, res) => {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const paymentId = req.params.id;

    const { data: payment, error: pErr } = await supabaseAdmin
      .from("payments")
      .select("*")
      .eq("id", paymentId)
      .single();
    if (pErr) return fail(res, pErr.message, 404);

    if (req.user.role === "victim" && payment.payer_id !== req.user.id) {
      return fail(res, "Forbidden", 403);
    }

    if (payment.escrow_status === "released") {
      return fail(res, "Payment already released", 400);
    }

    const { data, error } = await supabaseAdmin
      .from("payments")
      .update({
        payment_status: "released",
        escrow_status: "released",
        paid_at: new Date().toISOString(),
      })
      .eq("id", paymentId)
      .select("*")
      .single();
    if (error) return fail(res, error.message, 400);

    // Lawyer ko notify karo
    await supabaseAdmin.from("notifications").insert({
      user_id: payment.payee_id,
      type: "payment",
      title: "Payment Released!",
      body: `Rs. ${payment.amount} has been released to you from escrow.`,
      reference_id: data.id,
      reference_type: "payment",
    });

    return ok(res, data);
  } catch (e) {
    return fail(res, e.message || "Failed to release payment", 500);
  }
};

exports.myPayments = async (req, res) => {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    let q = supabaseAdmin.from("payments").select("*");
    if (req.user.role !== "admin") {
      q = q.or(`payer_id.eq.${req.user.id},payee_id.eq.${req.user.id}`);
    }
    const { data, error } = await q.order("created_at", { ascending: false });
    if (error) return fail(res, error.message, 400);
    return ok(res, data);
  } catch (e) {
    return fail(res, e.message || "Failed to fetch payments", 500);
  }
};