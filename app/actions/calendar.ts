"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization, requireCurrentOrganization } from "@/lib/current-organization";
import type { Permission } from "@/lib/permissions";
import { reverseDeadlineCategory } from "@/lib/calendar-options";
import { brasiliaDateTimeLocalToIso } from "@/lib/datetime";

function text(formData: FormData, name: string) {
  return String(formData.get(name) || "").trim();
}

function nullableText(formData: FormData, name: string) {
  return text(formData, name) || null;
}

function checked(formData: FormData, name: string) {
  return formData.get(name) === "on" || formData.get(name) === "true";
}

function toIsoDateTime(value: FormDataEntryValue | null) {
  return brasiliaDateTimeLocalToIso(value);
}

function parseIntegerList(value: FormDataEntryValue | null, fallback: number[]) {
  const list = String(value || "")
    .split(",")
    .map((item) => Number.parseInt(item.trim(), 10))
    .filter((item) => Number.isFinite(item) && item >= 0 && item <= 525600);
  return list.length ? [...new Set(list)] : fallback;
}

function agendaRedirect(message: string, type: "success" | "error" = "success", suffix = ""): never {
  redirect(`/agenda${suffix}?${type}=${encodeURIComponent(message)}`);
}

async function context(permission?: Permission) {
  const organization = permission ? await requireCurrentOrganization(permission) : await getCurrentOrganization();
  if (!organization) redirect("/onboarding");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { organization, supabase, user };
}

async function validateProcess(processId: string | null, organizationId: string, supabase: Awaited<ReturnType<typeof createClient>>) {
  if (!processId) return;
  const { data } = await supabase.from("processes").select("id").eq("id", processId).eq("organization_id", organizationId).maybeSingle();
  if (!data) agendaRedirect("O processo selecionado não pertence ao escritório.", "error", "/novo");
}

async function addActivity(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
  processId: string | null,
  userId: string,
  activityType: string,
  description: string,
  metadata: Record<string, unknown> = {},
) {
  if (!processId) return;
  await supabase.from("process_activities").insert({
    organization_id: organizationId,
    process_id: processId,
    activity_type: activityType,
    description,
    metadata,
    created_by: userId,
  });
}

function refresh(eventId?: string, processId?: string | null) {
  revalidatePath("/agenda");
  revalidatePath("/alertas");
  revalidatePath("/dashboard");
  if (eventId) revalidatePath(`/agenda/${eventId}`);
  if (processId) revalidatePath(`/processos/${processId}`);
}

export async function saveCalendarEventAction(eventId: string | null, formData: FormData) {
  const { organization, supabase, user } = await context("calendar:write");
  const title = text(formData, "title");
  const startsAt = toIsoDateTime(formData.get("starts_at"));
  const endsAt = toIsoDateTime(formData.get("ends_at"));
  const processId = nullableText(formData, "process_id");
  const eventType = text(formData, "event_type") || "other";
  const status = text(formData, "status") || "scheduled";

  if (title.length < 3) agendaRedirect("Informe um título com pelo menos três caracteres.", "error", eventId ? `/${eventId}` : "/novo");
  if (!startsAt) agendaRedirect("Informe a data e o horário do compromisso.", "error", eventId ? `/${eventId}` : "/novo");
  if (endsAt && new Date(endsAt) < new Date(startsAt)) agendaRedirect("O término não pode ser anterior ao início.", "error", eventId ? `/${eventId}` : "/novo");
  await validateProcess(processId, organization.id, supabase);

  const payload = {
    organization_id: organization.id,
    process_id: processId,
    title,
    event_type: eventType,
    status,
    priority: text(formData, "priority") || "normal",
    starts_at: startsAt,
    ends_at: endsAt,
    all_day: checked(formData, "all_day"),
    location_name: nullableText(formData, "location_name"),
    address: nullableText(formData, "address"),
    city: nullableText(formData, "city"),
    state: nullableText(formData, "state")?.toUpperCase().slice(0, 2) || null,
    responsible_name: nullableText(formData, "responsible_name"),
    description: nullableText(formData, "description"),
    reminder_offsets_minutes: parseIntegerList(formData.get("reminder_offsets_minutes"), [1440, 180]),
    completed_at: status === "completed" ? new Date().toISOString() : null,
  };

  let savedId = eventId;
  let deadlineId: string | null = null;
  let originalProcessId: string | null = null;

  if (eventId) {
    const { data: existing } = await supabase
      .from("calendar_events")
      .select("id,deadline_id,process_id")
      .eq("id", eventId)
      .eq("organization_id", organization.id)
      .maybeSingle();
    if (!existing) agendaRedirect("Compromisso não encontrado.", "error");
    deadlineId = existing.deadline_id;
    originalProcessId = existing.process_id;

    const { error } = await supabase.from("calendar_events").update(payload).eq("id", eventId).eq("organization_id", organization.id);
    if (error) agendaRedirect(error.message || "Não foi possível atualizar o compromisso.", "error", `/${eventId}`);

    if (deadlineId && processId) {
      await supabase.from("process_deadlines").update({
        process_id: processId,
        title,
        category: reverseDeadlineCategory(eventType),
        due_at: startsAt,
        priority: payload.priority,
        status: status === "completed" ? "completed" : status === "cancelled" ? "cancelled" : "pending",
        notes: payload.description,
        completed_at: status === "completed" ? payload.completed_at : null,
      }).eq("id", deadlineId).eq("organization_id", organization.id);
    }
  } else {
    const { data, error } = await supabase.from("calendar_events").insert({ ...payload, created_by: user.id }).select("id").single();
    if (error || !data) agendaRedirect(error?.message || "Não foi possível cadastrar o compromisso.", "error", "/novo");
    savedId = data.id;
  }

  await addActivity(
    supabase,
    organization.id,
    processId,
    user.id,
    eventId ? "calendar_event_updated" : "calendar_event_created",
    eventId ? `Compromisso atualizado: ${title}` : `Compromisso cadastrado: ${title}`,
    { event_id: savedId, event_type: eventType, starts_at: startsAt },
  );

  refresh(savedId || undefined, processId || originalProcessId);
  redirect(`/agenda/${savedId}?success=${encodeURIComponent(eventId ? "Compromisso atualizado com sucesso." : "Compromisso cadastrado com sucesso.")}`);
}

