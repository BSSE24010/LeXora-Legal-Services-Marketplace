const { getSupabaseAdmin } = require("../db/supabase");
const { ok, fail } = require("../utils/response");

exports.listUsers = async (req, res) => {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { role, status, q } = req.query || {};
    let query = supabaseAdmin.from("users").select("*");
    if (role) query = query.eq("role", role);
    if (status) query = query.eq("account_status", status);
    if (q) query = query.ilike("email", `%${q}%`);

    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) return fail(res, error.message, 400);
    return ok(res, data);
  } catch (e) {
    return fail(res, e.message || "Failed to list users", 500);
  }
};

exports.setUserStatus = async (req, res) => {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const id = req.params.id;
    const { account_status } = req.body || {};
    if (!account_status) return fail(res, "account_status is required", 400);
    if (!["pending", "active", "suspended"].includes(account_status)) {
      return fail(res, "Invalid account_status", 400);
    }

    const { data, error } = await supabaseAdmin
      .from("users")
      .update({ account_status })
      .eq("id", id)
      .select("*")
      .single();
    if (error) return fail(res, error.message, 400);

    await supabaseAdmin.from("admin_logs").insert({
      admin_id: req.user.id,
      action_type: "update_user_status",
      description: `Set account_status to ${account_status}`,
    });

    return ok(res, data);
  } catch (e) {
    return fail(res, e.message || "Failed to update user status", 500);
  }
};

exports.pendingCredentials = async (req, res) => {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from("lawyer_credentials")
      .select("*, lawyer_profiles(*)")
      .eq("verification_status", "pending")
      .order("submitted_at", { ascending: false });
    if (error) return fail(res, error.message, 400);
    return ok(res, data);
  } catch (e) {
    return fail(res, e.message || "Failed to fetch pending credentials", 500);
  }
};

exports.verifyCredential = async (req, res) => {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const id = req.params.id;
    const { verification_status } = req.body || {};
    if (!verification_status) return fail(res, "verification_status is required", 400);
    if (!["approved", "rejected"].includes(verification_status)) {
      return fail(res, "verification_status must be approved or rejected", 400);
    }

    const { data: cred, error: cErr } = await supabaseAdmin
      .from("lawyer_credentials")
      .update({ verification_status, verified_by: req.user.id })
      .eq("id", id)
      .select("*")
      .single();
    if (cErr) return fail(res, cErr.message, 400);

    if (verification_status === "approved") {
      await supabaseAdmin
        .from("lawyer_profiles")
        .update({ is_verified: true })
        .eq("id", cred.lawyer_id);

      const { data: lp } = await supabaseAdmin
        .from("lawyer_profiles")
        .select("user_id")
        .eq("id", cred.lawyer_id)
        .single();

      if (lp?.user_id) {
        await supabaseAdmin
          .from("users")
          .update({ account_status: "active" })
          .eq("id", lp.user_id);
      }
    }

    await supabaseAdmin.from("admin_logs").insert({
      admin_id: req.user.id,
      action_type: "verify_credential",
      description: `Credential ${id} -> ${verification_status}`,
    });

    return ok(res, cred);
  } catch (e) {
    return fail(res, e.message || "Failed to verify credential", 500);
  }
};

// Disputes list — payment info bhi saath aati hai (engagement ke through)
exports.listDisputes = async (req, res) => {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    const { data: disputes, error: dErr } = await supabaseAdmin
      .from("disputes")
      .select("*")
      .order("created_at", { ascending: false });
    if (dErr) return fail(res, dErr.message, 400);

    // Har dispute ke liye payment fetch karo (engagement_id se)
    const enriched = await Promise.all(
      disputes.map(async (dispute) => {
        const { data: payment } = await supabaseAdmin
          .from("payments")
          .select("id, amount, escrow_status, payment_status")
          .eq("engagement_id", dispute.engagement_id)
          .maybeSingle();
        return { ...dispute, payment: payment || null };
      })
    );

    return ok(res, enriched);
  } catch (e) {
    return fail(res, e.message || "Failed to list disputes", 500);
  }
};

