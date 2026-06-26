import sharp from "sharp";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildDocumentIdentity, type BrandAsset, type DocumentSettingsRow, type ProfileIdentityRow } from "@/lib/document-identity";

async function downloadAsset(
  supabase: SupabaseClient,
  bucket?: string | null,
  path?: string | null,
  mimeType?: string | null,
  name?: string | null,
): Promise<BrandAsset | null> {
  if (!bucket || !path || !mimeType) return null;
  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error || !data) return null;
  return { data: new Uint8Array(await data.arrayBuffer()), mimeType, name };
}

export async function loadDocumentIdentity(input: {
  supabase: SupabaseClient;
  organizationId: string;
  organizationName: string;
  userId: string;
}) {
  const [{ data: settings }, { data: profile }] = await Promise.all([
    input.supabase.from("organization_document_settings").select("*").eq("organization_id", input.organizationId).maybeSingle(),
    input.supabase.from("profiles").select("full_name,professional_title,council,council_number,phone").eq("id", input.userId).maybeSingle(),
  ]);
  const row = settings as DocumentSettingsRow | null;
  const [logo, signature] = await Promise.all([
    downloadAsset(input.supabase, row?.logo_bucket, row?.logo_path, row?.logo_mime_type, row?.logo_name),
    downloadAsset(input.supabase, row?.signature_bucket, row?.signature_path, row?.signature_mime_type, row?.signature_name),
  ]);
  return buildDocumentIdentity({
    organizationName: input.organizationName,
    settings: row,
    profile: profile as ProfileIdentityRow | null,
    logo,
    signature,
  });
}

export async function loadExportAsset(input: {
  supabase: SupabaseClient;
  bucket?: string | null;
  path?: string | null;
  mimeType?: string | null;
  name?: string | null;
}) {
  return downloadAsset(input.supabase, input.bucket, input.path, input.mimeType, input.name);
}

export async function loadOptimizedExportImage(input: {
  supabase: SupabaseClient;
  bucket?: string | null;
  path?: string | null;
  mimeType?: string | null;
  name?: string | null;
}) {
  const original = await downloadAsset(input.supabase, input.bucket, input.path, input.mimeType, input.name);
  if (!original || !original.mimeType.startsWith("image/")) return null;
  try {
    const pipeline = sharp(original.data).rotate().resize({ width: 1800, height: 1800, fit: "inside", withoutEnlargement: true });
    if (original.mimeType === "image/png") {
      const data = await pipeline.png({ compressionLevel: 9, adaptiveFiltering: true }).toBuffer();
      return { data: new Uint8Array(data), mimeType: "image/png", name: original.name };
    }
    const data = await pipeline.jpeg({ quality: 84, mozjpeg: true }).toBuffer();
    return { data: new Uint8Array(data), mimeType: "image/jpeg", name: original.name };
  } catch {
    return original.mimeType === "image/jpeg" || original.mimeType === "image/png" ? original : null;
  }
}
