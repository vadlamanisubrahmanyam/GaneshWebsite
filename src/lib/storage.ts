import { createClient } from "@supabase/supabase-js";

// Server-only client — uses the SERVICE ROLE key, which bypasses row-level
// security. Never import this file into a client component, and never
// expose SUPABASE_SERVICE_ROLE_KEY with a NEXT_PUBLIC_ prefix.
function getAdminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set — file uploads are not configured yet.");
  }
  return createClient(url, key);
}

export const PORTFOLIO_BUCKET = "portfolio";

const MAX_PDF_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB

export async function uploadPdf(file: File, path: string): Promise<string> {
  if (file.type !== "application/pdf") {
    throw new Error("Only PDF files are accepted for this upload.");
  }
  if (file.size > MAX_PDF_BYTES) {
    throw new Error("PDF is too large (max 10MB).");
  }
  return uploadToBucket(file, path);
}

export async function uploadJpeg(file: File, path: string): Promise<string> {
  if (file.type !== "image/jpeg") {
    throw new Error("Only JPEG images are accepted for this upload.");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Image is too large (max 5MB).");
  }
  return uploadToBucket(file, path);
}

async function uploadToBucket(file: File, path: string): Promise<string> {
  const supabase = getAdminClient();
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error } = await supabase.storage
    .from(PORTFOLIO_BUCKET)
    .upload(path, buffer, { contentType: file.type, upsert: true });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data } = supabase.storage.from(PORTFOLIO_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteFromBucket(path: string) {
  const supabase = getAdminClient();
  await supabase.storage.from(PORTFOLIO_BUCKET).remove([path]);
}
