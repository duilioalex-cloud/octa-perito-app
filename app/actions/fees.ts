"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentOrganization } from "@/lib/current-organization";
import { hasPermission } from "@/lib/permissions";

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

function currency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number.isFinite(value) ? value : 0);
}

function roundMoney(value: number) {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
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
    .select("id,process_number,court,subject,expertise_area,expertise_type")
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
  revalidatePath("/despesas");
  revalidatePath(`/honorarios/${processId}`);
  revalidatePath(`/despesas/${processId}`);
  revalidatePath(`/processos/${processId}`);
}

function redirectProcessError(processId: string, message: string): never {
  redirect(`/processos/${processId}?error=${encodeURIComponent(message)}`);
}

function redirectProcessSuccess(processId: string, message: string): never {
  redirect(`/processos/${processId}?success=${encodeURIComponent(message)}`);
}

const stageFields = [
  ["reading", "Leitura da nomeação e despacho"],
  ["initial_study", "Estudo inicial do processo"],
  ["document_analysis", "Análise de documentos"],
  ["questions_analysis", "Análise dos quesitos"],
  ["planning", "Planejamento da perícia"],
  ["inspection", "Vistoria/diligência"],
  ["travel", "Deslocamento"],
  ["technical_survey", "Levantamento técnico/fotográfico"],
  ["research", "Pesquisas de mercado ou normas"],
  ["calculations", "Cálculos e análises"],
  ["report_writing", "Elaboração do laudo"],
  ["technical_review", "Revisão técnica"],
  ["clarifications", "Esclarecimentos posteriores"],
  ["hearing", "Audiência técnica"],
] as const;

const expenseFields = [
  ["toll_amount", "Pedágio"],
  ["parking_amount", "Estacionamento"],
  ["meal_amount", "Alimentação"],
  ["lodging_amount", "Hospedagem"],
  ["ticket_amount", "Passagens"],
  ["art_amount", "ART/RRT"],
  ["laboratory_amount", "Ensaios/laboratório"],
  ["topography_amount", "Topografia"],
  ["drone_amount", "Drone"],
  ["printing_amount", "Impressões/cópias"],
  ["registry_amount", "Certidões/cartório"],
  ["equipment_amount", "Equipamentos especiais"],
  ["other_expenses", "Outras despesas"],
] as const;

const complexityMultipliers: Record<string, number> = {
  low: 1,
  medium: 1.25,
  high: 1.5,
  very_high: 2,
};

const complexityLabels: Record<string, string> = {
  low: "baixa",
  medium: "média",
  high: "alta",
  very_high: "muito alta",
};

function buildFeeCalculatorMemory(input: {
  expertiseArea: string;
  justiceBranch: string;
  legalAid: boolean;
  baseHours: number;
  technicalRate: number;
  assistantHours: number;
  assistantRate: number;
  complexity: string;
  professionalTotal: number;
  directExpensesTotal: number;
  totalSuggested: number;
  advancePercentage: number;
  advanceAmount: number;
  tableName: string;
  tableLimit: number;
  aboveTable: boolean;
  stageHours: Record<string, number>;
  expenseItems: Record<string, number>;
  customJustification: string | null;
}) {
  const stageLines = stageFields
    .map(([key, label]) => ({ label, value: input.stageHours[key] || 0 }))
    .filter((item) => item.value > 0)
    .map((item) => `- ${item.label}: ${item.value.toLocaleString("pt-BR")} h`)
    .join("\n");

  const expenseLines = Object.entries(input.expenseItems)
    .filter(([, value]) => value > 0)
    .map(([label, value]) => `- ${label}: ${currency(value)}`)
    .join("\n");

  const tableText = input.tableLimit > 0
    ? `\nTabela/limite informado: ${input.tableName || "tabela manual"} em ${currency(input.tableLimit)}.${input.aboveTable ? " O valor sugerido supera a referência informada e exige fundamentação específica." : ""}`
    : "";

  const legalAidText = input.legalAid
    ? "\nFoi marcada justiça gratuita. Recomenda-se conferir a tabela aplicável ao ramo da justiça e fundamentar eventual pedido acima do limite informado."
    : "";

  return [
    "MEMÓRIA DE CÁLCULO DA PROPOSTA DE HONORÁRIOS",
    "",
    `Área/tipo de perícia: ${input.expertiseArea || "não informado"}.`,
    `Ramo da justiça: ${input.justiceBranch || "não informado"}.`,
    `Complexidade considerada: ${complexityLabels[input.complexity] || input.complexity || "não informada"}.`,
    "",
    "Composição das horas técnicas:",
    stageLines || "- Horas ainda não detalhadas.",
    "",
    `Total de horas do perito: ${input.baseHours.toLocaleString("pt-BR")} h × ${currency(input.technicalRate)} = ${currency(input.baseHours * input.technicalRate)}.`,
    input.assistantHours > 0 ? `Equipe/apoio auxiliar: ${input.assistantHours.toLocaleString("pt-BR")} h × ${currency(input.assistantRate)} = ${currency(input.assistantHours * input.assistantRate)}.` : "Equipe/apoio auxiliar: não informado.",
    `Honorários técnicos com ajustes: ${currency(input.professionalTotal)}.`,
    "",
    "Despesas operacionais estimadas:",
    expenseLines || "- Sem despesas diretas informadas.",
    `Total de despesas estimadas: ${currency(input.directExpensesTotal)}.`,
    "",
    `Total sugerido da proposta: ${currency(input.totalSuggested)}.`,
    `Depósito inicial sugerido (${input.advancePercentage.toLocaleString("pt-BR")}%): ${currency(input.advanceAmount)}.`,
    `Saldo sugerido após entrega/esclarecimentos: ${currency(input.totalSuggested - input.advanceAmount)}.`,
    tableText,
    legalAidText,
    input.customJustification ? `\nJustificativa complementar:\n${input.customJustification}` : "",
  ].filter(Boolean).join("\n");
}

