import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/current-organization";

export const metadata = { title: "Visão geral" };

export default async function DashboardPage() {
  const organization = await getCurrentOrganization();
  if (!organization) return null;
  const supabase = await createClient();

  const [{ count: activeCount }, { count: deadlineCount }, { data: latestProcesses }] = await Promise.all([
    supabase.from("processes").select("id", { count: "exact", head: true }).eq("organization_id", organization.id).neq("status", "closed"),
    supabase.from("processes").select("id", { count: "exact", head: true }).eq("organization_id", organization.id).not("report_due_at", "is", null),
    supabase.from("processes").select("id, process_number, plaintiff, defendant, status, report_due_at").eq("organization_id", organization.id).order("created_at", { ascending: false }).limit(5),
  ]);

  return (
    <>
      <header className="page-header">
        <div><p className="eyebrow">VISÃO GERAL</p><h1>Seu escritório em controle</h1><p>Acompanhe processos, prazos e produção documental.</p></div>
        <Link className="button button-primary" href="/processos/novo">+ Nova perícia</Link>
      </header>
      <section className="stats-grid">
        <article className="card stat-card"><span>Perícias ativas</span><strong>{activeCount ?? 0}</strong><small>Processos em andamento</small></article>
        <article className="card stat-card"><span>Prazos cadastrados</span><strong>{deadlineCount ?? 0}</strong><small>Laudos e manifestações</small></article>
        <article className="card stat-card"><span>Honorários aprovados</span><strong>R$ 0</strong><small>Módulo financeiro em implantação</small></article>
        <article className="card stat-card"><span>Modelos técnicos</span><strong>12</strong><small>Biblioteca inicial planejada</small></article>
      </section>
      <section className="dashboard-grid">
        <article className="card panel">
          <div className="panel-header"><h2>Processos recentes</h2><Link href="/processos">Ver todos</Link></div>
          {!latestProcesses?.length ? (
            <div className="empty-state"><strong>Nenhuma perícia cadastrada.</strong>Crie o primeiro processo para iniciar o fluxo operacional.</div>
          ) : latestProcesses.map((process) => (
            <Link className="list-row" href={`/processos/${process.id}`} key={process.id}>
              <div><strong>{process.process_number}</strong><span>{process.plaintiff || "Autor não informado"} × {process.defendant || "Réu não informado"}</span></div>
              <div><small>Prazo do laudo</small><strong>{process.report_due_at ? new Date(process.report_due_at).toLocaleDateString("pt-BR") : "Não definido"}</strong></div>
              <span className="status">{process.status}</span>
            </Link>
          ))}
        </article>
        <article className="card panel">
          <div className="panel-header"><h2>Ações rápidas</h2></div>
          <div className="quick-actions">
            <Link className="quick-action" href="/processos/novo"><span>Cadastrar nova perícia</span><b>→</b></Link>
            <Link className="quick-action" href="/biblioteca"><span>Acessar modelos de petição</span><b>→</b></Link>
            <Link className="quick-action" href="/honorarios"><span>Calcular honorários</span><b>→</b></Link>
            <Link className="quick-action" href="/configuracoes"><span>Configurar assinatura</span><b>→</b></Link>
          </div>
        </article>
      </section>
    </>
  );
}
