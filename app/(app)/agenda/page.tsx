import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/current-organization";
import { hasPermission } from "@/lib/permissions";
import { alertLevelClass, alertLevelFor, alertLevelLabel, eventStatusClass, eventStatusLabel, eventTypeIcon, eventTypeLabel, EVENT_STATUS_OPTIONS, EVENT_TYPE_OPTIONS } from "@/lib/calendar-options";
import { formatDateTime, priorityLabel } from "@/lib/process-options";

export const metadata = { title: "Agenda pericial" };

type CalendarEvent = {
  id: string;
  process_id: string | null;
  title: string;
  event_type: string;
  status: string;
  priority: string;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
  location_name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  responsible_name: string | null;
  processes: { id: string; process_number: string; subject: string | null } | { id: string; process_number: string; subject: string | null }[] | null;
};

function startOfMonth(value: string | undefined) {
  const match = /^(\d{4})-(\d{2})$/.exec(value || "");
  const now = new Date();
  const year = match ? Number(match[1]) : now.getFullYear();
  const month = match ? Number(match[2]) - 1 : now.getMonth();
  return new Date(year, month, 1, 0, 0, 0, 0);
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthTitle(date: Date) {
  const title = date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return title.charAt(0).toUpperCase() + title.slice(1);
}

function dateKey(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function relatedProcess(event: CalendarEvent) {
  return Array.isArray(event.processes) ? event.processes[0] : event.processes;
}

function buildCalendarDays(monthStart: Date) {
  const first = new Date(monthStart);
  const offset = first.getDay();
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - offset);
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return date;
  });
}

