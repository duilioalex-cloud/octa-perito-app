export const EXPENSE_CATEGORY_OPTIONS = [
  ["fuel", "Combustível"],
  ["toll", "Pedágio"],
  ["lodging", "Hospedagem"],
  ["meal", "Alimentação"],
  ["transport", "Transporte"],
  ["vehicle_rental", "Locação de veículo"],
  ["technical_assistant", "Assistente técnico / auxiliar"],
  ["equipment", "Equipamentos"],
  ["laboratory", "Laboratório"],
  ["drone", "Drone"],
  ["topography", "Topografia"],
  ["printing", "Impressão"],
  ["postage", "Correios"],
  ["fees", "Taxas"],
  ["other", "Outra despesa"],
] as const;

export const EXPENSE_PAYMENT_STATUS_OPTIONS = [
  ["planned", "Prevista"],
  ["pending", "Pendente"],
  ["paid", "Paga"],
  ["cancelled", "Cancelada"],
] as const;

export const REIMBURSEMENT_STATUS_OPTIONS = [
  ["not_applicable", "Não aplicável"],
  ["pending", "Pendente"],
  ["requested", "Solicitado"],
  ["approved", "Aprovado"],
  ["reimbursed", "Reembolsado"],
  ["denied", "Negado"],
] as const;

export const TRIP_STATUS_OPTIONS = [
  ["planned", "Planejado"],
  ["confirmed", "Confirmado"],
  ["completed", "Concluído"],
  ["cancelled", "Cancelado"],
] as const;

function findLabel(options: readonly (readonly [string, string])[], value?: string | null, fallback = "Não informado") {
  return options.find(([key]) => key === value)?.[1] ?? value ?? fallback;
}

export function expenseCategoryLabel(value?: string | null) {
  return findLabel(EXPENSE_CATEGORY_OPTIONS, value);
}

export function expensePaymentStatusLabel(value?: string | null) {
  return findLabel(EXPENSE_PAYMENT_STATUS_OPTIONS, value);
}

export function reimbursementStatusLabel(value?: string | null) {
  return findLabel(REIMBURSEMENT_STATUS_OPTIONS, value);
}

export function tripStatusLabel(value?: string | null) {
  return findLabel(TRIP_STATUS_OPTIONS, value);
}

export function expenseStatusClass(value?: string | null) {
  return `expense-status expense-status-${value || "pending"}`;
}

export function tripStatusClass(value?: string | null) {
  return `trip-status trip-status-${value || "planned"}`;
}
