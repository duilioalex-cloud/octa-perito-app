"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/current-organization";

export async function createGeneratedDocumentAction(templateId: string, processId: string, formData: FormData) {
  const organization = await getCurrentOrganization();
  if (!organization) redirect("/onboarding");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const variablesRaw = String(formData.get("variables_json") ?? "{}");
  let variables: Record<string, string> = {};
  try { variables = JSON.parse(variablesRaw); } catch { variables = {}; }
  if (title.length < 3 || content.length < 20) redirect(`/documentos/novo?template=${templateId}&process=${processId}&error=Revise o título e o conteúdo.`);
  const { data, error } = await supabase.from("generated_documents").insert({
    organization_id: organization.id,
    process_id: processId,
    template_id: templateId,
    title,
    content,
    variables,
    status: "draft",
    version: 1,
    created_by: user.id,
  }).select("id").single();
  if (error || !data) redirect(`/documentos/novo?template=${templateId}&process=${processId}&error=${encodeURIComponent(error?.message || "Não foi possível salvar o documento.")}`);
  revalidatePath(`/processos/${processId}`);
  redirect(`/documentos/${data.id}?success=Documento gerado e salvo como rascunho.`);
}

export async function updateGeneratedDocumentAction(documentId: string, formData: FormData) {
  const organization = await getCurrentOrganization();
  if (!organization) redirect("/onboarding");
  const supabase = await createClient();
  const { data: existing } = await supabase.from("generated_documents").select("version,process_id").eq("id", documentId).eq("organization_id", organization.id).maybeSingle();
  if (!existing) redirect("/documentos?error=Documento não encontrado.");
  const content = String(formData.get("content") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const status = String(formData.get("status") ?? "draft");
  const { error } = await supabase.from("generated_documents").update({ title, content, status, version: Number(existing.version || 1) + 1 }).eq("id", documentId).eq("organization_id", organization.id);
  if (error) redirect(`/documentos/${documentId}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(`/documentos/${documentId}`); revalidatePath(`/processos/${existing.process_id}`);
  redirect(`/documentos/${documentId}?success=Documento atualizado. Uma nova versão foi registrada.`);
}
