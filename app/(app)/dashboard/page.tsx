import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/current-organization";
import { hasPermission } from "@/lib/permissions";
import { eventTypeIcon, eventTypeLabel } from "@/lib/calendar-options";
import { formatDate, formatDateTime, PROCESS_STATUS_OPTIONS, priorityLabel, processStatusLabel } from "@/lib/process-options";

export const metadata = { title: "Painel operacional" };

type ProcessRow = {
  id: string;
  process_number: string;
  subject: string | null;
  status: string;
  priority: string;
  report_due_at: string | null;
  last_movement_at: string | null;
  created_at: string;
};

type RelatedProcess = { id?: string; process_number?: string | null } | null;

type EventRow = {
  id: string;
  process_id: string | null;
  title: string;
  event_type: string;
  status: string;
  priority: string;
  starts_at: string;
  location_name: string | null;
  city: string | null;
  processes: RelatedProcess | RelatedProcess[];
};

type ReportRow = {
  id: string;
  process_id: string;
  title: string;
  status: string;
  updated_at: string;
};

const completedStatuses = new Set(["delivered", "closed"]);
const reportWorkStatuses = new Set(["drafting", "clarifications"]);
const planningStatuses = new Set(["appointment_received", "analysis", "fees_proposed", "awaiting_decision", "awaiting_deposit"]);
const diligenceTypes = new Set(["diligence", "inspection"]);

function relatedProcess(value: EventRow["processes"]) {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function daysFromNow(value: string | null | undefined, reference: Date) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Math.ceil((date.getTime() - reference.getTime()) / 86400000);
}

function sortByRecentMovement(a: ProcessRow, b: ProcessRow) {
  const aDate = new Date(a.last_movement_at || a.created_at).getTime();
  const bDate = new Date(b.last_movement_at || b.created_at).getTime();
  return bDate - aDate;
}