exports.analytics = async (req, res) => {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const [
      { count: usersCount },
      { count: casesCount },
      { data: payments, error: pErr }
    ] = await Promise.all([
      supabaseAdmin.from("users").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("cases").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("payments").select("amount, payment_status"),
    ]);
    if (pErr) return fail(res, pErr.message, 400);

    const revenueReleased = (payments || [])
      .filter((p) => p.payment_status === "released")
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    return ok(res, {
      total_users: usersCount || 0,
      total_cases: casesCount || 0,
      total_revenue_released: revenueReleased,
    });
  } catch (e) {
    return fail(res, e.message || "Failed to fetch analytics", 500);
  }
};

exports.resolveDispute = async (req, res) => {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const id = req.params.id;
    const { status, admin_notes, lawyer_amount } = req.body || {};

    if (!status) return fail(res, "status is required", 400);
    if (!["resolved", "dismissed"].includes(status)) {
      return fail(res, "status must be resolved or dismissed", 400);
    }

    // Dispute fetch karo — engagement_id lene ke liye
    const { data: dispute, error: dErr } = await supabaseAdmin
      .from("disputes")
      .select("engagement_id")
      .eq("id", id)
      .single();
    if (dErr) return fail(res, dErr.message, 404);

    // Payment fetch karo us engagement ki
    const { data: payment } = await supabaseAdmin
      .from("payments")
      .select("*")
      .eq("engagement_id", dispute.engagement_id)
      .maybeSingle();

    if (status === "resolved" && payment) {
      // Poora payment lawyer ko release karo
      await supabaseAdmin
        .from("payments")
        .update({
          payment_status: "released",
          escrow_status: "released",
          paid_at: new Date().toISOString(),
        })
        .eq("id", payment.id);

      // Lawyer notify karo
      await supabaseAdmin.from("notifications").insert({
        user_id: payment.payee_id,
        type: "payment_received",
        title: "Payment Released!",
        body: `Dispute resolved in your favor. Rs. ${Number(payment.amount).toLocaleString()} released to you.`,
        reference_id: payment.id,
        reference_type: "payment",
      });

      // Victim notify karo
      await supabaseAdmin.from("notifications").insert({
        user_id: payment.payer_id,
        type: "case_closed",
        title: "Dispute Resolved",
        body: `Admin resolved the dispute in lawyer's favor. Rs. ${Number(payment.amount).toLocaleString()} released to lawyer.`,
        reference_id: payment.id,
        reference_type: "payment",
      });
    }

    if (status === "dismissed" && payment) {
      const lawyerAmt = Number(lawyer_amount || 0);
      const victimRefund = Number(payment.amount) - lawyerAmt;

      await supabaseAdmin
        .from("payments")
        .update({
          payment_status: "refunded",
          escrow_status: "refunded",
          refund_amount: victimRefund,
          refund_status: victimRefund > 0 ? "partial" : "none",
          paid_at: new Date().toISOString(),
        })
        .eq("id", payment.id);

      // Lawyer notify karo
      await supabaseAdmin.from("notifications").insert({
        user_id: payment.payee_id,
        type: "payment_received",
        title: "Partial Payment",
        body: `Dispute dismissed. You receive Rs. ${lawyerAmt.toLocaleString()} out of Rs. ${Number(payment.amount).toLocaleString()}.`,
        reference_id: payment.id,
        reference_type: "payment",
      });

      // Victim notify karo
      await supabaseAdmin.from("notifications").insert({
        user_id: payment.payer_id,
        type: "payment_received",
        title: "Partial Refund",
        body: `Dispute dismissed. You receive refund of Rs. ${victimRefund.toLocaleString()}.`,
        reference_id: payment.id,
        reference_type: "payment",
      });
    }

    // Dispute update karo
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

    // Admin log
    await supabaseAdmin.from("admin_logs").insert({
      admin_id: req.user.id,
      action_type: "resolve_dispute",
      description: `Dispute ${id} -> ${status}`,
    });

    return ok(res, data);
  } catch (e) {
    return fail(res, e.message || "Failed to resolve dispute", 500);
  }
};