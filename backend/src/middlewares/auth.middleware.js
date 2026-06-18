const { getSupabaseAdmin } = require("../db/supabase");
const { fail } = require("../utils/response");

function getBearerToken(req) {
  const header = req.headers.authorization || "";
  const [type, token] = header.split(" ");
  if (type !== "Bearer" || !token) return null;
  return token;
}

async function requireAuth(req, res, next) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const token = getBearerToken(req);
    if (!token) return fail(res, "Missing Authorization Bearer token", 401);

    const { data: authData, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !authData?.user) return fail(res, "Invalid or expired token", 401);

    const authUser = authData.user;

    const { data: userRow, error: userErr } = await supabaseAdmin
      .from("users")
      .select("id,email,role,account_status,created_at")
      .eq("id", authUser.id)
      .maybeSingle();

    if (userErr) return fail(res, userErr.message, 500);
    if (!userRow) {
      return fail(
        res,
        "User record not found in database. Ensure registration created a users row.",
        403
      );
    }

    req.auth = { token, user: authUser };
    req.user = userRow;
    return next();
  } catch (e) {
    return fail(res, e.message || "Auth error", 500);
  }
}

module.exports = { requireAuth };

