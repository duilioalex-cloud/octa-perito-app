export const FEE_STATUS_OPTIONS = [
  ["not_defined", "Não definido"],
  ["proposal_draft", "Proposta em elaboração"],
  ["proposal_submitted", "Proposta apresentada"],
  ["awaiting_approval", "Aguardando homologação"],
  ["approved", "Homologado"],
  ["awaiting_deposit", "Aguardando depósito"],
  ["partially_deposited", "Parcialmente depositado"],
  ["fully_deposited", "Integralmente depositado"],
  ["release_requested", "Levantamento solicitado"],
  ["partially_released", "Parcialmente levantado"],
  ["fully_released", "Integralmente levantado"],
  ["cancelled", "Cancelado"],
] as const;

export const FEE_TYPE_OPTIONS = [
  ["judicial_expert", "Perito judicial"],
  ["technical_assistant", "Assistente técnico"],
  ["extrajudicial", "Perícia extrajudicial"],
  ["supplemental", "Honorários complementares"],
  ["other", "Outro"],
] as const;

export const FUNDING_MODE_OPTIONS = [
  ["court_deposit", "Depósito judicial"],
  ["legal_aid", "Assistência judiciária / Sistema AJ"],
  ["direct_payment", "Pagamento direto"],
  ["contract", "Contrato particular"],
  ["mixed", "Custeio misto"],
  ["other", "Outro"],
] as const;

export const RESPONSIBILITY_OPTIONS = [
  ["not_defined", "Não definido"],
  ["court", "Juízo / Tribunal"],
  ["plaintiff", "Parte autora"],
  ["defendant", "Parte ré"],
  ["both_parties", "Ambas as partes"],
  ["legal_aid", "Assistência judiciária"],
  ["client", "Cliente particular"],
  ["other", "Outro"],
] as const;

export const TRANSACTION_TYPE_OPTIONS = [
  ["deposit", "Depósito"],
  ["release", "Levantamento"],
  ["refund", "Devolução"],
  ["adjustment", "Ajuste de saldo"],
] as const;

export const TRANSACTION_STATUS_OPTIONS = [
  ["planned", "Previsto"],
  ["pending", "Pendente"],
  ["confirmed", "Confirmado"],
  ["cancelled", "Cancelado"],
] as const;

function findLabel(options: readonly (readonly [string, string])[], value?: string | null, fallback = "Não informado") {
  return options.find(([key]) => key === value)?.[1] ?? value ?? fallback;
}

export function feeStatusLabel(value?: string | null) {
  return findLabel(FEE_STATUS_OPTIONS, value, "Não definido");
}

export function feeTypeLabel(value?: string | null) {
  return findLabel(FEE_TYPE_OPTIONS, value);
}

export function fundingModeLabel(value?: string | null) {
  return findLabel(FUNDING_MODE_OPTIONS, value);
}

export function responsibilityLabel(value?: string | null) {
  return findLabel(RESPONSIBILITY_OPTIONS, value, "Não definido");
}

export function transactionTypeLabel(value?: string | null) {
  return findLabel(TRANSACTION_TYPE_OPTIONS, value);
}

export function transactionStatusLabel(value?: string | null) {
  return findLabel(TRANSACTION_STATUS_OPTIONS, value);
}

export function financeStatusClass(value?: string | null) {
  return `finance-status finance-status-${value || "not_defined"}`;
}

export function moneyInputValue(value?: number | string | null) {
  const amount = typeof value === "number" ? value : Number(value ?? 0);
  if (!Number.isFinite(amount) || amount === 0) return "";
  return amount.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
