const { createClient } = require("@supabase/supabase-js");

function missingEnvError() {
  const missing = [];
  if (!process.env.SUPABASE_URL) missing.push("SUPABASE_URL");
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  const msg = `Supabase is not configured. Missing env var(s): ${missing.join(
    ", "
  )}. Create backend/.env (copy from .env.example).`;
  const err = new Error(msg);
  err.code = "SUPABASE_ENV_MISSING";
  return err;
}

let _supabaseAdmin = null;
let _supabaseAnon = null;

function getSupabaseAdmin() {
  if (_supabaseAdmin) return _supabaseAdmin;
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) throw missingEnvError();
  _supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _supabaseAdmin;
}

function getSupabaseAnon() {
  if (_supabaseAnon) return _supabaseAnon;
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) return null;
  _supabaseAnon = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _supabaseAnon;
}

module.exports = { getSupabaseAdmin, getSupabaseAnon };

