import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/current-organization";
import { eventTypeIcon, eventTypeLabel } from "@/lib/calendar-options";
import { formatCurrency, formatDateTime, processStatusLabel } from "@/lib/process-options";

export const metadata = { title: "Visão geral" };

export default async function DashboardPage() {
  const organization = await getCurrentOrganization();
  if (!organization) return null;
  const supabase = await createClient();
  const nowDate = new Date();
  const now = nowDate.toISOString();
  const nextSeven = new Date(nowDate.getTime() + 7 * 86400000).toISOString();

  const [
    { count: activeCount },
    { count: overdueCount },
    { data: financialProcesses },
    { count: templateCount },
    { data: latestProcesses },
    { data: upcomingEvents },
    { count: alertCount },
  ] = await Promise.all([
    supabase.from("processes").select("id", { count: "exact", head: true }).eq("organization_id", organization.id).neq("status", "closed"),
    supabase.from("calendar_events").select("id", { count: "exact", head: true }).eq("organization_id", organization.id).not("status", "in", "(completed,cancelled)").lt("starts_at", now),
    supabase.from("processes").select("fee_arbitrated, fee_deposited, fee_received").eq("organization_id", organization.id),
    supabase.from("templates").select("id", { count: "exact", head: true }).or(`is_octa_model.eq.true,organization_id.eq.${organization.id}`),
    supabase.from("processes").select("id, process_number, plaintiff, defendant, status, priority, report_due_at, fee_arbitrated").eq("organization_id", organization.id).order("created_at", { ascending: false }).limit(5),
    supabase.from("calendar_events").select("id,title,event_type,starts_at,priority,location_name,city,processes(id,process_number)").eq("organization_id", organization.id).not("status", "in", "(completed,cancelled)").gte("starts_at", now).order("starts_at", { ascending: true }).limit(6),
    supabase.from("calendar_events").select("id", { count: "exact", head: true }).eq("organization_id", organization.id).not("status", "in", "(completed,cancelled)").lte("starts_at", nextSeven),
  ]);

  const totals = (financialProcesses ?? []).reduce(
    (acc, item) => ({
      arbitrated: acc.arbitrated + Number(item.fee_arbitrated ?? 0),
      deposited: acc.deposited + Number(item.fee_deposited ?? 0),
      received: acc.received + Number(item.fee_received ?? 0),
    }),
    { arbitrated: 0, deposited: 0, received: 0 },
  );

  return (
    <>
      <header className="page-header">
        <div><p className="eyebrow">VISÃO GERAL</p><h1>Seu escritório em controle</h1><p>Processos, agenda, alertas e honorários consolidados em um único painel.</p></div>
        <div className="header-actions"><Link className="button button-secondary" href="/agenda/novo">+ Agendar</Link><Link className="button button-primary" href="/processos/novo">+ Nova perícia</Link></div>
      </header>

      <section className="stats-grid">
        <article className="card stat-card"><span>Perícias ativas</span><strong>{activeCount ?? 0}</strong><small>{overdueCount ?? 0} compromisso(s) vencido(s)</small></article>
        <article className="card stat-card"><span>Alertas nos próximos 7 dias</span><strong>{alertCount ?? 0}</strong><small><Link href="/alertas">Abrir central de alertas</Link></small></article>
        <article className="card stat-card"><span>Honorários recebidos</span><strong>{formatCurrency(totals.received)}</strong><small>{formatCurrency(totals.deposited)} depositados</small></article>
        <article className="card stat-card"><span>Modelos técnicos</span><strong>{templateCount ?? 0}</strong><small>Biblioteca disponível</small></article>
      </section>

      <section className="dashboard-grid">
        <article className="card panel">
          <div className="panel-header"><h2>Próximos compromissos</h2><Link href="/agenda">Abrir agenda</Link></div>
          {!upcomingEvents?.length ? (
            <div className="empty-state"><strong>Nenhum compromisso futuro cadastrado.</strong>Cadastre diligências, vistorias, audiências e prazos na agenda.</div>
          ) : (
            <div className="deadline-list">
              {upcomingEvents.map((event) => {
                const related = Array.isArray(event.processes) ? event.processes[0] : event.processes;
                return (
                  <Link className="deadline-row" href={`/agenda/${event.id}`} key={event.id}>
                    <div><strong>{eventTypeIcon(event.event_type)} {event.title}</strong><span>{eventTypeLabel(event.event_type)}{related?.process_number ? ` · ${related.process_number}` : ""}{event.location_name || event.city ? ` · ${event.location_name || event.city}` : ""}</span></div>
                    <div className="deadline-date"><small>Data</small><b>{formatDateTime(event.starts_at)}</b></div>
                    <span className={`priority priority-${event.priority}`}>{event.priority}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </article>

        <article className="card panel">
          <div className="panel-header"><h2>Ações rápidas</h2></div>
          <div className="quick-actions">
            <Link className="quick-action" href="/processos/novo"><span>Cadastrar nova perícia</span><b>→</b></Link>
            <Link className="quick-action" href="/agenda/novo"><span>Agendar diligência ou prazo</span><b>→</b></Link>
            <Link className="quick-action" href="/alertas"><span>Consultar alertas e pendências</span><b>→</b></Link>
            <Link className="quick-action" href="/honorarios"><span>Consultar honorários</span><b>→</b></Link>
          </div>
        </article>
      </section>

      <section className="card panel dashboard-recent">
        <div className="panel-header"><h2>Processos recentes</h2><Link href="/processos">Ver todos</Link></div>
        {!latestProcesses?.length ? (
          <div className="empty-state"><strong>Nenhuma perícia cadastrada.</strong>Crie o primeiro processo para iniciar o fluxo operacional.</div>
        ) : latestProcesses.map((process) => (
          <Link className="list-row process-list-row" href={`/processos/${process.id}`} key={process.id}>
            <div><strong>{process.process_number}</strong><span>{process.plaintiff || "Autor não informado"} × {process.defendant || "Réu não informado"}</span></div>
            <div><small>Prazo do laudo</small><strong>{process.report_due_at ? new Date(`${process.report_due_at}T12:00:00`).toLocaleDateString("pt-BR") : "Não definido"}</strong></div>
            <div><small>Arbitrado</small><strong>{formatCurrency(process.fee_arbitrated)}</strong></div>
            <span className={`status status-${process.status}`}>{processStatusLabel(process.status)}</span>
          </Link>
        ))}
      </section>
    </>
  );
}
