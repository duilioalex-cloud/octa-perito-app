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

function nullableDate(formData: FormData, name: string) {
  const value = text(formData, name);
  return value || null;
}

function decimal(formData: FormData, name: string, fallback = 0) {
  const raw = text(formData, name).replace(/\s/g, "");
  if (!raw) return fallback;
  const normalized = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : fallback;
}

async function requireContext() {
  const organization = await getCurrentOrganization();
  if (!organization) redirect("/onboarding");
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
  if (!process) redirect(`/honorarios?error=${encodeURIComponent("Processo não encontrado ou sem permissão de acesso.")}`);
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
  revalidatePath(`/honorarios/${processId}`);
  revalidatePath(`/processos/${processId}`);
}

export async function savePrimaryFeeAction(processId: string, feeId: string | null, formData: FormData) {
  const { organization, supabase, user } = await ensureProcess(processId);

  const payload = {
    organization_id: organization.id,
    process_id: processId,
    title: text(formData, "title") || "Honorários periciais",
    fee_type: text(formData, "fee_type") || "judicial_expert",
    status: text(formData, "status") || "not_defined",
    funding_mode: text(formData, "funding_mode") || "court_deposit",
    responsibility_type: text(formData, "responsibility_type") || "not_defined",
    responsible_party: nullableText(formData, "responsible_party"),
    initial_arbitrated_amount: Math.max(0, decimal(formData, "initial_arbitrated_amount")),
    proposed_amount: Math.max(0, decimal(formData, "proposed_amount")),
    approved_amount: Math.max(0, decimal(formData, "approved_amount")),
    advance_percentage: Math.min(100, Math.max(0, decimal(formData, "advance_percentage"))),
    opening_deposited_amount: Math.max(0, decimal(formData, "opening_deposited_amount")),
    opening_received_amount: Math.max(0, decimal(formData, "opening_received_amount")),
    proposed_at: nullableDate(formData, "proposed_at"),
    approved_at: nullableDate(formData, "approved_at"),
    deposit_due_at: nullableDate(formData, "deposit_due_at"),
    release_requested_at: nullableDate(formData, "release_requested_at"),
    closed_at: nullableDate(formData, "closed_at"),
    notes: nullableText(formData, "notes"),
    is_primary: true,
  };

  if (payload.approved_at && payload.proposed_at && payload.approved_at < payload.proposed_at) {
    redirect(`/honorarios/${processId}?error=${encodeURIComponent("A data da homologação não pode ser anterior à data da proposta.")}`);
  }

  let error: { message?: string } | null = null;
  if (feeId) {
    const result = await supabase
      .from("process_fees")
      .update(payload)
      .eq("id", feeId)
      .eq("process_id", processId)
      .eq("organization_id", organization.id);
    error = result.error;
  } else {
    const result = await supabase.from("process_fees").insert({ ...payload, created_by: user.id });
    error = result.error;
  }

  if (error) {
    redirect(`/honorarios/${processId}?error=${encodeURIComponent(error.message || "Não foi possível salvar os honorários.")}`);
  }

  await addActivity(supabase, {
    organizationId: organization.id,
    processId,
    userId: user.id,
    type: feeId ? "fee_updated" : "fee_created",
    description: feeId ? "Dados dos honorários periciais atualizados." : "Controle de honorários periciais criado.",
    metadata: { status: payload.status, proposed_amount: payload.proposed_amount, approved_amount: payload.approved_amount },
  });

  refresh(processId);
  redirect(`/honorarios/${processId}?success=${encodeURIComponent("Honorários salvos com sucesso.")}`);
}

