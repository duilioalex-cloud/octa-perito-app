export const PROCESS_STATUS_OPTIONS = [
  ["appointment_received", "Nomeação recebida"],
  ["analysis", "Em análise"],
  ["fees_proposed", "Honorários propostos"],
  ["awaiting_decision", "Aguardando decisão"],
  ["awaiting_deposit", "Aguardando depósito"],
  ["scheduled", "Diligência agendada"],
  ["drafting", "Laudo em elaboração"],
  ["delivered", "Laudo entregue"],
  ["clarifications", "Esclarecimentos"],
  ["closed", "Encerrado"],
] as const;

export const EXPERTISE_TYPE_OPTIONS = [
  ["judicial_expert", "Perito judicial"],
  ["technical_assistant", "Assistente técnico"],
  ["extrajudicial", "Perícia extrajudicial"],
] as const;

export const PRIORITY_OPTIONS = [
  ["low", "Baixa"],
  ["normal", "Normal"],
  ["high", "Alta"],
  ["urgent", "Urgente"],
] as const;

export const DEADLINE_CATEGORY_OPTIONS = [
  ["manifestation", "Manifestação"],
  ["fees", "Honorários"],
  ["diligence", "Diligência"],
  ["report", "Laudo"],
  ["clarification", "Esclarecimentos"],
  ["other", "Outro"],
] as const;

export function processStatusLabel(value?: string | null) {
  return PROCESS_STATUS_OPTIONS.find(([key]) => key === value)?.[1] ?? value ?? "Não informado";
}

export function expertiseTypeLabel(value?: string | null) {
  return EXPERTISE_TYPE_OPTIONS.find(([key]) => key === value)?.[1] ?? value ?? "Não informado";
}

export function priorityLabel(value?: string | null) {
  return PRIORITY_OPTIONS.find(([key]) => key === value)?.[1] ?? value ?? "Normal";
}

export function deadlineCategoryLabel(value?: string | null) {
  return DEADLINE_CATEGORY_OPTIONS.find(([key]) => key === value)?.[1] ?? value ?? "Outro";
}

export function formatCurrency(value?: number | string | null) {
  const amount = typeof value === "number" ? value : Number(value ?? 0);
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number.isFinite(amount) ? amount : 0);
}

export function formatDate(value?: string | null) {
  if (!value) return "Não definido";
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime()) ? "Não definido" : date.toLocaleDateString("pt-BR");
}

export function formatDateTime(value?: string | null) {
  if (!value) return "Não definido";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Não definido"
    : date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function toDateTimeLocal(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}
