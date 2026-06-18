const { getSupabaseAdmin } = require("../db/supabase");
const { ok, fail } = require("../utils/response");
const { uploadToSupabaseStorage } = require("../middlewares/upload.middleware");

async function canAccessEngagement(user, engagementId) {
  const supabaseAdmin = getSupabaseAdmin();
  if (user.role === "admin") return true;
  const { data, error } = await supabaseAdmin
    .from("engagements")
    .select("id,lawyer_id,cases(victim_id)")
    .eq("id", engagementId)
    .single();
  if (error) return false;

  if (user.role === "lawyer") {
    const { data: lp } = await supabaseAdmin.from("lawyer_profiles").select("id").eq("user_id", user.id).maybeSingle();
    return lp?.id && data.lawyer_id === lp.id;
  }
  if (user.role === "victim") {
    const { data: vp } = await supabaseAdmin.from("victim_profiles").select("id").eq("user_id", user.id).maybeSingle();
    return vp?.id && data.cases?.victim_id === vp.id;
  }
  return false;
}

exports.listForEngagement = async (req, res) => {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const engagementId = req.params.engagementId;
    const allowed = await canAccessEngagement(req.user, engagementId);
    if (!allowed) return fail(res, "Forbidden", 403);

    const { data, error } = await supabaseAdmin
      .from("messages")
      .select("*")
      .eq("engagement_id", engagementId)
      .order("sent_at", { ascending: true });
    if (error) return fail(res, error.message, 400);
    return ok(res, data);
  } catch (e) {
    return fail(res, e.message || "Failed to list messages", 500);
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const engagementId = req.params.engagementId;
    const { content } = req.body || {};
    if (!content) return fail(res, "content is required", 400);

    const allowed = await canAccessEngagement(req.user, engagementId);
    if (!allowed) return fail(res, "Forbidden", 403);

    const { data, error } = await supabaseAdmin
      .from("messages")
      .insert({
        engagement_id: engagementId,
        sender_id: req.user.id,
        content,
      })
      .select("*")
      .single();
    if (error) return fail(res, error.message, 400);

    // Notify the other party
    const { data: eng } = await supabaseAdmin
      .from("engagements")
      .select("id,lawyer_id,cases(victim_id)")
      .eq("id", engagementId)
      .single();

    if (eng) {
      if (req.user.role === "lawyer") {
        const { data: vp } = await supabaseAdmin
          .from("victim_profiles")
          .select("user_id")
          .eq("id", eng.cases.victim_id)
          .single();
        if (vp?.user_id) {
          await supabaseAdmin.from("notifications").insert({
            user_id: vp.user_id,
            type: "new_message",
            title: "New Message",
            body: "You have received a new message from your lawyer.",
            reference_id: data.id,
            reference_type: "message",
          });
        }
      } else if (req.user.role === "victim") {
        const { data: lp } = await supabaseAdmin
          .from("lawyer_profiles")
          .select("user_id")
          .eq("id", eng.lawyer_id)
          .single();
        if (lp?.user_id) {
          await supabaseAdmin.from("notifications").insert({
            user_id: lp.user_id,
            type: "new_message",
            title: "New Message",
            body: "You have received a new message from your client.",
            reference_id: data.id,
            reference_type: "message",
          });
        }
      }
    }

    return ok(res, data, 201);
  } catch (e) {
    return fail(res, e.message || "Failed to send message", 500);
  }
};

exports.uploadAttachment = async (req, res) => {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const engagementId = req.params.engagementId;
    if (!req.file) return fail(res, "file is required (multipart field: file)", 400);

    const allowed = await canAccessEngagement(req.user, engagementId);
    if (!allowed) return fail(res, "Forbidden", 403);

    const uploaded = await uploadToSupabaseStorage({
      buffer: req.file.buffer,
      mimetype: req.file.mimetype,
      originalname: req.file.originalname,
      folder: `attachments/${engagementId}`,
    });

    const { data: message, error: mErr } = await supabaseAdmin
      .from("messages")
      .insert({
        engagement_id: engagementId,
        sender_id: req.user.id,
        content: `📎 ${req.file.originalname}`,
      })
      .select("*")
      .single();
    if (mErr) return fail(res, mErr.message, 400);

    return ok(res, { message, file_url: uploaded.publicUrl }, 201);
  } catch (e) {
    return fail(res, e.message || "Failed to upload attachment", 500);
  }
};