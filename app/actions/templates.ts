"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentOrganization } from "@/lib/current-organization";
import { extractVariables } from "@/lib/document-options";
import { todayInBrasilia } from "@/lib/datetime";

function text(formData: FormData, key: string) { return String(formData.get(key) ?? "").trim(); }

export async function createTemplateAction(formData: FormData) {
  const organization = await requireCurrentOrganization("templates:write");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const title = text(formData, "title");
  const body = text(formData, "body");
  if (title.length < 3 || body.length < 20) redirect("/biblioteca/novo?error=Informe um título e um conteúdo válidos.");
  const { data, error } = await supabase.from("templates").insert({
    organization_id: organization.id,
    title,
    category: text(formData, "category") || "petition",
    document_type: text(formData, "document_type") || "personalizado",
    specialty: text(formData, "specialty") || "Geral",
    description: text(formData, "description"),
    content: { body },
    variables: extractVariables(body),
    legal_basis: text(formData, "legal_basis").split("\n").map((item) => item.trim()).filter(Boolean),
    is_octa_model: false,
    version: 1,
    status: "active",
    source_label: "Modelo particular",
    created_by: user.id,
  }).select("id").single();
  if (error || !data) redirect(`/biblioteca/novo?error=${encodeURIComponent(error?.message || "Não foi possível criar o modelo.")}`);
  revalidatePath("/biblioteca");
  redirect(`/biblioteca/${data.id}?success=Modelo criado com sucesso.`);
}

export async function duplicateTemplateAction(templateId: string) {
  const organization = await requireCurrentOrganization("templates:write");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: source } = await supabase.from("templates").select("*").eq("id", templateId).maybeSingle();
  if (!source) redirect("/biblioteca?error=Modelo não encontrado.");
  const { data, error } = await supabase.from("templates").insert({
    organization_id: organization.id,
    title: `${source.title} — cópia`,
    category: source.category,
    document_type: source.document_type,
    specialty: source.specialty,
    description: source.description,
    content: source.content,
    variables: source.variables,
    legal_basis: source.legal_basis,
    is_octa_model: false,
    version: 1,
    status: "active",
    source_label: "Cópia de modelo OCTA",
    duplicated_from: source.id,
    created_by: user.id,
  }).select("id").single();
  if (error || !data) redirect(`/biblioteca/${templateId}?error=${encodeURIComponent(error?.message || "Não foi possível duplicar.")}`);
  revalidatePath("/biblioteca");
  redirect(`/biblioteca/${data.id}/editar?success=Modelo duplicado. Agora você pode personalizá-lo.`);
}

export async function updateTemplateAction(templateId: string, formData: FormData) {
  const organization = await requireCurrentOrganization("templates:write");
  const supabase = await createClient();
  const { data: existing } = await supabase.from("templates").select("version,is_octa_model,organization_id").eq("id", templateId).maybeSingle();
  if (!existing || existing.is_octa_model || existing.organization_id !== organization.id) redirect(`/biblioteca/${templateId}?error=Este modelo não pode ser editado.`);
  const body = text(formData, "body");
  const { error } = await supabase.from("templates").update({
    title: text(formData, "title"),
    category: text(formData, "category") || "petition",
    document_type: text(formData, "document_type") || "personalizado",
    specialty: text(formData, "specialty") || "Geral",
    description: text(formData, "description"),
    content: { body },
    variables: extractVariables(body),
    legal_basis: text(formData, "legal_basis").split("\n").map((item) => item.trim()).filter(Boolean),
    version: Number(existing.version || 1) + 1,
    revision_date: todayInBrasilia(),
  }).eq("id", templateId).eq("organization_id", organization.id);
  if (error) redirect(`/biblioteca/${templateId}/editar?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/biblioteca"); revalidatePath(`/biblioteca/${templateId}`);
  redirect(`/biblioteca/${templateId}?success=Modelo atualizado e nova versão registrada.`);
}
