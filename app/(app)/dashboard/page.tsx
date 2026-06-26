import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/current-organization";
import { deadlineCategoryLabel, formatCurrency, formatDateTime, processStatusLabel } from "@/lib/process-options";

export const metadata = { title: "Visão geral" };

export default async function DashboardPage() {
  const organization = await getCurrentOrganization();
  if (!organization) return null;
  const supabase = await createClient();
  const now = new Date().toISOString();

  const [
    { count: activeCount },
    { count: overdueCount },
    { data: financialProcesses },
    { count: templateCount },
    { data: latestProcesses },
    { data: upcomingDeadlines },
  ] = await Promise.all([
    supabase.from("processes").select("id", { count: "exact", head: true }).eq("organization_id", organization.id).neq("status", "closed"),
    supabase.from("process_deadlines").select("id", { count: "exact", head: true }).eq("organization_id", organization.id).eq("status", "pending").lt("due_at", now),
    supabase.from("processes").select("fee_arbitrated, fee_deposited, fee_received").eq("organization_id", organization.id),
    supabase.from("templates").select("id", { count: "exact", head: true }).or(`is_octa_model.eq.true,organization_id.eq.${organization.id}`),
    supabase.from("processes").select("id, process_number, plaintiff, defendant, status, priority, report_due_at, fee_arbitrated").eq("organization_id", organization.id).order("created_at", { ascending: false }).limit(5),
    supabase.from("process_deadlines").select("id, title, category, due_at, priority, processes(id, process_number)").eq("organization_id", organization.id).eq("status", "pending").gte("due_at", now).order("due_at", { ascending: true }).limit(6),
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
        <div><p className="eyebrow">VISÃO GERAL</p><h1>Seu escritório em controle</h1><p>Processos, prazos e honorários consolidados em um único painel.</p></div>
        <Link className="button button-primary" href="/processos/novo">+ Nova perícia</Link>
      </header>

      <section className="stats-grid">
        <article className="card stat-card"><span>Perícias ativas</span><strong>{activeCount ?? 0}</strong><small>{overdueCount ?? 0} prazo(s) vencido(s)</small></article>
        <article className="card stat-card"><span>Honorários arbitrados</span><strong>{formatCurrency(totals.arbitrated)}</strong><small>{formatCurrency(totals.deposited)} depositados</small></article>
        <article className="card stat-card"><span>Honorários recebidos</span><strong>{formatCurrency(totals.received)}</strong><small>Controle financeiro básico</small></article>
        <article className="card stat-card"><span>Modelos técnicos</span><strong>{templateCount ?? 0}</strong><small>Biblioteca disponível</small></article>
      </section>

      <section className="dashboard-grid">
        <article className="card panel">
          <div className="panel-header"><h2>Próximos prazos</h2><Link href="/processos">Ver processos</Link></div>
          {!upcomingDeadlines?.length ? (
            <div className="empty-state"><strong>Nenhum prazo futuro cadastrado.</strong>Cadastre prazos dentro de cada processo.</div>
          ) : (
            <div className="deadline-list">
              {upcomingDeadlines.map((deadline) => {
                const related = Array.isArray(deadline.processes) ? deadline.processes[0] : deadline.processes;
                return (
                  <Link className="deadline-row" href={`/processos/${related?.id ?? ""}`} key={deadline.id}>
                    <div><strong>{deadline.title}</strong><span>{related?.process_number ?? "Processo"} · {deadlineCategoryLabel(deadline.category)}</span></div>
                    <div className="deadline-date"><small>Vencimento</small><b>{formatDateTime(deadline.due_at)}</b></div>
                    <span className={`priority priority-${deadline.priority}`}>{deadline.priority}</span>
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
            <Link className="quick-action" href="/processos"><span>Consultar processos</span><b>→</b></Link>
            <Link className="quick-action" href="/biblioteca"><span>Acessar modelos técnicos</span><b>→</b></Link>
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