export async function saveFeeCalculatorAction(processId: string, feeId: string | null, expenseId: string | null, formData: FormData) {
  const { organization, supabase, user, process } = await ensureProcess(processId);

  const stageHours = Object.fromEntries(stageFields.map(([key]) => [key, Math.max(0, decimal(formData, `hours_${key}`))])) as Record<string, number>;
  const baseHours = roundMoney(Object.values(stageHours).reduce((sum, value) => sum + value, 0));
  const technicalRate = Math.max(0, decimal(formData, "technical_hour_rate"));
  const assistantHours = Math.max(0, decimal(formData, "assistant_hours"));
  const assistantRate = Math.max(0, decimal(formData, "assistant_hour_rate"));
  const complexity = text(formData, "complexity") || "medium";
  const multiplier = complexityMultipliers[complexity] ?? 1;

  const technicalBase = roundMoney(baseHours * technicalRate);
  const assistantTotal = roundMoney(assistantHours * assistantRate);
  const baseProfessional = technicalBase + assistantTotal;
  const complexityAmount = roundMoney(baseProfessional * Math.max(0, multiplier - 1));
  const urgencyAmount = Math.max(0, decimal(formData, "urgency_amount"));
  const riskAmount = Math.max(0, decimal(formData, "risk_amount"));
  const manualAdjustment = Math.max(0, decimal(formData, "manual_adjustment"));
  const minimumFee = Math.max(0, decimal(formData, "minimum_fee"));
  const taxPercent = clamp(decimal(formData, "tax_percent"), 0, 100);

  const professionalBeforeTax = Math.max(minimumFee, baseProfessional + complexityAmount + urgencyAmount + riskAmount + manualAdjustment);
  const taxAmount = roundMoney(professionalBeforeTax * (taxPercent / 100));
  const professionalTotal = roundMoney(professionalBeforeTax + taxAmount);

  const totalKm = Math.max(0, decimal(formData, "total_km"));
  const kmRate = Math.max(0, decimal(formData, "km_rate"));
  const displacementAmount = roundMoney(totalKm * kmRate);
  const expenseItems: Record<string, number> = {
    "Deslocamento": displacementAmount,
  };
  for (const [field, label] of expenseFields) expenseItems[label] = Math.max(0, decimal(formData, field));
  const directExpensesTotal = roundMoney(Object.values(expenseItems).reduce((sum, value) => sum + value, 0));

  const totalSuggested = roundMoney(professionalTotal + directExpensesTotal);
  const advancePercentage = clamp(decimal(formData, "advance_percentage", 50), 0, 100);
  const advanceAmount = roundMoney(totalSuggested * (advancePercentage / 100));
  const tableLimit = Math.max(0, decimal(formData, "table_limit_amount"));
  const legalAid = formData.get("legal_aid") === "on" || formData.get("legal_aid") === "true";
  const tableName = text(formData, "applicable_table");
  const aboveTable = tableLimit > 0 && totalSuggested > tableLimit;
  const expertiseArea = text(formData, "calculator_expertise_area") || process.expertise_area || process.subject || "Perícia judicial";
  const justiceBranch = text(formData, "justice_branch") || process.court || "";
  const responsibilityType = text(formData, "responsibility_type") || (legalAid ? "legal_aid" : "not_defined");
  const responsibleParty = nullableText(formData, "responsible_party");
  const customJustification = nullableText(formData, "custom_justification");

  if (baseHours <= 0 && professionalTotal <= 0 && directExpensesTotal <= 0) {
    redirectProcessError(processId, "Informe horas, valor técnico ou despesas para calcular a proposta.");
  }

  const memoryText = buildFeeCalculatorMemory({
    expertiseArea,
    justiceBranch,
    legalAid,
    baseHours,
    technicalRate,
    assistantHours,
    assistantRate,
    complexity,
    professionalTotal,
    directExpensesTotal,
    totalSuggested,
    advancePercentage,
    advanceAmount,
    tableName,
    tableLimit,
    aboveTable,
    stageHours,
    expenseItems,
    customJustification,
  });

  const calculatorMetadata = {
    source: "fee_calculator",
    version: "0.9.7",
    calculator: {
      expertise_area: expertiseArea,
      justice_branch: justiceBranch,
      legal_aid: legalAid,
      applicable_table: tableName,
      table_limit_amount: tableLimit,
      above_table: aboveTable,
      responsibility_type: responsibilityType,
      responsible_party: responsibleParty,
      technical_hour_rate: technicalRate,
      assistant_hours: assistantHours,
      assistant_hour_rate: assistantRate,
      complexity,
      complexity_multiplier: multiplier,
      urgency_amount: urgencyAmount,
      risk_amount: riskAmount,
      manual_adjustment: manualAdjustment,
      minimum_fee: minimumFee,
      tax_percent: taxPercent,
      total_km: totalKm,
      km_rate: kmRate,
      stage_hours: stageHours,
      expenses: expenseItems,
      totals: {
        technical_base: technicalBase,
        assistant_total: assistantTotal,
        complexity_amount: complexityAmount,
        tax_amount: taxAmount,
        professional_total: professionalTotal,
        direct_expenses_total: directExpensesTotal,
        total_suggested: totalSuggested,
        advance_percentage: advancePercentage,
        advance_amount: advanceAmount,
      },
      custom_justification: customJustification,
      memory_text: memoryText,
    },
  };

  let targetFeeId = feeId || null;
  if (!targetFeeId) {
    const { data: existingFee } = await supabase
      .from("process_fees")
      .select("id")
      .eq("process_id", processId)
      .eq("organization_id", organization.id)
      .eq("is_primary", true)
      .neq("status", "cancelled")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    targetFeeId = existingFee?.id || null;
  }

  const feePayload = {
    organization_id: organization.id,
    process_id: processId,
    title: "Proposta de honorários calculada",
    fee_type: process.expertise_type === "technical_assistant" ? "technical_assistant" : process.expertise_type === "extrajudicial" ? "extrajudicial" : "judicial_expert",
    status: "proposal_draft",
    funding_mode: legalAid ? "legal_aid" : "court_deposit",
    responsibility_type: responsibilityType,
    responsible_party: responsibleParty,
    proposed_amount: totalSuggested,
    advance_percentage: advancePercentage,
    proposed_at: new Date().toISOString().slice(0, 10),
    notes: memoryText,
    metadata: calculatorMetadata,
    is_primary: true,
  };

  let feeError: { message?: string } | null = null;
  if (targetFeeId) {
    const result = await supabase
      .from("process_fees")
      .update(feePayload)
      .eq("id", targetFeeId)
      .eq("process_id", processId)
      .eq("organization_id", organization.id);
    feeError = result.error;
  } else {
    const result = await supabase.from("process_fees").insert({ ...feePayload, created_by: user.id, source_key: "fee_calculator_primary" });
    feeError = result.error;
  }
  if (feeError) redirectProcessError(processId, feeError.message || "Não foi possível salvar a proposta de honorários.");

  let targetExpenseId = expenseId || null;
  if (!targetExpenseId) {
    const { data: existingExpense } = await supabase
      .from("process_expenses")
      .select("id")
      .eq("process_id", processId)
      .eq("organization_id", organization.id)
      .contains("metadata", { source: "fee_calculator" })
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    targetExpenseId = existingExpense?.id || null;
  }

  const expensePayload = {
    organization_id: organization.id,
    process_id: processId,
    category: "other",
    description: "Despesas estimadas da proposta de honorários",
    expense_date: new Date().toISOString().slice(0, 10),
    quantity: 1,
    unit_amount: directExpensesTotal,
    payment_status: directExpensesTotal > 0 ? "planned" : "cancelled",
    is_estimated: true,
    is_reimbursable: true,
    reimbursement_status: directExpensesTotal > 0 ? "pending" : "denied",
    notes: "Registro gerado pela calculadora de honorários do processo.",
    metadata: calculatorMetadata,
  };

  let expenseError: { message?: string } | null = null;
  if (targetExpenseId) {
    const result = await supabase
      .from("process_expenses")
      .update(expensePayload)
      .eq("id", targetExpenseId)
      .eq("process_id", processId)
      .eq("organization_id", organization.id);
    expenseError = result.error;
  } else if (directExpensesTotal > 0) {
    const result = await supabase.from("process_expenses").insert({ ...expensePayload, created_by: user.id });
    expenseError = result.error;
  }
  if (expenseError) redirectProcessError(processId, expenseError.message || "A proposta foi calculada, mas não foi possível salvar as despesas estimadas.");

  await addActivity(supabase, {
    organizationId: organization.id,
    processId,
    userId: user.id,
    type: "fee_calculator_saved",
    description: "Calculadora de honorários atualizada.",
    metadata: {
      total_suggested: totalSuggested,
      professional_total: professionalTotal,
      direct_expenses_total: directExpensesTotal,
      base_hours: baseHours,
      process_number: process.process_number,
    },
  });

  refresh(processId);
  redirectProcessSuccess(processId, "Calculadora salva: honorários propostos e custos estimados atualizados no processo.");
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
  if (!hasPermission(organization.role, "finance:delete")) {
    redirect(`/honorarios/${processId}?error=${encodeURIComponent("Seu nivel de acesso nao permite excluir movimentacoes financeiras.")}`);
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
