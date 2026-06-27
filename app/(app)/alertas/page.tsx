import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/current-organization";
import { saveNotificationPreferencesAction } from "@/app/actions/calendar";
import { SubmitButton } from "@/components/submit-button";
import { alertLevelClass, alertLevelFor, alertLevelLabel, eventTypeIcon, eventTypeLabel } from "@/lib/calendar-options";
import { formatCurrency, formatDateTime } from "@/lib/process-options";

export const metadata = { title: "Central de alertas" };

type AlertEvent = {
  id: string;
  process_id: string | null;
  title: string;
  event_type: string;
  status: string;
  priority: string;
  starts_at: string;
  address: string | null;
  city: string | null;
  location_name: string | null;
  processes: { id: string; process_number: string; subject: string | null } | { id: string; process_number: string; subject: string | null }[] | null;
};

function relatedProcess(event: AlertEvent) {
  return Array.isArray(event.processes) ? event.processes[0] : event.processes;
}

export default async function AlertsPage({ searchParams }: { searchParams: Promise<{ success?: string; error?: string }> }) {
  const query = await searchParams;
  const organization = await getCurrentOrganization();
  if (!organization) return null;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const now = new Date();
  const horizon = new Date(now.getTime() + 30 * 86400000);
  const [{ data: events }, { data: fees }, { data: expenses }, { data: preferences }] = await Promise.all([
    supabase.from("calendar_events").select("id,process_id,title,event_type,status,priority,starts_at,address,city,location_name,processes(id,process_number,subject)").eq("organization_id", organization.id).not("status", "in", "(completed,cancelled)").lte("starts_at", horizon.toISOString()).order("starts_at"),
    supabase.from("process_fees").select("id,process_id,title,status,approved_amount,processes(id,process_number,subject)").eq("organization_id", organization.id).in("status", ["proposal_submitted", "awaiting_approval", "approved", "awaiting_deposit", "partially_deposited", "release_requested", "partially_released"]).order("updated_at", { ascending: false }).limit(30),
    supabase.from("process_expenses").select("id,process_id,description,total_amount,reimbursement_status,processes(id,process_number,subject)").eq("organization_id", organization.id).eq("is_reimbursable", true).in("reimbursement_status", ["pending", "requested", "approved"]).order("expense_date", { ascending: false }).limit(30),
    supabase.from("notification_preferences").select("*").eq("organization_id", organization.id).eq("user_id", user.id).maybeSingle(),
  ]);

  const eventRows = (events || []) as AlertEvent[];
  const grouped = {
    overdue: eventRows.filter((event) => alertLevelFor(event.starts_at, event.status, now) === "overdue"),
    today: eventRows.filter((event) => alertLevelFor(event.starts_at, event.status, now) === "today"),
    next3: eventRows.filter((event) => alertLevelFor(event.starts_at, event.status, now) === "next_3_days"),
    next7: eventRows.filter((event) => alertLevelFor(event.starts_at, event.status, now) === "next_7_days"),
  };
  const missingAddress = eventRows.filter((event) => ["diligence", "inspection", "hearing"].includes(event.event_type) && !event.address && !event.location_name && !event.city);
  const awaitingConfirmation = eventRows.filter((event) => ["diligence", "inspection", "hearing"].includes(event.event_type) && ["scheduled", "pending"].includes(event.status) && ["today", "next_3_days"].includes(alertLevelFor(event.starts_at, event.status, now)));
  const activeCalendarAlerts = grouped.overdue.length + grouped.today.length + grouped.next3.length + grouped.next7.length;
  const financialAlerts = (fees?.length || 0) + (expenses?.length || 0);

  const pref = preferences || {
    timezone: "America/Sao_Paulo",
    in_app_enabled: true,
    email_enabled: true,
    daily_digest_enabled: true,
    daily_digest_time: "08:00",
    deadline_alert_days: [7, 3, 1, 0],
    event_alert_minutes: [1440, 180],
    fee_alerts_enabled: true,
    expense_alerts_enabled: true,
    overdue_alerts_enabled: true,
  };

  return (
    <>
      <header className="page-header">
        <div><p className="eyebrow">CENTRAL OPERACIONAL</p><h1>Alertas e pendências</h1><p>Priorize prazos, diligências, honorários e reembolsos que exigem ação.</p></div>
        <div className="header-actions"><Link className="button button-secondary" href="/agenda">Abrir agenda</Link><Link className="button button-primary" href="/agenda/novo">+ Novo compromisso</Link></div>
      </header>

      {query.success && <div className="notice notice-success">{query.success}</div>}
      {query.error && <div className="notice notice-error">{query.error}</div>}

      <section className="stats-grid alert-stats-grid">
        <article className="card stat-card"><span>Alertas de agenda</span><strong>{activeCalendarAlerts}</strong><small>Até os próximos 7 dias</small></article>
        <article className="card stat-card"><span>Vencidos</span><strong>{grouped.overdue.length}</strong><small>Compromissos ainda não concluídos</small></article>
        <article className="card stat-card"><span>Pendências financeiras</span><strong>{financialAlerts}</strong><small>Honorários e reembolsos</small></article>
        <article className="card stat-card"><span>Dados operacionais incompletos</span><strong>{missingAddress.length + awaitingConfirmation.length}</strong><small>Endereço ou confirmação pendente</small></article>
      </section>

      <section className="dashboard-grid alert-main-grid">
        <div className="alert-column-stack">
          <AlertGroup title="Vencidos" description="Compromissos cuja data já passou e ainda estão ativos." events={grouped.overdue} level="overdue" />
          <AlertGroup title="Hoje / próximas 24 horas" description="Itens que exigem atenção imediata." events={grouped.today} level="today" />
          <AlertGroup title="Próximos 3 dias" description="Antecipe documentos, deslocamentos e confirmações." events={grouped.next3} level="next_3_days" />
          <AlertGroup title="Próximos 7 dias" description="Planejamento operacional da semana." events={grouped.next7} level="next_7_days" />
        </div>

        <aside className="process-side-stack">
          <article className="card panel">
            <div className="panel-header"><h2>Pendências operacionais</h2></div>
            <div className="alert-check-list">
              <div><span>Eventos sem endereço/local</span><strong>{missingAddress.length}</strong></div>
              <div><span>Diligências aguardando confirmação</span><strong>{awaitingConfirmation.length}</strong></div>
              <div><span>Honorários pendentes</span><strong>{fees?.length || 0}</strong></div>
              <div><span>Reembolsos pendentes</span><strong>{expenses?.length || 0}</strong></div>
            </div>
          </article>

          <article className="card panel">
            <div className="panel-header"><h2>Preferências de alerta</h2></div>
            <form className="form-stack compact-form" action={saveNotificationPreferencesAction}>
              <label className="field"><span>Fuso horário</span><input className="input" name="timezone" defaultValue={pref.timezone} /></label>
              <label className="field"><span>Horário do resumo diário</span><input className="input" name="daily_digest_time" type="time" defaultValue={String(pref.daily_digest_time || "08:00").slice(0, 5)} /></label>
              <label className="field"><span>Dias antes dos prazos</span><input className="input" name="deadline_alert_days" defaultValue={(pref.deadline_alert_days || [7, 3, 1, 0]).join(",")} /></label>
              <label className="field"><span>Minutos antes dos eventos</span><input className="input" name="event_alert_minutes" defaultValue={(pref.event_alert_minutes || [1440, 180]).join(",")} /></label>
              <label className="check-line"><input name="in_app_enabled" type="checkbox" defaultChecked={pref.in_app_enabled} /> Alertas dentro do sistema</label>
              <label className="check-line"><input name="email_enabled" type="checkbox" defaultChecked={pref.email_enabled} /> Alertas por e-mail</label>
              <label className="check-line"><input name="daily_digest_enabled" type="checkbox" defaultChecked={pref.daily_digest_enabled} /> Resumo diário</label>
              <label className="check-line"><input name="fee_alerts_enabled" type="checkbox" defaultChecked={pref.fee_alerts_enabled} /> Alertas de honorários</label>
              <label className="check-line"><input name="expense_alerts_enabled" type="checkbox" defaultChecked={pref.expense_alerts_enabled} /> Alertas de despesas</label>
              <label className="check-line"><input name="overdue_alerts_enabled" type="checkbox" defaultChecked={pref.overdue_alerts_enabled} /> Alertas de vencidos</label>
              <SubmitButton pendingText="Salvando...">Salvar preferências</SubmitButton>
              <p className="settings-note">Nesta versão, os alertas são exibidos dentro do OCTA Perito. As preferências de e-mail ficam preparadas para a automação de envio da etapa seguinte.</p>
            </form>
          </article>
        </aside>
      </section>

      <section className="dashboard-grid financial-alert-grid">
        <article className="card panel">
          <div className="panel-header"><h2>Honorários com pendência</h2><Link href="/honorarios">Abrir honorários</Link></div>
          {!fees?.length ? <div className="empty-state"><strong>Nenhuma pendência de honorários localizada.</strong></div> : <div className="alert-financial-list">{fees.map((fee) => {
            const process = Array.isArray(fee.processes) ? fee.processes[0] : fee.processes;
            return <Link href={`/honorarios/${fee.process_id}`} className="alert-financial-row" key={fee.id}><div><strong>{process?.process_number || fee.title}</strong><span>{fee.title}</span></div><div><span>Status</span><strong>{fee.status}</strong></div><div><span>Homologado</span><strong>{formatCurrency(fee.approved_amount)}</strong></div><b>›</b></Link>;
          })}</div>}
        </article>

        <article className="card panel">
          <div className="panel-header"><h2>Reembolsos pendentes</h2><Link href="/despesas">Abrir despesas</Link></div>
          {!expenses?.length ? <div className="empty-state"><strong>Nenhum reembolso pendente.</strong></div> : <div className="alert-financial-list">{expenses.map((expense) => {
            const process = Array.isArray(expense.processes) ? expense.processes[0] : expense.processes;
            return <Link href={`/despesas/${expense.process_id}`} className="alert-financial-row" key={expense.id}><div><strong>{process?.process_number || "Processo"}</strong><span>{expense.description}</span></div><div><span>Status</span><strong>{expense.reimbursement_status}</strong></div><div><span>Valor</span><strong>{formatCurrency(expense.total_amount)}</strong></div><b>›</b></Link>;
          })}</div>}
        </article>
      </section>
    </>
  );
}

function AlertGroup({ title, description, events, level }: { title: string; description: string; events: AlertEvent[]; level: string }) {
  return (
    <article className="card panel alert-group-card">
      <div className="panel-header"><div><h2>{title}</h2><p>{description}</p></div><span className={alertLevelClass(level)}>{events.length}</span></div>
      {!events.length ? <div className="empty-state alert-empty"><strong>Nenhum item nesta faixa.</strong></div> : (
        <div className="alert-event-list">
          {events.map((event) => {
            const process = relatedProcess(event);
            return <Link className="alert-event-row" href={`/agenda/${event.id}`} key={event.id}><div className={`agenda-event-icon agenda-icon-${event.event_type}`}>{eventTypeIcon(event.event_type)}</div><div><strong>{event.title}</strong><span>{eventTypeLabel(event.event_type)}{process ? ` · ${process.process_number}` : ""}</span><small>{event.location_name || event.address || event.city || "Local não informado"}</small></div><div><span>{alertLevelLabel(level)}</span><strong>{formatDateTime(event.starts_at)}</strong></div><b>›</b></Link>;
          })}
        </div>
      )}
    </article>
  );
}