export default async function DashboardPage() {
  const organization = await getCurrentOrganization();
  if (!organization) return null;

  const supabase = await createClient();
  const canViewFinance = hasPermission(organization.role, "finance:view");
  const now = new Date();
  const nextSeven = new Date(now.getTime() + 7 * 86400000);

  const [processesResult, reportsResult, eventsResult] = await Promise.all([
    supabase
      .from("processes")
      .select("id,process_number,subject,status,priority,report_due_at,last_movement_at,created_at")
      .eq("organization_id", organization.id)
      .order("last_movement_at", { ascending: false }),
    supabase
      .from("expert_reports")
      .select("id,process_id,title,status,updated_at")
      .eq("organization_id", organization.id)
      .order("updated_at", { ascending: false }),
    supabase
      .from("calendar_events")
      .select("id,process_id,title,event_type,status,priority,starts_at,location_name,city,processes(id,process_number)")
      .eq("organization_id", organization.id)
      .order("starts_at", { ascending: true }),
  ]);

  const processes = (processesResult.data ?? []) as ProcessRow[];
  const reports = (reportsResult.data ?? []) as ReportRow[];
  const events = (eventsResult.data ?? []) as EventRow[];
  const hasDataError = Boolean(processesResult.error || reportsResult.error || eventsResult.error);

  const completedProcesses = processes.filter((process) => completedStatuses.has(process.status)).sort(sortByRecentMovement);
  const activeProcesses = processes.filter((process) => !completedStatuses.has(process.status));
  const planningProcesses = activeProcesses.filter((process) => planningStatuses.has(process.status));
  const scheduledProcesses = activeProcesses.filter((process) => process.status === "scheduled");
  const reportWorkProcesses = activeProcesses.filter((process) => reportWorkStatuses.has(process.status));
  const urgentProcesses = activeProcesses.filter((process) => ["high", "urgent"].includes(process.priority));
  const reportsInProgress = reports.filter((report) => ["draft", "in_review"].includes(report.status));
  const reportWorkProcessIds = new Set([
    ...reportWorkProcesses.map((process) => process.id),
    ...reportsInProgress.map((report) => report.process_id),
  ]);

  const activeEvents = events.filter((event) => !["completed", "cancelled"].includes(event.status));
  const activeDiligences = activeEvents.filter((event) => diligenceTypes.has(event.event_type));
  const upcomingDiligences = activeDiligences.filter((event) => {
    const starts = new Date(event.starts_at);
    return starts >= now;
  });
  const weekDiligences = upcomingDiligences.filter((event) => new Date(event.starts_at) <= nextSeven);
  const overdueDiligences = activeDiligences.filter((event) => new Date(event.starts_at) < now);

  const reportDueSoon = activeProcesses.filter((process) => {
    const days = daysFromNow(process.report_due_at, now);
    return days !== null && days >= 0 && days <= 7;
  });
  const reportOverdue = activeProcesses.filter((process) => {
    const days = daysFromNow(process.report_due_at, now);
    return days !== null && days < 0;
  });

  const completionRate = processes.length ? Math.round((completedProcesses.length / processes.length) * 100) : 0;
  const statusItems = PROCESS_STATUS_OPTIONS.map(([status, label]) => ({
    status,
    label,
    value: processes.filter((process) => process.status === status).length,
  })).filter((item) => item.value > 0);

  const nextProcesses = [...activeProcesses].sort((a, b) => {
    const aDue = a.report_due_at ? new Date(a.report_due_at).getTime() : Number.MAX_SAFE_INTEGER;
    const bDue = b.report_due_at ? new Date(b.report_due_at).getTime() : Number.MAX_SAFE_INTEGER;
    if (aDue !== bDue) return aDue - bDue;
    return sortByRecentMovement(a, b);
  });

  return (
    <>
      <header className="page-header home-dashboard-header">
        <div>
          <p className="eyebrow">PAINEL OPERACIONAL</p>
          <h1>Pericias realizadas e a realizar</h1>
          <p>Visao inicial simples para acompanhar a carteira, proximas diligencias e laudos em andamento.</p>
        </div>
        <div className="header-actions">
          {canViewFinance && <Link className="button button-secondary" href="/financeiro">Financeiro</Link>}
          <Link className="button button-secondary" href="/agenda/novo">+ Agendar</Link>
          <Link className="button button-primary" href="/processos/novo">+ Nova pericia</Link>
        </div>
      </header>

      {hasDataError && <div className="notice notice-error">Alguns indicadores nao puderam ser carregados. Confira as migracoes do Supabase.</div>}

      <section className="stats-grid home-stats-grid">
        <Link className="card stat-card home-stat-card" href="/processos">
          <span>Pericias realizadas</span>
          <strong>{completedProcesses.length}</strong>
          <small>{completionRate}% da carteira cadastrada</small>
        </Link>
        <Link className="card stat-card home-stat-card" href="/processos">
          <span>Pericias a realizar</span>
          <strong>{activeProcesses.length}</strong>
          <small>{planningProcesses.length} em preparacao inicial</small>
        </Link>
        <Link className="card stat-card home-stat-card" href="/agenda">
          <span>Diligencias agendadas</span>
          <strong>{upcomingDiligences.length}</strong>
          <small>{weekDiligences.length} nos proximos 7 dias</small>
        </Link>
        <Link className="card stat-card home-stat-card" href="/laudos">
          <span>Laudos em elaboracao</span>
          <strong>{reportWorkProcessIds.size}</strong>
          <small>{reportDueSoon.length} com vencimento proximo</small>
        </Link>
      </section>

      <section className="home-dashboard-grid">
        <article className="card panel home-panel-main">
          <div className="panel-header">
            <div>
              <h2>Proximas pericias a realizar</h2>
              <p>Processos ativos priorizados por vencimento de laudo e movimentacao.</p>
            </div>
            <Link href="/processos">Ver processos</Link>
          </div>

          {!nextProcesses.length ? (
            <div className="empty-state home-empty-state"><strong>Nenhuma pericia pendente.</strong>A carteira ativa esta vazia.</div>
          ) : (
            <div className="home-process-list">
              {nextProcesses.slice(0, 7).map((process) => {
                const dueDays = daysFromNow(process.report_due_at, now);
                const isOverdue = dueDays !== null && dueDays < 0;
                return (
                  <Link className="home-process-row" href={`/processos/${process.id}`} key={process.id}>
                    <div>
                      <strong>{process.process_number}</strong>
                      <span>{process.subject || "Objeto nao informado"}</span>
                    </div>
                    <div>
                      <span>Etapa</span>
                      <b>{processStatusLabel(process.status)}</b>
                    </div>
                    <div>
                      <span>Prioridade</span>
                      <b>{priorityLabel(process.priority)}</b>
                    </div>
                    <div>
                      <span>Laudo</span>
                      <b className={isOverdue ? "metric-negative" : ""}>{formatDate(process.report_due_at)}</b>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </article>

        <aside className="home-side-stack">
          <article className="card panel">
            <div className="panel-header">
              <div>
                <h2>Resumo da carteira</h2>
                <p>Situacao atual sem indicadores financeiros.</p>
              </div>
            </div>
            <div className="home-summary-list">
              <div><span>Processos cadastrados</span><strong>{processes.length}</strong></div>
              <div><span>Em preparacao</span><strong>{planningProcesses.length}</strong></div>
              <div><span>Diligencia agendada</span><strong>{scheduledProcesses.length}</strong></div>
              <div><span>Alta prioridade</span><strong>{urgentProcesses.length}</strong></div>
              <div><span>Laudos vencidos</span><strong className={reportOverdue.length ? "metric-negative" : ""}>{reportOverdue.length}</strong></div>
              <div><span>Diligencias vencidas</span><strong className={overdueDiligences.length ? "metric-negative" : ""}>{overdueDiligences.length}</strong></div>
            </div>
          </article>

          <article className="card panel">
            <div className="panel-header">
              <div>
                <h2>Etapas da carteira</h2>
                <p>Distribuicao dos processos por status.</p>
              </div>
            </div>
            {!statusItems.length ? (
              <div className="empty-state home-empty-state"><strong>Nenhum processo cadastrado.</strong></div>
            ) : (
              <div className="home-status-list">
                {statusItems.map((item) => (
                  <div className="home-status-row" key={item.status}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
            )}
          </article>
        </aside>
      </section>

      <section className="home-dashboard-grid home-secondary-grid">
        <article className="card panel">
          <div className="panel-header">
            <div>
              <h2>Proximas diligencias</h2>
              <p>Atos periciais agendados a partir de hoje.</p>
            </div>
            <Link href="/agenda">Abrir agenda</Link>
          </div>
          {!upcomingDiligences.length ? (
            <div className="empty-state home-empty-state"><strong>Nenhuma diligencia futura agendada.</strong></div>
          ) : (
            <div className="home-event-list">
              {upcomingDiligences.slice(0, 5).map((event) => {
                const process = relatedProcess(event.processes);
                return (
                  <Link className="home-event-row" href={`/agenda/${event.id}`} key={event.id}>
                    <span className={`agenda-event-icon agenda-icon-${event.event_type}`}>{eventTypeIcon(event.event_type)}</span>
                    <div>
                      <strong>{event.title}</strong>
                      <span>{eventTypeLabel(event.event_type)}{process?.process_number ? ` - ${process.process_number}` : ""}</span>
                    </div>
                    <b>{formatDateTime(event.starts_at)}</b>
                  </Link>
                );
              })}
            </div>
          )}
        </article>

        <article className="card panel">
          <div className="panel-header">
            <div>
              <h2>Ultimas realizadas</h2>
              <p>Pericias entregues ou encerradas recentemente.</p>
            </div>
            <Link href="/processos">Historico</Link>
          </div>
          {!completedProcesses.length ? (
            <div className="empty-state home-empty-state"><strong>Nenhuma pericia realizada ainda.</strong></div>
          ) : (
            <div className="home-completed-list">
              {completedProcesses.slice(0, 5).map((process) => (
                <Link className="home-completed-row" href={`/processos/${process.id}`} key={process.id}>
                  <div>
                    <strong>{process.process_number}</strong>
                    <span>{process.subject || "Objeto nao informado"}</span>
                  </div>
                  <b>{processStatusLabel(process.status)}</b>
                </Link>
              ))}
            </div>
          )}
        </article>
      </section>
    </>
  );
}