export default async function AgendaPage({ searchParams }: { searchParams: Promise<{ month?: string; q?: string; type?: string; status?: string; success?: string; error?: string }> }) {
  const query = await searchParams;
  const organization = await getCurrentOrganization();
  if (!organization) return null;
  const canCreateEvent = hasPermission(organization.role, "calendar:write");
  const supabase = await createClient();
  const monthStart = startOfMonth(query.month);
  const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);
  const previousMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1);
  const nextMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);
  const now = new Date();
  const sevenDays = new Date(now.getTime() + 7 * 86400000);

  const [{ data: monthEvents, error }, { data: activeAlerts }] = await Promise.all([
    supabase
      .from("calendar_events")
      .select("id,process_id,title,event_type,status,priority,starts_at,ends_at,all_day,location_name,address,city,state,responsible_name,processes(id,process_number,subject)")
      .eq("organization_id", organization.id)
      .gte("starts_at", monthStart.toISOString())
      .lt("starts_at", monthEnd.toISOString())
      .order("starts_at", { ascending: true }),
    supabase
      .from("calendar_events")
      .select("id,status,starts_at,event_type,address,city")
      .eq("organization_id", organization.id)
      .not("status", "in", "(completed,cancelled)")
      .lte("starts_at", sevenDays.toISOString()),
  ]);

  const search = (query.q || "").trim().toLocaleLowerCase("pt-BR");
  const filtered = ((monthEvents || []) as CalendarEvent[]).filter((event) => {
    const process = relatedProcess(event);
    const haystack = `${event.title} ${event.location_name || ""} ${event.city || ""} ${process?.process_number || ""} ${process?.subject || ""}`.toLocaleLowerCase("pt-BR");
    return (!search || haystack.includes(search))
      && (!query.type || query.type === "all" || event.event_type === query.type)
      && (!query.status || query.status === "all" || event.status === query.status);
  });

  const eventsByDate = new Map<string, CalendarEvent[]>();
  for (const event of filtered) {
    const key = dateKey(event.starts_at);
    eventsByDate.set(key, [...(eventsByDate.get(key) || []), event]);
  }

  const alertRows = (activeAlerts || []) as { id: string; status: string; starts_at: string; event_type: string; address: string | null; city: string | null }[];
  const overdue = alertRows.filter((item) => alertLevelFor(item.starts_at, item.status, now) === "overdue").length;
  const today = alertRows.filter((item) => alertLevelFor(item.starts_at, item.status, now) === "today").length;
  const nextSeven = alertRows.filter((item) => ["today", "next_3_days", "next_7_days"].includes(alertLevelFor(item.starts_at, item.status, now))).length;
  const unconfirmed = alertRows.filter((item) => ["diligence", "inspection", "hearing"].includes(item.event_type) && ["scheduled", "pending"].includes(item.status)).length;
  const calendarDays = buildCalendarDays(monthStart);
  const todayKey = dateKey(now);

  return (
    <>
      <header className="page-header">
        <div><p className="eyebrow">ORGANIZAÇÃO PERICIAL</p><h1>Agenda pericial</h1><p>Diligências, vistorias, audiências, prazos e vencimentos vinculados aos processos.</p></div>
        <div className="header-actions"><Link className="button button-secondary" href="/alertas">Central de alertas</Link>{canCreateEvent && <Link className="button button-primary" href="/agenda/novo">+ Novo compromisso</Link>}</div>
      </header>

      {query.success && <div className="notice notice-success">{query.success}</div>}
      {query.error && <div className="notice notice-error">{query.error}</div>}
      {error && <div className="notice notice-error">Não foi possível consultar a agenda. Confirme se as migrações 007 e 009 foram executadas.</div>}

      <section className="stats-grid agenda-stats-grid">
        <article className="card stat-card"><span>Compromissos vencidos</span><strong>{overdue}</strong><small>Exigem regularização ou conclusão</small></article>
        <article className="card stat-card"><span>Hoje / próximas 24h</span><strong>{today}</strong><small>Prioridade operacional imediata</small></article>
        <article className="card stat-card"><span>Próximos 7 dias</span><strong>{nextSeven}</strong><small>Compromissos ativos no período</small></article>
        <article className="card stat-card"><span>Aguardando confirmação</span><strong>{unconfirmed}</strong><small>Diligências, vistorias e audiências</small></article>
      </section>

      <section className="card panel agenda-filter-card">
        <form className="filter-form agenda-filter-form" method="get">
          <input type="hidden" name="month" value={monthKey(monthStart)} />
          <label className="field filter-grow"><span>Pesquisar</span><input className="input" name="q" defaultValue={query.q || ""} placeholder="Título, processo, local ou objeto" /></label>
          <label className="field"><span>Tipo</span><select className="select" name="type" defaultValue={query.type || "all"}><option value="all">Todos</option>{EVENT_TYPE_OPTIONS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
          <label className="field"><span>Status</span><select className="select" name="status" defaultValue={query.status || "all"}><option value="all">Todos</option>{EVENT_STATUS_OPTIONS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
          <button className="button button-secondary" type="submit">Filtrar</button>
          {(query.q || (query.type && query.type !== "all") || (query.status && query.status !== "all")) && <Link className="button button-ghost" href={`/agenda?month=${monthKey(monthStart)}`}>Limpar</Link>}
        </form>
      </section>

      <section className="card panel agenda-calendar-panel">
        <div className="agenda-month-header">
          <Link className="button button-ghost button-small" href={`/agenda?month=${monthKey(previousMonth)}`}>← Mês anterior</Link>
          <div><h2>{monthTitle(monthStart)}</h2><span>{filtered.length} compromisso(s) exibido(s)</span></div>
          <Link className="button button-ghost button-small" href={`/agenda?month=${monthKey(nextMonth)}`}>Próximo mês →</Link>
        </div>
        <div className="calendar-weekdays">{["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => <span key={day}>{day}</span>)}</div>
        <div className="calendar-month-grid">
          {calendarDays.map((day) => {
            const key = dateKey(day);
            const dayEvents = eventsByDate.get(key) || [];
            const outside = day.getMonth() !== monthStart.getMonth();
            return (
              <article className={`calendar-day${outside ? " calendar-day-outside" : ""}${key === todayKey ? " calendar-day-today" : ""}`} key={key}>
                <div className="calendar-day-number"><span>{day.getDate()}</span>{dayEvents.length > 0 && <small>{dayEvents.length}</small>}</div>
                <div className="calendar-day-events">
                  {dayEvents.slice(0, 3).map((event) => <Link className={`calendar-mini-event calendar-mini-${event.event_type}`} href={`/agenda/${event.id}`} key={event.id}><i>{eventTypeIcon(event.event_type)}</i><span>{event.title}</span><b>{new Date(event.starts_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</b></Link>)}
                  {dayEvents.length > 3 && <span className="calendar-more">+ {dayEvents.length - 3} compromisso(s)</span>}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="card panel agenda-list-panel">
        <div className="panel-header"><h2>Lista operacional do mês</h2><span>{filtered.length} item(ns)</span></div>
        {!filtered.length ? <div className="empty-state"><strong>Nenhum compromisso encontrado.</strong>Cadastre um compromisso ou ajuste os filtros.</div> : (
          <div className="agenda-event-list">
            {filtered.map((event) => {
              const process = relatedProcess(event);
              const alert = alertLevelFor(event.starts_at, event.status, now);
              return (
                <Link className="agenda-event-row" href={`/agenda/${event.id}`} key={event.id}>
                  <div className={`agenda-event-icon agenda-icon-${event.event_type}`}>{eventTypeIcon(event.event_type)}</div>
                  <div className="agenda-event-main"><strong>{event.title}</strong><span>{eventTypeLabel(event.event_type)}{process ? ` · ${process.process_number}` : ""}</span><small>{event.location_name || event.address || [event.city, event.state].filter(Boolean).join("/") || "Local não informado"}</small></div>
                  <div><span>Data e hora</span><strong>{formatDateTime(event.starts_at)}</strong>{event.ends_at && <small>até {formatDateTime(event.ends_at)}</small>}</div>
                  <div><span>Responsável</span><strong>{event.responsible_name || "Não informado"}</strong><small>{priorityLabel(event.priority)}</small></div>
                  <div><span>Status</span><b className={eventStatusClass(event.status)}>{eventStatusLabel(event.status)}</b>{alert !== "future" && alert !== "none" && <small className={alertLevelClass(alert)}>{alertLevelLabel(alert)}</small>}</div>
                  <div className="finance-row-arrow" aria-hidden="true">›</div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
