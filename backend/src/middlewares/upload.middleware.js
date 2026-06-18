const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const { getSupabaseAdmin } = require("../db/supabase");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

function extFromOriginalName(name) {
  const ext = path.extname(name || "").slice(1);
  return ext ? `.${ext}` : "";
}

async function uploadToSupabaseStorage({ buffer, mimetype, originalname, folder }) {
  const supabaseAdmin = getSupabaseAdmin();
  const bucket = process.env.SUPABASE_STORAGE_BUCKET;
  if (!bucket) throw new Error("Missing env var: SUPABASE_STORAGE_BUCKET");

  const fileName = `${crypto.randomUUID()}${extFromOriginalName(originalname)}`;
  const objectPath = `${folder}/${fileName}`;

  const { error: upErr } = await supabaseAdmin.storage
    .from(bucket)
    .upload(objectPath, buffer, { contentType: mimetype, upsert: false });
  if (upErr) throw upErr;

  const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(objectPath);
  return { objectPath, publicUrl: data.publicUrl };
}

module.exports = { upload, uploadToSupabaseStorage };

