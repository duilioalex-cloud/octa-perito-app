"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentOrganization } from "@/lib/current-organization";
import { hasPermission } from "@/lib/permissions";
import { brasiliaDateTimeLocalToIso, todayInBrasilia } from "@/lib/datetime";

function text(formData: FormData, name: string) {
  return String(formData.get(name) || "").trim();
}

function nullableText(formData: FormData, name: string) {
  return text(formData, name) || null;
}

function nullableDate(formData: FormData, name: string) {
  return text(formData, name) || null;
}

function nullableDateTime(formData: FormData, name: string) {
  return brasiliaDateTimeLocalToIso(formData.get(name));
}

function decimal(formData: FormData, name: string, fallback = 0) {
  const raw = text(formData, name).replace(/\s/g, "");
  if (!raw) return fallback;
  const normalized = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : fallback;
}

function integer(formData: FormData, name: string, fallback = 1) {
  const value = Number.parseInt(text(formData, name), 10);
  return Number.isFinite(value) ? value : fallback;
}

function checked(formData: FormData, name: string) {
  return formData.get(name) === "on" || formData.get(name) === "true";
}

async function requireContext() {
  const organization = await requireCurrentOrganization("finance:write");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { organization, supabase, user };
}

async function ensureProcess(processId: string) {
  const context = await requireContext();
  const { data: process } = await context.supabase
    .from("processes")
    .select("id,process_number")
    .eq("id", processId)
    .eq("organization_id", context.organization.id)
    .maybeSingle();
  if (!process) redirect(`/despesas?error=${encodeURIComponent("Processo não encontrado ou sem permissão de acesso.")}`);
  return { ...context, process };
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

function refresh(processId: string) {
  revalidatePath("/dashboard");
  revalidatePath("/honorarios");
  revalidatePath("/despesas");
  revalidatePath(`/despesas/${processId}`);
  revalidatePath(`/processos/${processId}`);
}

function redirectError(processId: string, message: string): never {
  redirect(`/despesas/${processId}?error=${encodeURIComponent(message)}`);
}

function redirectSuccess(processId: string, message: string): never {
  redirect(`/despesas/${processId}?success=${encodeURIComponent(message)}`);
}

export async function saveTripAction(processId: string, tripId: string | null, formData: FormData) {
  const { organization, supabase, user } = await ensureProcess(processId);
  const oneWayKm = Math.max(0, decimal(formData, "one_way_km"));
  const totalKm = Math.max(0, decimal(formData, "total_km"));
  const tripsCount = Math.max(1, integer(formData, "trips_count", 1));

  if (oneWayKm <= 0 && totalKm <= 0) {
    redirectError(processId, "Informe a distância de ida ou a distância total do deslocamento.");
  }

  const payload = {
    organization_id: organization.id,
    process_id: processId,
    title: text(formData, "title") || "Deslocamento pericial",
    status: text(formData, "status") || "planned",
    origin_city: nullableText(formData, "origin_city"),
    origin_state: nullableText(formData, "origin_state"),
    destination_city: nullableText(formData, "destination_city"),
    destination_state: nullableText(formData, "destination_state"),
    departure_at: nullableDateTime(formData, "departure_at"),
    return_at: nullableDateTime(formData, "return_at"),
    one_way_km: oneWayKm,
    total_km: totalKm,
    trips_count: tripsCount,
    fuel_efficiency_km_l: Math.max(0, decimal(formData, "fuel_efficiency_km_l")),
    fuel_price_per_liter: Math.max(0, decimal(formData, "fuel_price_per_liter")),
    vehicle_cost_per_km: Math.max(0, decimal(formData, "vehicle_cost_per_km")),
    toll_amount: Math.max(0, decimal(formData, "toll_amount")),
    lodging_amount: Math.max(0, decimal(formData, "lodging_amount")),
    meal_amount: Math.max(0, decimal(formData, "meal_amount")),
    other_amount: Math.max(0, decimal(formData, "other_amount")),
    travel_hours: Math.max(0, decimal(formData, "travel_hours")),
    hourly_rate: Math.max(0, decimal(formData, "hourly_rate")),
    notes: nullableText(formData, "notes"),
  };

  if (payload.return_at && payload.departure_at && payload.return_at < payload.departure_at) {
    redirectError(processId, "O retorno não pode ser anterior à saída.");
  }

  let error: { message?: string } | null = null;
  if (tripId) {
    const result = await supabase
      .from("process_trips")
      .update(payload)
      .eq("id", tripId)
      .eq("process_id", processId)
      .eq("organization_id", organization.id);
    error = result.error;
  } else {
    const result = await supabase.from("process_trips").insert({ ...payload, created_by: user.id });
    error = result.error;
  }

  if (error) redirectError(processId, error.message || "Não foi possível salvar o deslocamento.");

  await addActivity(supabase, {
    organizationId: organization.id,
    processId,
    userId: user.id,
    type: tripId ? "trip_updated" : "trip_created",
    description: tripId ? "Deslocamento pericial atualizado." : "Deslocamento pericial cadastrado.",
    metadata: { status: payload.status, destination_city: payload.destination_city, one_way_km: oneWayKm, total_km: totalKm },
  });

  refresh(processId);
  redirectSuccess(processId, tripId ? "Deslocamento atualizado com sucesso." : "Deslocamento cadastrado com sucesso.");
}

export async function updateTripStatusAction(processId: string, tripId: string, status: string) {
  const { organization, supabase, user } = await ensureProcess(processId);
  if (!["planned", "confirmed", "completed", "cancelled"].includes(status)) {
    redirectError(processId, "Situação de deslocamento inválida.");
  }

  const { data, error } = await supabase
    .from("process_trips")
    .update({ status })
    .eq("id", tripId)
    .eq("process_id", processId)
    .eq("organization_id", organization.id)
    .select("id,title,total_cost")
    .maybeSingle();

  if (error || !data) redirectError(processId, error?.message || "Não foi possível atualizar o deslocamento.");

  await addActivity(supabase, {
    organizationId: organization.id,
    processId,
    userId: user.id,
    type: "trip_status_updated",
    description: `Situação do deslocamento alterada para ${status}.`,
    metadata: { trip_id: tripId, status },
  });

  refresh(processId);
  redirectSuccess(processId, "Situação do deslocamento atualizada.");
}

export async function deleteTripAction(processId: string, tripId: string) {
  const { organization, supabase, user } = await ensureProcess(processId);
  if (!hasPermission(organization.role, "finance:delete")) {
    redirectError(processId, "Seu nivel de acesso nao permite excluir deslocamentos.");
  }

  const { data, error } = await supabase
    .from("process_trips")
    .delete()
    .eq("id", tripId)
    .eq("process_id", processId)
    .eq("organization_id", organization.id)
    .select("id,title,total_cost")
    .maybeSingle();

  if (error || !data) redirectError(processId, error?.message || "Não foi possível excluir o deslocamento.");

  await addActivity(supabase, {
    organizationId: organization.id,
    processId,
    userId: user.id,
    type: "trip_deleted",
    description: "Deslocamento pericial excluído.",
    metadata: { trip_id: tripId, title: data.title, total_cost: data.total_cost },
  });

  refresh(processId);
  redirectSuccess(processId, "Deslocamento excluído definitivamente.");
}

export async function saveExpenseAction(processId: string, expenseId: string | null, formData: FormData) {
  const { organization, supabase, user } = await ensureProcess(processId);
  const description = text(formData, "description");
  const quantity = Math.max(0.001, decimal(formData, "quantity", 1));
  const unitAmount = Math.max(0, decimal(formData, "unit_amount"));
  const isReimbursable = checked(formData, "is_reimbursable");
  const paymentStatus = text(formData, "payment_status") || "pending";
  const reimbursementStatus = isReimbursable ? (text(formData, "reimbursement_status") || "pending") : "not_applicable";

  if (description.length < 3) redirectError(processId, "Informe uma descrição válida para a despesa.");
  if (unitAmount <= 0) redirectError(processId, "Informe um valor unitário maior que zero.");

  const tripId = nullableText(formData, "trip_id");
  if (tripId) {
    const { data: trip } = await supabase
      .from("process_trips")
      .select("id")
      .eq("id", tripId)
      .eq("process_id", processId)
      .eq("organization_id", organization.id)
      .maybeSingle();
    if (!trip) redirectError(processId, "O deslocamento selecionado não pertence a este processo.");
  }

  const payload = {
    organization_id: organization.id,
    process_id: processId,
    trip_id: tripId,
    category: text(formData, "category") || "other",
    description,
    expense_date: nullableDate(formData, "expense_date") || todayInBrasilia(),
    quantity,
    unit_amount: unitAmount,
    payment_method: nullableText(formData, "payment_method"),
    payment_status: paymentStatus,
    paid_at: paymentStatus === "paid" ? nullableDate(formData, "paid_at") : null,
    is_estimated: checked(formData, "is_estimated"),
    is_reimbursable: isReimbursable,
    reimbursement_status: reimbursementStatus,
    vendor_name: nullableText(formData, "vendor_name"),
    document_number: nullableText(formData, "document_number"),
    notes: nullableText(formData, "notes"),
  };

  let error: { message?: string } | null = null;
  if (expenseId) {
    const result = await supabase
      .from("process_expenses")
      .update(payload)
      .eq("id", expenseId)
      .eq("process_id", processId)
      .eq("organization_id", organization.id);
    error = result.error;
  } else {
    const result = await supabase.from("process_expenses").insert({ ...payload, created_by: user.id });
    error = result.error;
  }

  if (error) redirectError(processId, error.message || "Não foi possível salvar a despesa.");

  await addActivity(supabase, {
    organizationId: organization.id,
    processId,
    userId: user.id,
    type: expenseId ? "expense_updated" : "expense_created",
    description: expenseId ? "Despesa do processo atualizada." : "Despesa do processo cadastrada.",
    metadata: { category: payload.category, quantity, unit_amount: unitAmount, payment_status: paymentStatus },
  });

  refresh(processId);
  redirectSuccess(processId, expenseId ? "Despesa atualizada com sucesso." : "Despesa cadastrada com sucesso.");
}

export async function updateExpensePaymentStatusAction(processId: string, expenseId: string, status: string) {
  const { organization, supabase, user } = await ensureProcess(processId);
  if (!["planned", "pending", "paid", "cancelled"].includes(status)) {
    redirectError(processId, "Situação de pagamento inválida.");
  }

  const { data, error } = await supabase
    .from("process_expenses")
    .update({ payment_status: status, paid_at: status === "paid" ? todayInBrasilia() : null })
    .eq("id", expenseId)
    .eq("process_id", processId)
    .eq("organization_id", organization.id)
    .select("id,description,total_amount")
    .maybeSingle();

  if (error || !data) redirectError(processId, error?.message || "Não foi possível atualizar a despesa.");

  await addActivity(supabase, {
    organizationId: organization.id,
    processId,
    userId: user.id,
    type: "expense_payment_status_updated",
    description: `Situação de pagamento da despesa alterada para ${status}.`,
    metadata: { expense_id: expenseId, status },
  });

  refresh(processId);
  redirectSuccess(processId, "Situação de pagamento atualizada.");
}

export async function updateExpenseReimbursementStatusAction(processId: string, expenseId: string, status: string) {
  const { organization, supabase, user } = await ensureProcess(processId);
  if (!["pending", "requested", "approved", "reimbursed", "denied"].includes(status)) {
    redirectError(processId, "Situação de reembolso inválida.");
  }

  const { data, error } = await supabase
    .from("process_expenses")
    .update({ is_reimbursable: true, reimbursement_status: status })
    .eq("id", expenseId)
    .eq("process_id", processId)
    .eq("organization_id", organization.id)
    .select("id,description,total_amount")
    .maybeSingle();

  if (error || !data) redirectError(processId, error?.message || "Não foi possível atualizar o reembolso.");

  await addActivity(supabase, {
    organizationId: organization.id,
    processId,
    userId: user.id,
    type: "expense_reimbursement_status_updated",
    description: `Situação de reembolso alterada para ${status}.`,
    metadata: { expense_id: expenseId, status },
  });

  refresh(processId);
  redirectSuccess(processId, "Situação de reembolso atualizada.");
}

export async function deleteExpenseAction(processId: string, expenseId: string) {
  const { organization, supabase, user } = await ensureProcess(processId);
  if (!hasPermission(organization.role, "finance:delete")) {
    redirectError(processId, "Seu nivel de acesso nao permite excluir despesas.");
  }

  const { data, error } = await supabase
    .from("process_expenses")
    .delete()
    .eq("id", expenseId)
    .eq("process_id", processId)
    .eq("organization_id", organization.id)
    .select("id,description,total_amount")
    .maybeSingle();

  if (error || !data) redirectError(processId, error?.message || "Não foi possível excluir a despesa.");

  await addActivity(supabase, {
    organizationId: organization.id,
    processId,
    userId: user.id,
    type: "expense_deleted",
    description: "Despesa do processo excluída.",
    metadata: { expense_id: expenseId, description: data.description, total_amount: data.total_amount },
  });

  refresh(processId);
  redirectSuccess(processId, "Despesa excluída definitivamente.");
}
