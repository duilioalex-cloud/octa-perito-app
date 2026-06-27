export const DASHBOARD_PERIOD_OPTIONS = [
  ["month", "Mês atual"],
  ["30d", "Últimos 30 dias"],
  ["90d", "Últimos 90 dias"],
  ["year", "Ano atual"],
  ["all", "Todo o período"],
] as const;

export type DashboardPeriod = (typeof DASHBOARD_PERIOD_OPTIONS)[number][0];

export function numberValue(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function dashboardPeriod(value?: string | null, reference = new Date()) {
  const key = DASHBOARD_PERIOD_OPTIONS.some(([option]) => option === value)
    ? (value as DashboardPeriod)
    : "month";

  const end = new Date(reference);
  let start: Date | null = null;

  if (key === "month") start = new Date(reference.getFullYear(), reference.getMonth(), 1);
  if (key === "30d") start = new Date(reference.getTime() - 29 * 86400000);
  if (key === "90d") start = new Date(reference.getTime() - 89 * 86400000);
  if (key === "year") start = new Date(reference.getFullYear(), 0, 1);

  return {
    key,
    label: DASHBOARD_PERIOD_OPTIONS.find(([option]) => option === key)?.[1] ?? "Mês atual",
    start,
    end,
  };
}

export function dateInPeriod(value: string | null | undefined, start: Date | null, end: Date) {
  if (!value) return false;
  const date = new Date(value.length <= 10 ? `${value.slice(0, 10)}T12:00:00` : value);
  if (Number.isNaN(date.getTime())) return false;
  if (start && date < start) return false;
  return date <= end;
}

export function formatPercent(value: number) {
  if (!Number.isFinite(value)) return "0%";
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

export function monthKey(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value.length <= 10 ? `${value.slice(0, 10)}T12:00:00` : value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function lastMonthBuckets(count = 6, reference = new Date()) {
  const formatter = new Intl.DateTimeFormat("pt-BR", { month: "short" });
  return Array.from({ length: count }, (_, index) => {
    const offset = count - index - 1;
    const date = new Date(reference.getFullYear(), reference.getMonth() - offset, 1);
    return {
      key: monthKey(date),
      label: formatter.format(date).replace(".", ""),
      revenue: 0,
      cost: 0,
    };
  });
}

export function daysFromNow(value: string | null | undefined, reference = new Date()) {
  if (!value) return null;
  const date = new Date(value.length <= 10 ? `${value.slice(0, 10)}T12:00:00` : value);
  if (Number.isNaN(date.getTime())) return null;
  return Math.ceil((date.getTime() - reference.getTime()) / 86400000);
}
