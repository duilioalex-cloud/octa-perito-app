"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/current-organization";
import { safeFileName } from "@/lib/report-options";

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function optionalText(formData: FormData, name: string) {
  return text(formData, name) || null;
}

function checked(formData: FormData, name: string) {
  return formData.get(name) === "on";
}

function settingsPath(message: string, type: "success" | "error" = "success") {
  return `/configuracoes?${type}=${encodeURIComponent(message)}`;
}

const ALLOWED_BRAND_TYPES = new Set(["image/jpeg", "image/png"]);

async function uploadBrandFile(input: {
  file: File;
  kind: "logo" | "signature";
  organizationId: string;
  supabase: Awaited<ReturnType<typeof createClient>>;
}) {
  const { file, kind, organizationId, supabase } = input;
  if (!ALLOWED_BRAND_TYPES.has(file.type)) throw new Error("A logomarca e a assinatura devem estar em PNG ou JPG.");
  if (file.size > 5 * 1024 * 1024) throw new Error("O arquivo de identidade visual não pode exceder 5 MB.");
  const path = `${organizationId}/${kind}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
  const { error } = await supabase.storage.from("branding-files").upload(path, await file.arrayBuffer(), {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return { bucket: "branding-files", path, name: file.name, mimeType: file.type };
}

export async function updateDocumentIdentityAction(formData: FormData) {
  const organization = await getCurrentOrganization();
  if (!organization) redirect("/onboarding");
  if (!["owner", "admin"].includes(organization.role)) redirect(settingsPath("Somente proprietários e administradores podem alterar a identidade documental.", "error"));
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: current } = await supabase
    .from("organization_document_settings")
    .select("logo_bucket,logo_path,logo_name,logo_mime_type,signature_bucket,signature_path,signature_name,signature_mime_type")
    .eq("organization_id", organization.id)
    .maybeSingle();

  const logoFile = formData.get("logo_file");
  const signatureFile = formData.get("signature_file");
  let uploadedLogo: Awaited<ReturnType<typeof uploadBrandFile>> | null = null;
  let uploadedSignature: Awaited<ReturnType<typeof uploadBrandFile>> | null = null;

  try {
    if (logoFile instanceof File && logoFile.size > 0) uploadedLogo = await uploadBrandFile({ file: logoFile, kind: "logo", organizationId: organization.id, supabase });
    if (signatureFile instanceof File && signatureFile.size > 0) uploadedSignature = await uploadBrandFile({ file: signatureFile, kind: "signature", organizationId: organization.id, supabase });
  } catch (error) {
    if (uploadedLogo) await supabase.storage.from(uploadedLogo.bucket).remove([uploadedLogo.path]);
    if (uploadedSignature) await supabase.storage.from(uploadedSignature.bucket).remove([uploadedSignature.path]);
    redirect(settingsPath(error instanceof Error ? error.message : "Não foi possível enviar os arquivos.", "error"));
  }

  const primaryColor = text(formData, "primary_color").replace(/^#/, "").toUpperCase();
  const secondaryColor = text(formData, "secondary_color").replace(/^#/, "").toUpperCase();
  if (!/^[0-9A-F]{6}$/.test(primaryColor) || !/^[0-9A-F]{6}$/.test(secondaryColor)) {
    if (uploadedLogo) await supabase.storage.from(uploadedLogo.bucket).remove([uploadedLogo.path]);
    if (uploadedSignature) await supabase.storage.from(uploadedSignature.bucket).remove([uploadedSignature.path]);
    redirect(settingsPath("Informe cores válidas no formato hexadecimal.", "error"));
  }

  const payload = {
    organization_id: organization.id,
    office_name: optionalText(formData, "office_name"),
    professional_name: optionalText(formData, "professional_name"),
    professional_titles: optionalText(formData, "professional_titles"),
    council_registration: optionalText(formData, "council_registration"),
    contact_line: optionalText(formData, "contact_line"),
    city_state: optionalText(formData, "city_state"),
    header_text: optionalText(formData, "header_text"),
    footer_text: optionalText(formData, "footer_text"),
    primary_color: primaryColor,
    secondary_color: secondaryColor,
    show_cover: checked(formData, "show_cover"),
    show_table_of_contents: checked(formData, "show_table_of_contents"),
    show_page_numbers: checked(formData, "show_page_numbers"),
    include_logo: checked(formData, "include_logo"),
    include_signature: checked(formData, "include_signature"),
    logo_bucket: uploadedLogo?.bucket || current?.logo_bucket || null,
    logo_path: uploadedLogo?.path || current?.logo_path || null,
    logo_name: uploadedLogo?.name || current?.logo_name || null,
    logo_mime_type: uploadedLogo?.mimeType || current?.logo_mime_type || null,
    signature_bucket: uploadedSignature?.bucket || current?.signature_bucket || null,
    signature_path: uploadedSignature?.path || current?.signature_path || null,
    signature_name: uploadedSignature?.name || current?.signature_name || null,
    signature_mime_type: uploadedSignature?.mimeType || current?.signature_mime_type || null,
    updated_by: user.id,
  };

  const { error } = await supabase.from("organization_document_settings").upsert(payload, { onConflict: "organization_id" });
  if (error) {
    if (uploadedLogo) await supabase.storage.from(uploadedLogo.bucket).remove([uploadedLogo.path]);
    if (uploadedSignature) await supabase.storage.from(uploadedSignature.bucket).remove([uploadedSignature.path]);
    redirect(settingsPath(error.message, "error"));
  }

  if (uploadedLogo && current?.logo_bucket && current.logo_path) await supabase.storage.from(current.logo_bucket).remove([current.logo_path]);
  if (uploadedSignature && current?.signature_bucket && current.signature_path) await supabase.storage.from(current.signature_bucket).remove([current.signature_path]);

  await supabase.from("profiles").update({
    full_name: optionalText(formData, "professional_name"),
    professional_title: optionalText(formData, "professional_titles"),
  }).eq("id", user.id);

  revalidatePath("/configuracoes");
  redirect(settingsPath("Identidade profissional e padrões de exportação atualizados."));
}

export async function removeBrandAssetAction(kind: "logo" | "signature", _formData?: FormData) {
  void _formData;
  const organization = await getCurrentOrganization();
  if (!organization) redirect("/onboarding");
  if (!["owner", "admin"].includes(organization.role)) redirect(settingsPath("Somente proprietários e administradores podem remover arquivos de identidade.", "error"));
  const supabase = await createClient();
  const bucketColumn = kind === "logo" ? "logo_bucket" : "signature_bucket";
  const pathColumn = kind === "logo" ? "logo_path" : "signature_path";
  const { data: current } = await supabase.from("organization_document_settings").select(`${bucketColumn},${pathColumn}`).eq("organization_id", organization.id).maybeSingle();
  const row = current as Record<string, string | null> | null;
  if (row?.[bucketColumn] && row?.[pathColumn]) await supabase.storage.from(row[bucketColumn] as string).remove([row[pathColumn] as string]);
  const updates = kind === "logo"
    ? { logo_bucket: null, logo_path: null, logo_name: null, logo_mime_type: null }
    : { signature_bucket: null, signature_path: null, signature_name: null, signature_mime_type: null };
  const { error } = await supabase.from("organization_document_settings").update(updates).eq("organization_id", organization.id);
  if (error) redirect(settingsPath(error.message, "error"));
  revalidatePath("/configuracoes");
  redirect(settingsPath(kind === "logo" ? "Logomarca removida." : "Assinatura removida."));
}
