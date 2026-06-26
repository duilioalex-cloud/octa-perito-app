"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/current-organization";

function text(formData: FormData, name: string) {
  return String(formData.get(name) || "").trim();
}

function nullableText(formData: FormData, name: string) {
  return text(formData, name) || null;
}

function nullableDateTime(formData: FormData, name: string) {
  const value = text(formData, name);
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
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

export async function createProcessAction(formData: FormData) {
  const organization = await getCurrentOrganization();
  if (!organization) redirect("/onboarding");
  const processNumber = text(formData, "process_number");
  if (processNumber.length < 5) redirect("/processos/novo?error=Informe o número do processo.");

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
    fee_proposed: money(formData, "fee_proposed"),
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
  if (payload.appointment_response_due_at) {
    deadlineRows.push({
      organization_id: organization.id,
      process_id: data.id,
      title: "Manifestação sobre a nomeação",
      category: "manifestation",
      due_at: new Date(`${payload.appointment_response_due_at}T18:00:00`).toISOString(),
      priority: payload.priority,
      created_by: user.id,
    });
  }
  if (payload.report_due_at) {
    deadlineRows.push({
      organization_id: organization.id,
      process_id: data.id,
      title: "Entrega do laudo pericial",
      category: "report",
      due_at: new Date(`${payload.report_due_at}T18:00:00`).toISOString(),
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

  await addActivity(supabase, {
    organizationId: organization.id,
    processId: data.id,
    userId: user.id,
    type: "process_created",
    description: "Processo pericial cadastrado no OCTA Perito.",
  });

  revalidatePath("/dashboard");
  revalidatePath("/processos");
  redirect(`/processos/${data.id}?success=${encodeURIComponent("Processo cadastrado com sucesso.")}`);
}

export async function updateProcessAction(processId: string, formData: FormData) {
  const organization = await getCurrentOrganization();
  if (!organization) redirect("/onboarding");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const processNumber = text(formData, "process_number");
  if (processNumber.length < 5) redirect(`/processos/${processId}/editar?error=${encodeURIComponent("Informe o número do processo.")}`);

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
    fee_proposed: money(formData, "fee_proposed"),
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
  revalidatePath(`/processos/${processId}`);
  redirect(`/processos/${processId}?success=${encodeURIComponent("Processo atualizado com sucesso.")}`);
}

export async function updateProcessStatusAction(processId: string, formData: FormData) {
  const organization = await getCurrentOrganization();
  if (!organization) redirect("/onboarding");
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
