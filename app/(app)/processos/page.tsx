import Link from "next/link";
import { deleteProcessAction } from "@/app/actions/processes";
import { DeleteProcessButton } from "@/components/delete-process-button";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/current-organization";
import { hasPermission } from "@/lib/permissions";
import { formatCurrency, formatDate, PROCESS_STATUS_OPTIONS, processStatusLabel } from "@/lib/process-options";

export const metadata = { title: "Processos" };

type SearchParams = Promise<{ q?: string; status?: string; error?: string; success?: string }>;

function num(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function moneyFromSummary(summaryValue: number | string | null | undefined, processValue: number | string | null | undefined) {
  const summary = num(summaryValue);
  const process = num(processValue);
  return summary > 0 || process <= 0 ? summary : process;
}

export default async function ProcessesPage({ searchParams }: { searchParams: SearchParams }) {
  const organization = await getCurrentOrganization();
  if (!organization) return null;
  const params = await searchParams;
  const query = (params.q ?? "").trim();
  const status = (params.status ?? "").trim();
  const supabase = await createClient();
  const canViewFinance = hasPermission(organization.role, "finance:view");
  const canCreateProcess = hasPermission(organization.role, "processes:write");
  const canDelete = ["owner", "admin"].includes(organization.role);

  let builder = supabase
    .from("processes")
    .select("id, process_number, court, district, plaintiff, defendant, subject, status, priority, report_due_at, fee_arbitrated, fee_received")
    .eq("organization_id", organization.id)
    .order("created_at", { ascending: false });

  if (status) builder = builder.eq("status", status);
  if (query) {
    const safe = query.replace(/[,%()]/g, " ");
    builder = builder.or(`process_number.ilike.%${safe}%,plaintiff.ilike.%${safe}%,defendant.ilike.%${safe}%,subject.ilike.%${safe}%`);
  }

  const { data: processes } = await builder;
  const processIds = (processes || []).map((process) => process.id);
  const { data: financialSummaries } = canViewFinance && processIds.length
    ? await supabase
        .from("process_financial_summary")
        .select("process_id,approved_total,received_total")
        .eq("organization_id", organization.id)
        .in("process_id", processIds)
    : { data: [] };
  const summaryByProcess = new Map((financialSummaries || []).map((summary) => [summary.process_id, summary]));

  return (
    <>
      <header className="page-header">
        <div><p className="eyebrow">GESTÃO PERICIAL</p><h1>Processos</h1><p>Cadastre, filtre e acompanhe o ciclo completo de cada perícia.</p></div>
        {canCreateProcess && <Link className="button button-primary" href="/processos/novo">+ Nova perícia</Link>}
      </header>

      {params.success && <div className="notice notice-success">{params.success}</div>}
      {params.error && <div className="notice notice-error">{params.error}</div>}

      <section className="card filter-card">
        <form className="filter-form" method="get">
          <label className="field filter-grow"><span>Pesquisar</span><input className="input" name="q" defaultValue={query} placeholder="Número, parte ou objeto" /></label>
          <label className="field"><span>Status</span><select className="select" name="status" defaultValue={status}><option value="">Todos</option>{PROCESS_STATUS_OPTIONS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
          <button className="button button-secondary filter-button" type="submit">Filtrar</button>
          {(query || status) && <Link className="button button-ghost filter-button" href="/processos">Limpar</Link>}
        </form>
      </section>

      <section className="card panel">
        <div className="panel-header"><h2>{processes?.length ?? 0} processo(s)</h2></div>
        {!processes?.length ? <div className="empty-state"><strong>Nenhum processo encontrado.</strong>Altere os filtros ou inclua uma nova perícia.</div> : (
          <div className="entity-list">
            {processes.map((process) => {
              const deleteAction = deleteProcessAction.bind(null, process.id);
              const financialSummary = summaryByProcess.get(process.id);
              const approvedTotal = moneyFromSummary(financialSummary?.approved_total, process.fee_arbitrated);
              const receivedTotal = moneyFromSummary(financialSummary?.received_total, process.fee_received);
              return (
                <article className="entity-list-item" key={process.id}>
                  <Link className="entity-list-link process-list-row" href={`/processos/${process.id}`}>
                    <div><strong>{process.process_number}</strong><span>{process.plaintiff || "Autor não informado"} × {process.defendant || "Réu não informado"}</span><small>{process.subject || "Objeto não informado"}</small></div>
                    <div><small>{process.court || "Tribunal não informado"}</small><strong>{process.district || "Comarca não informada"}</strong><span>Laudo: {formatDate(process.report_due_at)}</span></div>
                    {canViewFinance && <div><small>Arbitrado / recebido</small><strong>{formatCurrency(approvedTotal)}</strong><span>{formatCurrency(receivedTotal)}</span></div>}
                    <span className={`status status-${process.status}`}>{processStatusLabel(process.status)}</span>
                  </Link>
                  {canDelete && <DeleteProcessButton action={deleteAction} processNumber={process.process_number} compact />}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
