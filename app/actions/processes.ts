"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization, requireCurrentOrganization } from "@/lib/current-organization";
import { brasiliaDateTimeLocalToIso, dateOnlyAtBrasiliaTimeToIso } from "@/lib/datetime";

function text(formData: FormData, name: string) {
  return String(formData.get(name) || "").trim();
}

function nullableText(formData: FormData, name: string) {
  return text(formData, name) || null;
}

function nullableDateTime(formData: FormData, name: string) {
  return brasiliaDateTimeLocalToIso(formData.get(name));
}

function money(formData: FormData, name: string) {
  const normalized = text(formData, name).replace(/\./g, "").replace(",", ".");
  const value = Number(normalized || 0);
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

async function addActivity(
  supabase: Awaited<ReturnType<typeof createClient>>,
  payload: { organizationId: string; processId: string; userId: string; type: string; description: string; metadata?: Record<string, unknown> },
) {
  await supabase.from("process_activities").insert({
    organization_id: payload.organizationId,
    process_id: payload.processId,
    activity_type: payload.type,
    description: payload.description,
    metadata: payload.metadata ?? {},
    created_by: payload.userId,
  });
}

function feeStatusFromLegacyValues(values: { proposed: number; arbitrated: number; deposited: number; received: number }) {
  if (values.received > 0 && values.arbitrated > 0 && values.received >= values.arbitrated) return "fully_released";
  if (values.received > 0) return "partially_released";
  if (values.deposited > 0 && values.arbitrated > 0 && values.deposited >= values.arbitrated) return "fully_deposited";
  if (values.deposited > 0) return "partially_deposited";
  if (values.arbitrated > 0) return "approved";
  if (values.proposed > 0) return "proposal_submitted";
  return "not_defined";
}

async function syncPrimaryFeeFromProcessForm(
  supabase: Awaited<ReturnType<typeof createClient>>,
  payload: {
    organizationId: string;
    processId: string;
    userId: string;
    expertiseType: string | null;
    proposed: number;
    charged: number;
    arbitrated: number;
    deposited: number;
    received: number;
  },
) {
  const chargedAmount = payload.charged > 0 ? payload.charged : payload.proposed;
  const hasFinancialValue = payload.proposed > 0 || chargedAmount > 0 || payload.arbitrated > 0 || payload.deposited > 0 || payload.received > 0;
  const { data: existingFee } = await supabase
    .from("process_fees")
    .select("id,metadata")
    .eq("process_id", payload.processId)
    .eq("organization_id", payload.organizationId)
    .eq("is_primary", true)
    .neq("status", "cancelled")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!hasFinancialValue && !existingFee) return;

  const feePayload = {
    status: feeStatusFromLegacyValues(payload),
    fee_type: payload.expertiseType === "technical_assistant" ? "technical_assistant" : payload.expertiseType === "extrajudicial" ? "extrajudicial" : "judicial_expert",
    proposed_amount: payload.proposed || chargedAmount,
    initial_arbitrated_amount: payload.arbitrated,
    approved_amount: payload.arbitrated,
    opening_deposited_amount: payload.deposited,
    opening_received_amount: payload.received,
    metadata: {
      ...(((existingFee?.metadata || {}) as Record<string, any>) || {}),
      source: "process_form_sync",
      charged_amount: chargedAmount,
      version: "0.9.11",
    },
  };

  if (existingFee?.id) {
    const { error } = await supabase
      .from("process_fees")
      .update(feePayload)
      .eq("id", existingFee.id)
      .eq("process_id", payload.processId)
      .eq("organization_id", payload.organizationId);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from("process_fees").insert({
    organization_id: payload.organizationId,
    process_id: payload.processId,
    title: "Honorarios informados no cadastro",
    funding_mode: "court_deposit",
    responsibility_type: "not_defined",
    advance_percentage: 0,
    is_primary: true,
    notes: "Registro criado automaticamente a partir dos honorarios informados no cadastro do processo.",
    metadata: {
      source: "process_form_sync",
      charged_amount: chargedAmount,
      version: "0.9.11",
    },
    created_by: payload.userId,
    ...feePayload,
  });
  if (error) throw error;
}

export async function deleteProcessAction(processId: string) {
  const organization = await getCurrentOrganization();
  if (!organization) redirect("/onboarding");
  if (!["owner", "admin"].includes(organization.role)) {
    redirect(`/processos/${processId}?error=${encodeURIComponent("Somente proprietários e administradores podem excluir processos.")}`);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: process } = await supabase
    .from("processes")
    .select("id,process_number")
    .eq("id", processId)
    .eq("organization_id", organization.id)
    .maybeSingle();

  if (!process) {
    redirect(`/processos?error=${encodeURIComponent("Processo não encontrado ou sem permissão de acesso.")}`);
  }

  const { data: reports } = await supabase
    .from("expert_reports")
    .select("id")
    .eq("process_id", processId)
    .eq("organization_id", organization.id);

  const reportIds = (reports || []).map((report) => report.id);
  const attachments = reportIds.length
    ? (
        await supabase
          .from("expert_report_attachments")
          .select("storage_bucket,storage_path")
          .in("report_id", reportIds)
      ).data || []
    : [];

  const { data: deletedProcess, error } = await supabase
    .from("processes")
    .delete()
    .eq("id", processId)
    .eq("organization_id", organization.id)
    .select("id")
    .maybeSingle();

  if (error || !deletedProcess) {
    redirect(`/processos/${processId}?error=${encodeURIComponent(error?.message || "Não foi possível excluir o processo.")}`);
  }

  const filesByBucket = new Map<string, string[]>();
  for (const attachment of attachments) {
    if (!attachment.storage_bucket || !attachment.storage_path) continue;
    const paths = filesByBucket.get(attachment.storage_bucket) || [];
    paths.push(attachment.storage_path);
    filesByBucket.set(attachment.storage_bucket, paths);
  }

  for (const [bucket, paths] of filesByBucket) {
    await supabase.storage.from(bucket).remove(paths);
  }

  revalidatePath("/dashboard");
  revalidatePath("/processos");
  revalidatePath("/laudos");
  revalidatePath("/documentos");
  revalidatePath("/honorarios");
  redirect(`/processos?success=${encodeURIComponent(`Processo ${process.process_number} excluído definitivamente.`)}`);
}

export async function createProcessAction(formData: FormData) {
  const organization = await requireCurrentOrganization("processes:write");
  const processNumber = text(formData, "process_number");
  if (processNumber.length < 5) redirect("/processos/novo?error=Informe o número do processo.");
  const feeCharged = money(formData, "fee_charged");
  const feeProposed = money(formData, "fee_proposed");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const payload = {
    organization_id: organization.id,
    process_number: processNumber,
    court: nullableText(formData, "court"),
    district: nullableText(formData, "district"),
    division: nullableText(formData, "division"),
    case_class: nullableText(formData, "case_class"),
    expertise_area: nullableText(formData, "expertise_area"),
    plaintiff: nullableText(formData, "plaintiff"),
    defendant: nullableText(formData, "defendant"),
    subject: nullableText(formData, "subject"),
    expertise_type: text(formData, "expertise_type") || "judicial_expert",
    status: text(formData, "status") || "appointment_received",
    priority: text(formData, "priority") || "normal",
    appointed_at: text(formData, "appointed_at") || null,
    appointment_response_due_at: text(formData, "appointment_response_due_at") || null,
    report_due_at: text(formData, "report_due_at") || null,
    diligence_at: nullableDateTime(formData, "diligence_at"),
    responsible_name: nullableText(formData, "responsible_name"),
    fee_proposed: feeProposed || feeCharged,
    fee_arbitrated: money(formData, "fee_arbitrated"),
    fee_deposited: money(formData, "fee_deposited"),
    fee_received: money(formData, "fee_received"),
    notes: nullableText(formData, "notes"),
    created_by: user.id,
  };

  const { data, error } = await supabase.from("processes").insert(payload).select("id").single();
  if (error || !data) {
    const message = error?.code === "23505" ? "Este número de processo já está cadastrado." : "Não foi possível cadastrar o processo.";
    redirect(`/processos/novo?error=${encodeURIComponent(message)}`);
  }

  const deadlineRows: Array<Record<string, unknown>> = [];
  const appointmentResponseDueAt = dateOnlyAtBrasiliaTimeToIso(payload.appointment_response_due_at);
  if (appointmentResponseDueAt) {
    deadlineRows.push({
      organization_id: organization.id,
      process_id: data.id,
      title: "Manifestação sobre a nomeação",
      category: "manifestation",
      due_at: appointmentResponseDueAt,
      priority: payload.priority,
      created_by: user.id,
    });
  }
  const reportDueAt = dateOnlyAtBrasiliaTimeToIso(payload.report_due_at);
  if (reportDueAt) {
    deadlineRows.push({
      organization_id: organization.id,
      process_id: data.id,
      title: "Entrega do laudo pericial",
      category: "report",
      due_at: reportDueAt,
      priority: payload.priority,
      created_by: user.id,
    });
  }
  if (payload.diligence_at) {
    deadlineRows.push({
      organization_id: organization.id,
      process_id: data.id,
      title: "Diligência pericial",
      category: "diligence",
      due_at: payload.diligence_at,
      priority: payload.priority,
      created_by: user.id,
    });
  }
  if (deadlineRows.length) await supabase.from("process_deadlines").insert(deadlineRows);

  try {
    await syncPrimaryFeeFromProcessForm(supabase, {
      organizationId: organization.id,
      processId: data.id,
      userId: user.id,
      expertiseType: payload.expertise_type,
      proposed: payload.fee_proposed,
      charged: feeCharged,
      arbitrated: payload.fee_arbitrated,
      deposited: payload.fee_deposited,
      received: payload.fee_received,
    });
  } catch (syncError: any) {
    redirect(`/processos/${data.id}?error=${encodeURIComponent(syncError?.message || "Processo cadastrado, mas nao foi possivel sincronizar os honorarios.")}`);
  }

  await addActivity(supabase, {
    organizationId: organization.id,
    processId: data.id,
    userId: user.id,
    type: "process_created",
    description: "Processo pericial cadastrado no OCTA Perito.",
  });

  revalidatePath("/dashboard");
  revalidatePath("/processos");
  revalidatePath("/honorarios");
  redirect(`/processos/${data.id}?success=${encodeURIComponent("Processo cadastrado com sucesso.")}`);
}

export async function updateProcessAction(processId: string, formData: FormData) {
  const organization = await requireCurrentOrganization("processes:write");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const processNumber = text(formData, "process_number");
  if (processNumber.length < 5) redirect(`/processos/${processId}/editar?error=${encodeURIComponent("Informe o número do processo.")}`);
  const feeCharged = money(formData, "fee_charged");
  const feeProposed = money(formData, "fee_proposed");

  const payload = {
    process_number: processNumber,
    court: nullableText(formData, "court"),
    district: nullableText(formData, "district"),
    division: nullableText(formData, "division"),
    case_class: nullableText(formData, "case_class"),
    expertise_area: nullableText(formData, "expertise_area"),
    plaintiff: nullableText(formData, "plaintiff"),
    defendant: nullableText(formData, "defendant"),
    subject: nullableText(formData, "subject"),
    expertise_type: text(formData, "expertise_type") || "judicial_expert",
    status: text(formData, "status") || "appointment_received",
    priority: text(formData, "priority") || "normal",
    appointed_at: text(formData, "appointed_at") || null,
    appointment_response_due_at: text(formData, "appointment_response_due_at") || null,
    report_due_at: text(formData, "report_due_at") || null,
    diligence_at: nullableDateTime(formData, "diligence_at"),
    responsible_name: nullableText(formData, "responsible_name"),
    fee_proposed: feeProposed || feeCharged,
    fee_arbitrated: money(formData, "fee_arbitrated"),
    fee_deposited: money(formData, "fee_deposited"),
    fee_received: money(formData, "fee_received"),
    notes: nullableText(formData, "notes"),
  };

  const { error } = await supabase
    .from("processes")
    .update(payload)
    .eq("id", processId)
    .eq("organization_id", organization.id);

  if (error) redirect(`/processos/${processId}/editar?error=${encodeURIComponent("Não foi possível atualizar o processo.")}`);

  try {
    await syncPrimaryFeeFromProcessForm(supabase, {
      organizationId: organization.id,
      processId,
      userId: user.id,
      expertiseType: payload.expertise_type,
      proposed: payload.fee_proposed,
      charged: feeCharged,
      arbitrated: payload.fee_arbitrated,
      deposited: payload.fee_deposited,
      received: payload.fee_received,
    });
  } catch (syncError: any) {
    redirect(`/processos/${processId}/editar?error=${encodeURIComponent(syncError?.message || "Nao foi possivel sincronizar os honorarios com o financeiro.")}`);
  }

  await addActivity(supabase, {
    organizationId: organization.id,
    processId,
    userId: user.id,
    type: "process_updated",
    description: "Dados do processo atualizados.",
    metadata: { status: payload.status },
  });

  revalidatePath("/dashboard");
  revalidatePath("/processos");
  revalidatePath("/honorarios");
  revalidatePath(`/processos/${processId}`);
  redirect(`/processos/${processId}?success=${encodeURIComponent("Processo atualizado com sucesso.")}`);
}

export async function updateProcessStatusAction(processId: string, formData: FormData) {
  const organization = await requireCurrentOrganization("processes:write");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const status = text(formData, "status");

  const { error } = await supabase
    .from("processes")
    .update({ status })
    .eq("id", processId)
    .eq("organization_id", organization.id);

  if (error) redirect(`/processos/${processId}?error=${encodeURIComponent("Não foi possível alterar o status.")}`);

  await addActivity(supabase, {
    organizationId: organization.id,
    processId,
    userId: user.id,
    type: "status_changed",
    description: `Status do processo alterado para: ${status}.`,
    metadata: { status },
  });

  revalidatePath("/dashboard");
  revalidatePath("/processos");
  revalidatePath(`/processos/${processId}`);
}