export async function createFeeTransactionAction(processId: string, feeId: string, formData: FormData) {
  const { organization, supabase, user } = await ensureProcess(processId);
  const transactionType = text(formData, "transaction_type") || "deposit";
  const amount = Math.max(0, decimal(formData, "amount"));
  if (amount <= 0) redirect(`/honorarios/${processId}?error=${encodeURIComponent("Informe um valor maior que zero para o lançamento.")}`);

  const netAmountRaw = nullableText(formData, "net_amount");
  const withheld = Math.max(0, decimal(formData, "withheld_amount"));
  const netAmount = netAmountRaw ? Math.max(0, decimal(formData, "net_amount")) : null;
  const depositDelta = transactionType === "adjustment" ? decimal(formData, "deposit_delta") : 0;
  const receivedDelta = transactionType === "adjustment" ? decimal(formData, "received_delta") : 0;

  const { error } = await supabase.from("fee_transactions").insert({
    organization_id: organization.id,
    process_id: processId,
    fee_id: feeId,
    transaction_type: transactionType,
    status: text(formData, "status") || "pending",
    amount,
    net_amount: netAmount,
    withheld_amount: withheld,
    deposit_delta: depositDelta,
    received_delta: receivedDelta,
    occurred_at: nullableDate(formData, "occurred_at"),
    due_at: nullableDate(formData, "due_at"),
    payment_method: nullableText(formData, "payment_method"),
    reference_number: nullableText(formData, "reference_number"),
    notes: nullableText(formData, "notes"),
    created_by: user.id,
  });

  if (error) redirect(`/honorarios/${processId}?error=${encodeURIComponent(error.message || "Não foi possível registrar a movimentação.")}`);

  await addActivity(supabase, {
    organizationId: organization.id,
    processId,
    userId: user.id,
    type: "fee_transaction_created",
    description: "Movimentação financeira de honorários registrada.",
    metadata: { transaction_type: transactionType, amount },
  });

  refresh(processId);
  redirect(`/honorarios/${processId}?success=${encodeURIComponent("Movimentação registrada com sucesso.")}`);
}

export async function updateFeeTransactionStatusAction(processId: string, transactionId: string, status: string) {
  const { organization, supabase, user } = await ensureProcess(processId);
  if (!['planned', 'pending', 'confirmed', 'cancelled'].includes(status)) {
    redirect(`/honorarios/${processId}?error=${encodeURIComponent("Situação de lançamento inválida.")}`);
  }
  const { data, error } = await supabase
    .from("fee_transactions")
    .update({ status })
    .eq("id", transactionId)
    .eq("process_id", processId)
    .eq("organization_id", organization.id)
    .select("id,transaction_type,amount")
    .maybeSingle();
  if (error || !data) redirect(`/honorarios/${processId}?error=${encodeURIComponent(error?.message || "Não foi possível atualizar o lançamento.")}`);

  await addActivity(supabase, {
    organizationId: organization.id,
    processId,
    userId: user.id,
    type: "fee_transaction_status_updated",
    description: `Situação da movimentação financeira alterada para ${status}.`,
    metadata: { transaction_id: transactionId, status },
  });
  refresh(processId);
  redirect(`/honorarios/${processId}?success=${encodeURIComponent("Situação da movimentação atualizada.")}`);
}

export async function deleteFeeTransactionAction(processId: string, transactionId: string) {
  const { organization, supabase, user } = await ensureProcess(processId);
  if (!["owner", "admin"].includes(organization.role)) {
    redirect(`/honorarios/${processId}?error=${encodeURIComponent("Somente proprietários e administradores podem excluir movimentações.")}`);
  }
  const { data, error } = await supabase
    .from("fee_transactions")
    .delete()
    .eq("id", transactionId)
    .eq("process_id", processId)
    .eq("organization_id", organization.id)
    .select("id,transaction_type,amount")
    .maybeSingle();
  if (error || !data) redirect(`/honorarios/${processId}?error=${encodeURIComponent(error?.message || "Não foi possível excluir a movimentação.")}`);

  await addActivity(supabase, {
    organizationId: organization.id,
    processId,
    userId: user.id,
    type: "fee_transaction_deleted",
    description: "Movimentação financeira de honorários excluída.",
    metadata: { transaction_id: transactionId, transaction_type: data.transaction_type, amount: data.amount },
  });
  refresh(processId);
  redirect(`/honorarios/${processId}?success=${encodeURIComponent("Movimentação excluída definitivamente.")}`);
}