export async function updateCalendarEventStatusAction(eventId: string, status: string) {
  const { organization, supabase, user } = await context("calendar:write");
  if (!["scheduled", "confirmed", "completed", "rescheduled", "cancelled", "pending"].includes(status)) {
    agendaRedirect("Situação inválida.", "error", `/${eventId}`);
  }

  const { data: existing } = await supabase
    .from("calendar_events")
    .select("id,title,process_id,deadline_id")
    .eq("id", eventId)
    .eq("organization_id", organization.id)
    .maybeSingle();
  if (!existing) agendaRedirect("Compromisso não encontrado.", "error");

  const completedAt = status === "completed" ? new Date().toISOString() : null;
  const { error } = await supabase.from("calendar_events").update({ status, completed_at: completedAt }).eq("id", eventId).eq("organization_id", organization.id);
  if (error) agendaRedirect(error.message || "Não foi possível atualizar a situação.", "error", `/${eventId}`);

  if (existing.deadline_id) {
    await supabase.from("process_deadlines").update({
      status: status === "completed" ? "completed" : status === "cancelled" ? "cancelled" : "pending",
      completed_at: completedAt,
    }).eq("id", existing.deadline_id).eq("organization_id", organization.id);
  }

  await addActivity(supabase, organization.id, existing.process_id, user.id, "calendar_event_status_updated", `Situação do compromisso alterada para ${status}.`, { event_id: eventId, status });
  refresh(eventId, existing.process_id);
  redirect(`/agenda/${eventId}?success=${encodeURIComponent("Situação atualizada com sucesso.")}`);
}

export async function deleteCalendarEventAction(eventId: string) {
  const { organization, supabase, user } = await context("calendar:delete");
  if (!["owner", "admin"].includes(organization.role)) agendaRedirect("Somente proprietários e administradores podem excluir compromissos.", "error", `/${eventId}`);

  const { data: existing } = await supabase.from("calendar_events").select("id,title,process_id,deadline_id").eq("id", eventId).eq("organization_id", organization.id).maybeSingle();
  if (!existing) agendaRedirect("Compromisso não encontrado.", "error");

  if (existing.deadline_id) {
    const { error } = await supabase.from("process_deadlines").delete().eq("id", existing.deadline_id).eq("organization_id", organization.id);
    if (error) agendaRedirect(error.message || "Não foi possível excluir o prazo vinculado.", "error", `/${eventId}`);
  } else {
    const { error } = await supabase.from("calendar_events").delete().eq("id", eventId).eq("organization_id", organization.id);
    if (error) agendaRedirect(error.message || "Não foi possível excluir o compromisso.", "error", `/${eventId}`);
  }

  await addActivity(supabase, organization.id, existing.process_id, user.id, "calendar_event_deleted", `Compromisso excluído: ${existing.title}`, { event_id: eventId });
  refresh(undefined, existing.process_id);
  redirect(`/agenda?success=${encodeURIComponent("Compromisso excluído definitivamente.")}`);
}

