export const EVENT_TYPE_OPTIONS = [
  ["diligence", "Diligência pericial"],
  ["inspection", "Vistoria técnica"],
  ["meeting", "Reunião"],
  ["report_due", "Entrega de laudo"],
  ["clarification_due", "Prazo de esclarecimentos"],
  ["manifestation_due", "Prazo de manifestação"],
  ["hearing", "Audiência"],
  ["financial_due", "Vencimento financeiro"],
  ["personal", "Compromisso particular"],
  ["other", "Outro compromisso"],
] as const;

export const EVENT_STATUS_OPTIONS = [
  ["scheduled", "Agendado"],
  ["confirmed", "Confirmado"],
  ["pending", "Pendente"],
  ["completed", "Realizado"],
  ["rescheduled", "Reagendado"],
  ["cancelled", "Cancelado"],
] as const;

export const ATTENDANCE_STATUS_OPTIONS = [
  ["invited", "Convidado"],
  ["confirmed", "Confirmado"],
  ["declined", "Recusou"],
  ["attended", "Compareceu"],
  ["absent", "Ausente"],
] as const;

const typeMap = new Map<string, string>(EVENT_TYPE_OPTIONS);
const statusMap = new Map<string, string>(EVENT_STATUS_OPTIONS);
const attendanceMap = new Map<string, string>(ATTENDANCE_STATUS_OPTIONS);

export function eventTypeLabel(value?: string | null) {
  return typeMap.get(value || "") || "Outro compromisso";
}

export function eventStatusLabel(value?: string | null) {
  return statusMap.get(value || "") || "Agendado";
}

export function attendanceStatusLabel(value?: string | null) {
  return attendanceMap.get(value || "") || "Convidado";
}

export function eventTypeIcon(value?: string | null) {
  switch (value) {
    case "diligence": return "⌖";
    case "inspection": return "◎";
    case "meeting": return "◫";
    case "report_due": return "▤";
    case "clarification_due": return "?";
    case "manifestation_due": return "✎";
    case "hearing": return "⚖";
    case "financial_due": return "◇";
    case "personal": return "●";
    default: return "•";
  }
}

export function eventStatusClass(value?: string | null) {
  return `calendar-status calendar-status-${value || "scheduled"}`;
}

export function alertLevelFor(startsAt: string, status?: string | null, reference = new Date()) {
  if (["completed", "cancelled"].includes(status || "")) return "none";
  const start = new Date(startsAt);
  if (Number.isNaN(start.getTime())) return "future";
  const diff = start.getTime() - reference.getTime();
  if (diff < 0) return "overdue";
  if (diff <= 24 * 60 * 60 * 1000) return "today";
  if (diff <= 3 * 24 * 60 * 60 * 1000) return "next_3_days";
  if (diff <= 7 * 24 * 60 * 60 * 1000) return "next_7_days";
  return "future";
}

export function alertLevelLabel(value: string) {
  switch (value) {
    case "overdue": return "Vencido";
    case "today": return "Hoje / próximas 24h";
    case "next_3_days": return "Próximos 3 dias";
    case "next_7_days": return "Próximos 7 dias";
    default: return "Futuro";
  }
}

export function alertLevelClass(value: string) {
  return `alert-chip alert-chip-${value}`;
}

export function reverseDeadlineCategory(eventType: string) {
  switch (eventType) {
    case "diligence":
    case "inspection": return "diligence";
    case "report_due": return "report";
    case "clarification_due": return "clarification";
    case "manifestation_due": return "manifestation";
    case "financial_due": return "fees";
    default: return "other";
  }
}
