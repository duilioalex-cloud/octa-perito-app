"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/current-organization";
import { safeFileName } from "@/lib/report-options";

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function nullableText(formData: FormData, name: string) {
  return text(formData, name) || null;
}

function integer(formData: FormData, name: string, fallback = 0) {
  const value = Number(text(formData, name));
  return Number.isFinite(value) ? Math.trunc(value) : fallback;
}

async function context() {
  const organization = await getCurrentOrganization();
  if (!organization) redirect("/onboarding");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { organization, supabase, user };
}

async function requireReport(reportId: string) {
  const { organization, supabase, user } = await context();
  const { data: report } = await supabase
    .from("expert_reports")
    .select("id,organization_id,process_id,report_type_id,status")
    .eq("id", reportId)
    .eq("organization_id", organization.id)
    .maybeSingle();
  if (!report) redirect("/laudos?error=Laudo não encontrado.");
  return { organization, supabase, user, report };
}

function reportPath(reportId: string, message?: string, type: "success" | "error" = "success") {
  const query = message ? `?${type}=${encodeURIComponent(message)}` : "";
  return `/laudos/${reportId}${query}`;
}

export async function createExpertReportAction(formData: FormData) {
  const { organization, supabase, user } = await context();
  const processId = text(formData, "process_id");
  const reportTypeId = text(formData, "report_type_id");
  const title = text(formData, "title");
  if (!processId || !reportTypeId || title.length < 3) {
    redirect(`/laudos/novo?error=${encodeURIComponent("Selecione o processo, o tipo de laudo e informe um título.")}`);
  }

  const { data, error } = await supabase
    .from("expert_reports")
    .insert({
      organization_id: organization.id,
      process_id: processId,
      report_type_id: reportTypeId,
      title,
      report_date: text(formData, "report_date") || null,
      notes: nullableText(formData, "notes"),
      status: "draft",
      variables: {},
      generation_settings: {},
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    redirect(`/laudos/novo?error=${encodeURIComponent(error?.message || "Não foi possível criar o laudo.")}`);
  }

  revalidatePath("/laudos");
  revalidatePath(`/processos/${processId}`);
  redirect(reportPath(data.id, "Laudo criado. Os capítulos do modelo foram carregados automaticamente."));
}

export async function updateExpertReportAction(reportId: string, formData: FormData) {
  const { supabase, report } = await requireReport(reportId);
  const title = text(formData, "title");
  const status = text(formData, "status") || "draft";
  if (title.length < 3) redirect(reportPath(reportId, "Informe um título válido.", "error"));

  const payload: Record<string, unknown> = {
    title,
    status,
    report_date: text(formData, "report_date") || null,
    notes: nullableText(formData, "notes"),
  };
  if (status === "final") payload.finalized_at = new Date().toISOString();
  if (status === "in_review") payload.reviewed_at = new Date().toISOString();

  const { error } = await supabase.from("expert_reports").update(payload).eq("id", reportId);
  if (error) redirect(reportPath(reportId, error.message, "error"));

  revalidatePath("/laudos");
  revalidatePath(`/processos/${report.process_id}`);
  revalidatePath(`/laudos/${reportId}`);
  redirect(reportPath(reportId, "Dados gerais do laudo atualizados."));
}

export async function updateReportSectionAction(reportId: string, sectionId: string, formData: FormData) {
  const { supabase } = await requireReport(reportId);
  const content = text(formData, "content");
  const title = text(formData, "title");
  const reviewStatus = text(formData, "review_status") || "draft";
  const isEnabled = formData.get("is_enabled") === "on";
  const { error } = await supabase
    .from("expert_report_sections")
    .update({ title, content, review_status: reviewStatus, is_enabled: isEnabled })
    .eq("id", sectionId)
    .eq("report_id", reportId);
  if (error) redirect(reportPath(reportId, error.message, "error") + `#section-${sectionId}`);
  revalidatePath(`/laudos/${reportId}`);
  redirect(reportPath(reportId, `Capítulo “${title}” salvo.`) + `#section-${sectionId}`);
}

export async function toggleReportSectionAction(reportId: string, sectionId: string, formData: FormData) {
  const { supabase } = await requireReport(reportId);
  const enabled = text(formData, "enabled") === "true";
  const { error } = await supabase
    .from("expert_report_sections")
    .update({ is_enabled: enabled })
    .eq("id", sectionId)
    .eq("report_id", reportId);
  if (error) redirect(reportPath(reportId, error.message, "error"));
  revalidatePath(`/laudos/${reportId}`);
}

export async function moveReportSectionAction(reportId: string, sectionId: string, formData: FormData) {
  const { supabase } = await requireReport(reportId);
  const direction = text(formData, "direction");
  const { data: sections } = await supabase
    .from("expert_report_sections")
    .select("id,sort_order")
    .eq("report_id", reportId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  const list = sections || [];
  const index = list.findIndex((item) => item.id === sectionId);
  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || targetIndex < 0 || targetIndex >= list.length) return;
  const current = list[index];
  const target = list[targetIndex];
  const firstOrder = current.sort_order;
  const secondOrder = target.sort_order;
  await supabase.from("expert_report_sections").update({ sort_order: secondOrder }).eq("id", current.id);
  await supabase.from("expert_report_sections").update({ sort_order: firstOrder }).eq("id", target.id);
  revalidatePath(`/laudos/${reportId}`);
}

export async function appendTechnicalBlockAction(reportId: string, sectionId: string, formData: FormData) {
  const { supabase } = await requireReport(reportId);
  const blockId = text(formData, "block_id");
  if (!blockId) redirect(reportPath(reportId, "Selecione um bloco técnico.", "error") + `#section-${sectionId}`);
  const [{ data: block }, { data: section }] = await Promise.all([
    supabase.from("technical_blocks").select("title,content").eq("id", blockId).maybeSingle(),
    supabase.from("expert_report_sections").select("content").eq("id", sectionId).eq("report_id", reportId).maybeSingle(),
  ]);
  if (!block || !section) redirect(reportPath(reportId, "Bloco ou capítulo não encontrado.", "error") + `#section-${sectionId}`);
  const combined = [section.content?.trim(), block.content?.trim()].filter(Boolean).join("\n\n");
  const { error } = await supabase
    .from("expert_report_sections")
    .update({ content: combined })
    .eq("id", sectionId)
    .eq("report_id", reportId);
  if (error) redirect(reportPath(reportId, error.message, "error") + `#section-${sectionId}`);
  revalidatePath(`/laudos/${reportId}`);
  redirect(reportPath(reportId, `Bloco “${block.title}” inserido no capítulo.`) + `#section-${sectionId}`);
}

export async function createQuestionAction(reportId: string, formData: FormData) {
  const { supabase, user } = await requireReport(reportId);
  const question = text(formData, "question");
  if (question.length < 3) redirect(reportPath(reportId, "Informe o texto do quesito.", "error") + "#quesitos");
  const { error } = await supabase.from("expert_report_questions").insert({
    report_id: reportId,
    origin: text(formData, "origin") || "other",
    origin_label: nullableText(formData, "origin_label"),
    question_number: nullableText(formData, "question_number"),
    question,
    answer: text(formData, "answer"),
    answer_status: text(formData, "answer_status") || "pending",
    sort_order: integer(formData, "sort_order", 0),
    notes: nullableText(formData, "notes"),
    created_by: user.id,
  });
  if (error) redirect(reportPath(reportId, error.message, "error") + "#quesitos");
  revalidatePath(`/laudos/${reportId}`);
  redirect(reportPath(reportId, "Quesito adicionado.") + "#quesitos");
}

export async function updateQuestionAction(reportId: string, questionId: string, formData: FormData) {
  const { supabase } = await requireReport(reportId);
  const { error } = await supabase.from("expert_report_questions").update({
    origin: text(formData, "origin") || "other",
    origin_label: nullableText(formData, "origin_label"),
    question_number: nullableText(formData, "question_number"),
    question: text(formData, "question"),
    answer: text(formData, "answer"),
    answer_status: text(formData, "answer_status") || "pending",
    sort_order: integer(formData, "sort_order", 0),
    notes: nullableText(formData, "notes"),
  }).eq("id", questionId).eq("report_id", reportId);
  if (error) redirect(reportPath(reportId, error.message, "error") + "#quesitos");
  revalidatePath(`/laudos/${reportId}`);
  redirect(reportPath(reportId, "Quesito atualizado.") + "#quesitos");
}

export async function deleteQuestionAction(reportId: string, questionId: string) {
  const { supabase } = await requireReport(reportId);
  await supabase.from("expert_report_questions").delete().eq("id", questionId).eq("report_id", reportId);
  revalidatePath(`/laudos/${reportId}`);
}

export async function createSourceAction(reportId: string, formData: FormData) {
  const { supabase, user } = await requireReport(reportId);
  const title = text(formData, "title");
  if (title.length < 2) redirect(reportPath(reportId, "Informe o título da fonte.", "error") + "#fontes");
  const { error } = await supabase.from("expert_report_sources").insert({
    report_id: reportId,
    source_type: text(formData, "source_type") || "case_document",
    title,
    reference_label: nullableText(formData, "reference_label"),
    description: nullableText(formData, "description"),
    source_date: text(formData, "source_date") || null,
    was_analyzed: formData.get("was_analyzed") === "on",
    sort_order: integer(formData, "sort_order", 0),
    created_by: user.id,
  });
  if (error) redirect(reportPath(reportId, error.message, "error") + "#fontes");
  revalidatePath(`/laudos/${reportId}`);
  redirect(reportPath(reportId, "Fonte registrada.") + "#fontes");
}

export async function deleteSourceAction(reportId: string, sourceId: string) {
  const { supabase } = await requireReport(reportId);
  await supabase.from("expert_report_sources").delete().eq("id", sourceId).eq("report_id", reportId);
  revalidatePath(`/laudos/${reportId}`);
}

export async function createEquipmentAction(reportId: string, formData: FormData) {
  const { supabase, user } = await requireReport(reportId);
  const name = text(formData, "name");
  if (name.length < 2) redirect(reportPath(reportId, "Informe o equipamento.", "error") + "#equipamentos");
  const { error } = await supabase.from("expert_report_equipment").insert({
    report_id: reportId,
    name,
    brand: nullableText(formData, "brand"),
    model: nullableText(formData, "model"),
    serial_number: nullableText(formData, "serial_number"),
    calibration_certificate: nullableText(formData, "calibration_certificate"),
    calibration_date: text(formData, "calibration_date") || null,
    calibration_due_date: text(formData, "calibration_due_date") || null,
    usage_description: nullableText(formData, "usage_description"),
    sort_order: integer(formData, "sort_order", 0),
    created_by: user.id,
  });
  if (error) redirect(reportPath(reportId, error.message, "error") + "#equipamentos");
  revalidatePath(`/laudos/${reportId}`);
  redirect(reportPath(reportId, "Equipamento registrado.") + "#equipamentos");
}

export async function deleteEquipmentAction(reportId: string, equipmentId: string) {
  const { supabase } = await requireReport(reportId);
  await supabase.from("expert_report_equipment").delete().eq("id", equipmentId).eq("report_id", reportId);
  revalidatePath(`/laudos/${reportId}`);
}

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

export async function uploadReportAttachmentAction(reportId: string, formData: FormData) {
  const { organization, supabase, user } = await requireReport(reportId);
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) redirect(reportPath(reportId, "Selecione um arquivo.", "error") + "#anexos");
  if (file.size > 10 * 1024 * 1024) redirect(reportPath(reportId, "O arquivo excede o limite de 10 MB.", "error") + "#anexos");
  if (!ALLOWED_MIME_TYPES.has(file.type)) redirect(reportPath(reportId, "Formato de arquivo não permitido.", "error") + "#anexos");

  const fileName = safeFileName(file.name);
  const storagePath = `${organization.id}/${reportId}/${crypto.randomUUID()}-${fileName}`;
  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from("report-files")
    .upload(storagePath, arrayBuffer, { contentType: file.type, upsert: false });
  if (uploadError) redirect(reportPath(reportId, uploadError.message, "error") + "#anexos");

  const { error: rowError } = await supabase.from("expert_report_attachments").insert({
    organization_id: organization.id,
    report_id: reportId,
    section_id: text(formData, "section_id") || null,
    file_type: text(formData, "file_type") || "other",
    storage_bucket: "report-files",
    storage_path: storagePath,
    original_name: file.name,
    mime_type: file.type,
    size_bytes: file.size,
    caption: nullableText(formData, "caption"),
    description: nullableText(formData, "description"),
    captured_at: text(formData, "captured_at") || null,
    location_text: nullableText(formData, "location_text"),
    sort_order: integer(formData, "sort_order", 0),
    created_by: user.id,
  });

  if (rowError) {
    await supabase.storage.from("report-files").remove([storagePath]);
    redirect(reportPath(reportId, rowError.message, "error") + "#anexos");
  }
  revalidatePath(`/laudos/${reportId}`);
  redirect(reportPath(reportId, "Arquivo anexado ao laudo.") + "#anexos");
}

export async function deleteReportAttachmentAction(reportId: string, attachmentId: string) {
  const { supabase } = await requireReport(reportId);
  const { data: attachment } = await supabase
    .from("expert_report_attachments")
    .select("storage_bucket,storage_path")
    .eq("id", attachmentId)
    .eq("report_id", reportId)
    .maybeSingle();
  if (!attachment) return;
  await supabase.storage.from(attachment.storage_bucket).remove([attachment.storage_path]);
  await supabase.from("expert_report_attachments").delete().eq("id", attachmentId).eq("report_id", reportId);
  revalidatePath(`/laudos/${reportId}`);
}

export async function createReportVersionAction(reportId: string, formData: FormData) {
  const { supabase } = await requireReport(reportId);
  const summary = nullableText(formData, "change_summary") || "Versão manual registrada pelo usuário.";
  const { data, error } = await supabase.rpc("snapshot_expert_report", { target_report: reportId, summary });
  if (error) redirect(reportPath(reportId, error.message, "error") + "#versoes");
  revalidatePath(`/laudos/${reportId}`);
  redirect(reportPath(reportId, `Versão ${data} registrada com sucesso.`) + "#versoes");
}
