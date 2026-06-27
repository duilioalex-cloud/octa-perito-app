export const BRASILIA_TIME_ZONE = "America/Sao_Paulo";

const BRASILIA_PARTS_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: BRASILIA_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function brDate(value: string) {
  return new Date(value.length <= 10 ? `${value.slice(0, 10)}T12:00:00-03:00` : value);
}

function partsInBrasilia(date: Date) {
  const entries = BRASILIA_PARTS_FORMATTER
    .formatToParts(date)
    .map((part) => [part.type, part.value]);
  const parts = Object.fromEntries(entries);
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour,
    minute: parts.minute,
  };
}

export function todayInBrasilia() {
  const parts = partsInBrasilia(new Date());
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function formatDateInBrasilia(value?: string | null, fallback = "Nao definido") {
  if (!value) return fallback;
  const date = brDate(value);
  return Number.isNaN(date.getTime())
    ? fallback
    : new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: BRASILIA_TIME_ZONE }).format(date);
}

export function formatDateTimeInBrasilia(value?: string | null, fallback = "Nao definido") {
  if (!value) return fallback;
  const date = brDate(value);
  return Number.isNaN(date.getTime())
    ? fallback
    : new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: BRASILIA_TIME_ZONE }).format(date);
}

export function formatLongDateInBrasilia(value?: string | null, fallback = "") {
  if (!value) return fallback;
  const date = brDate(value);
  return Number.isNaN(date.getTime())
    ? fallback
    : new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeZone: BRASILIA_TIME_ZONE }).format(date);
}

export function todayLongInBrasilia() {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeZone: BRASILIA_TIME_ZONE }).format(new Date());
}

export function formatTimeInBrasilia(value?: string | null, fallback = "") {
  if (!value) return fallback;
  const date = brDate(value);
  return Number.isNaN(date.getTime())
    ? fallback
    : new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: BRASILIA_TIME_ZONE }).format(date);
}

export function toBrasiliaDateTimeInput(value?: string | null) {
  if (!value) return "";
  const date = brDate(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = partsInBrasilia(date);
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function dateKeyInBrasilia(value?: string | null) {
  if (!value) return "";
  return toBrasiliaDateTimeInput(value).slice(0, 10);
}

export function brasiliaDateTimeLocalToIso(value: unknown) {
  const raw = typeof value === "string" ? value.trim() : String(value || "").trim();
  if (!raw) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(raw);
  if (match) {
    const [, year, month, day, hour, minute, second = "00"] = match;
    return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}-03:00`).toISOString();
  }
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function dateOnlyAtBrasiliaTimeToIso(value?: string | null, time = "18:00:00") {
  const day = String(value || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const normalizedTime = /^\d{2}:\d{2}$/.test(time) ? `${time}:00` : time;
  return brasiliaDateTimeLocalToIso(`${day}T${normalizedTime.slice(0, 8)}`);
}