export async function addEventParticipantAction(eventId: string, formData: FormData) {
  const { organization, supabase, user } = await context("calendar:write");
  const name = text(formData, "name");
  if (name.length < 2) agendaRedirect("Informe o nome do participante.", "error", `/${eventId}`);

  const { data: event } = await supabase.from("calendar_events").select("id,process_id").eq("id", eventId).eq("organization_id", organization.id).maybeSingle();
  if (!event) agendaRedirect("Compromisso não encontrado.", "error");

  const { error } = await supabase.from("event_participants").insert({
    event_id: eventId,
    name,
    email: nullableText(formData, "email"),
    phone: nullableText(formData, "phone"),
    role_label: nullableText(formData, "role_label"),
    organization_name: nullableText(formData, "organization_name"),
    attendance_status: text(formData, "attendance_status") || "invited",
    notes: nullableText(formData, "notes"),
    created_by: user.id,
  });
  if (error) agendaRedirect(error.message || "Não foi possível adicionar o participante.", "error", `/${eventId}`);

  refresh(eventId, event.process_id);
  redirect(`/agenda/${eventId}?success=${encodeURIComponent("Participante adicionado.")}`);
}

export async function updateParticipantAttendanceFromFormAction(eventId: string, participantId: string, formData: FormData) {
  return updateParticipantAttendanceAction(eventId, participantId, String(formData.get("attendance_status") || "invited"));
}

export async function updateParticipantAttendanceAction(eventId: string, participantId: string, status: string) {
  const { organization, supabase } = await context("calendar:write");
  if (!["invited", "confirmed", "declined", "attended", "absent"].includes(status)) agendaRedirect("Situação de presença inválida.", "error", `/${eventId}`);

  const { data: event } = await supabase.from("calendar_events").select("id,process_id").eq("id", eventId).eq("organization_id", organization.id).maybeSingle();
  if (!event) agendaRedirect("Compromisso não encontrado.", "error");

  const { error } = await supabase.from("event_participants").update({ attendance_status: status }).eq("id", participantId).eq("event_id", eventId);
  if (error) agendaRedirect(error.message || "Não foi possível atualizar o participante.", "error", `/${eventId}`);

  refresh(eventId, event.process_id);
  redirect(`/agenda/${eventId}?success=${encodeURIComponent("Presença atualizada.")}`);
}

export async function deleteEventParticipantAction(eventId: string, participantId: string) {
  const { organization, supabase } = await context("calendar:delete");
  const { data: event } = await supabase.from("calendar_events").select("id,process_id").eq("id", eventId).eq("organization_id", organization.id).maybeSingle();
  if (!event) agendaRedirect("Compromisso não encontrado.", "error");

  const { error } = await supabase.from("event_participants").delete().eq("id", participantId).eq("event_id", eventId);
  if (error) agendaRedirect(error.message || "Não foi possível remover o participante.", "error", `/${eventId}`);

  refresh(eventId, event.process_id);
  redirect(`/agenda/${eventId}?success=${encodeURIComponent("Participante removido.")}`);
}

export async function saveNotificationPreferencesAction(formData: FormData) {
  const { organization, supabase, user } = await context();
  const payload = {
    organization_id: organization.id,
    user_id: user.id,
    timezone: text(formData, "timezone") || "America/Sao_Paulo",
    in_app_enabled: checked(formData, "in_app_enabled"),
    email_enabled: checked(formData, "email_enabled"),
    daily_digest_enabled: checked(formData, "daily_digest_enabled"),
    daily_digest_time: text(formData, "daily_digest_time") || "08:00",
    deadline_alert_days: parseIntegerList(formData.get("deadline_alert_days"), [7, 3, 1, 0]),
    event_alert_minutes: parseIntegerList(formData.get("event_alert_minutes"), [1440, 180]),
    fee_alerts_enabled: checked(formData, "fee_alerts_enabled"),
    expense_alerts_enabled: checked(formData, "expense_alerts_enabled"),
    overdue_alerts_enabled: checked(formData, "overdue_alerts_enabled"),
  };

  const { error } = await supabase.from("notification_preferences").upsert(payload, { onConflict: "organization_id,user_id" });
  if (error) redirect(`/alertas?error=${encodeURIComponent(error.message || "Não foi possível salvar as preferências.")}`);
  revalidatePath("/alertas");
  redirect(`/alertas?success=${encodeURIComponent("Preferências de alerta atualizadas.")}`);
}
