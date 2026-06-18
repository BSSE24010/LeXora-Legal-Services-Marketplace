const { getSupabaseAdmin } = require("../db/supabase");
const { ok, fail } = require("../utils/response");

function isValidRole(role) {
  return role === "victim" || role === "lawyer";
}

exports.register = async (req, res) => {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { email, password, role, full_name, cnic, bar_council_no, specializations, years_experience, fee_min, fee_max } = req.body || {};
    
    if (!email || !password || !role) return fail(res, "email, password, role are required", 400);
    if (!isValidRole(role)) return fail(res, "role must be victim or lawyer", 400);
    if (!full_name) return fail(res, "full_name is required", 400);
    if (role === "victim" && !cnic) return fail(res, "cnic is required for victims", 400);
    if (role === "lawyer" && !bar_council_no) return fail(res, "bar_council_no is required for lawyers", 400);

    const { data: signUpData, error: signUpErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (signUpErr) return fail(res, signUpErr.message, 400);

    const authUser = signUpData.user;

    const { error: userInsertErr } = await supabaseAdmin.from("users").insert({
      id: authUser.id,
      email,
      role,
      account_status: role === "victim" ? "active" : "pending",
    });
    if (userInsertErr) {
      await supabaseAdmin.auth.admin.deleteUser(authUser.id);
      return fail(res, userInsertErr.message, 500);
    }

    if (role === "victim") {
      const { error: vpErr } = await supabaseAdmin.from("victim_profiles").insert({
        user_id: authUser.id,
        full_name,
        cnic,
      });
      if (vpErr) {
        await supabaseAdmin.auth.admin.deleteUser(authUser.id);
        return fail(res, vpErr.message, 500);
      }
    } else {
      const { error: lpErr } = await supabaseAdmin.from("lawyer_profiles").insert({
        user_id: authUser.id,
        full_name,
        bar_council_no,
        specializations: specializations || [],
        years_experience: years_experience || 0,
        fee_min: fee_min || 0,
        fee_max: fee_max || 0,
        is_verified: false,
        availability_status: "available",
      });
      if (lpErr) {
        await supabaseAdmin.auth.admin.deleteUser(authUser.id);
        return fail(res, lpErr.message, 500);
      }
    }

    //return ok(res, { user_id: authUser.id, email, role }, 201);
    const { data: sessionData } = await supabaseAdmin.auth.signInWithPassword({ email, password });
   return ok(res, { 
   user_id: authUser.id, 
   email, 
   role,
   access_token: sessionData?.session?.access_token || null
   }, 201);
  } catch (e) {
    return fail(res, e.message || "Register failed", 500);
  }
};

exports.login = async (req, res) => {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { email, password } = req.body || {};
    if (!email || !password) return fail(res, "email and password are required", 400);

    const { data, error } = await supabaseAdmin.auth.signInWithPassword({ email, password });
    if (error) return fail(res, error.message, 401);

    const { data: userRow, error: userErr } = await supabaseAdmin
      .from("users")
      .select("id, email, role, account_status")
      .eq("id", data.user.id)
      .single();
    if (userErr) return fail(res, userErr.message, 500);

    if (userRow.account_status === "pending") {
      return fail(res, "Your account is pending admin approval", 403);
    }
    if (userRow.account_status === "suspended") {
      return fail(res, "Your account has been suspended", 403);
    }

    return ok(res, {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      user: userRow,
    });
  } catch (e) {
    return fail(res, e.message || "Login failed", 500);
  }
};

exports.logout = async (req, res) => {
  return ok(res, { message: "Logged out" });
};