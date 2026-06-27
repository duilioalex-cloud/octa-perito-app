import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentOrganization } from "@/lib/current-organization";
import { formatCurrency } from "@/lib/process-options";

export const metadata = { title: "Despesas e deslocamentos" };

type CostRow = {
  process_id: string;
  process_number: string;
  subject: string | null;
  process_status: string;
  expenses_forecast_total: number | string | null;
  expenses_paid_total: number | string | null;
  reimbursable_pending_total: number | string | null;
  trip_cost_forecast_total: number | string | null;
  trip_cost_completed_total: number | string | null;
  approved_total: number | string | null;
  received_total: number | string | null;
  last_movement_at: string | null;
};

function num(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default async function ExpensesPage({ searchParams }: { searchParams: Promise<{ q?: string; filter?: string; error?: string; success?: string }> }) {
  const query = await searchParams;
  const organization = await requireCurrentOrganization("finance:view");
  const supabase = await createClient();

  const [{ data: dashboard }, { data: rows, error }] = await Promise.all([
    supabase.from("organization_financial_dashboard").select("*").eq("organization_id", organization.id).maybeSingle(),
    supabase.from("process_financial_summary").select("*").eq("organization_id", organization.id).order("last_movement_at", { ascending: false }),
  ]);

  const search = (query.q || "").trim().toLocaleLowerCase("pt-BR");
  const selectedFilter = query.filter || "all";
  const filtered = ((rows || []) as CostRow[]).filter((row) => {
    const expenseForecast = num(row.expenses_forecast_total);
    const tripForecast = num(row.trip_cost_forecast_total);
    const pendingReimbursement = num(row.reimbursable_pending_total);
    const matchesSearch = !search || `${row.process_number} ${row.subject || ""}`.toLocaleLowerCase("pt-BR").includes(search);
    const matchesFilter = selectedFilter === "all"
      || (selectedFilter === "with_costs" && expenseForecast + tripForecast > 0)
      || (selectedFilter === "without_costs" && expenseForecast + tripForecast === 0)
      || (selectedFilter === "reimbursement_pending" && pendingReimbursement > 0)
      || (selectedFilter === "paid_expenses" && num(row.expenses_paid_total) > 0)
      || (selectedFilter === "completed_trips" && num(row.trip_cost_completed_total) > 0);
    return matchesSearch && matchesFilter;
  });

  const expenseForecast = num(dashboard?.expenses_forecast_total);
  const expensesPaid = num(dashboard?.expenses_paid_total);
  const tripForecast = num(dashboard?.trip_cost_forecast_total);
  const pendingReimbursements = num(dashboard?.reimbursable_pending_total);
  const totalOperationalForecast = expenseForecast + tripForecast;

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">CONTROLE OPERACIONAL</p>
          <h1>Despesas e deslocamentos</h1>
          <p>Custos previstos e realizados por processo, viagens periciais e reembolsos pendentes.</p>
        </div>
        <div className="header-actions">
          <Link className="button button-secondary" href="/honorarios">Honorários</Link>
          <Link className="button button-primary" href="/processos">Selecionar processo</Link>
        </div>
      </header>

      {query.error && <div className="notice notice-error">{query.error}</div>}
      {query.success && <div className="notice notice-success">{query.success}</div>}
      {error && <div className="notice notice-error">Não foi possível consultar os custos. Confirme se a migração 007 foi executada.</div>}

      <section className="stats-grid finance-stats-grid">
        <article className="card stat-card"><span>Custo operacional previsto</span><strong>{formatCurrency(totalOperationalForecast)}</strong><small>Despesas e deslocamentos não cancelados</small></article>
        <article className="card stat-card"><span>Despesas previstas</span><strong>{formatCurrency(expenseForecast)}</strong><small>Inclui despesas planejadas, pendentes e pagas</small></article>
        <article className="card stat-card"><span>Despesas efetivamente pagas</span><strong>{formatCurrency(expensesPaid)}</strong><small>Saída de caixa já realizada</small></article>
        <article className="card stat-card"><span>Deslocamentos previstos</span><strong>{formatCurrency(tripForecast)}</strong><small>Combustível, veículo, tempo técnico e adicionais</small></article>
      </section>

      <section className="card panel finance-overview-card">
        <div className="finance-overview-grid expense-overview-grid">
          <div><span>Processos cadastrados</span><strong>{Number(dashboard?.process_count || 0)}</strong></div>
          <div><span>Reembolsos pendentes</span><strong>{formatCurrency(pendingReimbursements)}</strong></div>
          <div><span>Honorários homologados</span><strong>{formatCurrency(dashboard?.approved_total)}</strong></div>
          <div><span>Honorários levantados</span><strong>{formatCurrency(dashboard?.received_total)}</strong></div>
          <div><span>Resultado previsto atual</span><strong>{formatCurrency(num(dashboard?.approved_total) - totalOperationalForecast)}</strong></div>
          <div><span>Caixa realizado atual</span><strong>{formatCurrency(num(dashboard?.received_total) - expensesPaid)}</strong></div>
        </div>
      </section>

      <section className="card panel" style={{ marginTop: 16 }}>
        <div className="panel-header"><h2>Custos por processo</h2><span>{filtered.length} item(ns)</span></div>
        <form className="filter-form finance-filter-form" method="get">
          <label className="field filter-grow"><span>Buscar processo</span><input className="input" name="q" defaultValue={query.q || ""} placeholder="Número ou objeto do processo" /></label>
          <label className="field"><span>Filtro de custo</span><select className="select" name="filter" defaultValue={selectedFilter}><option value="all">Todos os processos</option><option value="with_costs">Com custos cadastrados</option><option value="without_costs">Sem custos cadastrados</option><option value="reimbursement_pending">Com reembolso pendente</option><option value="paid_expenses">Com despesas pagas</option><option value="completed_trips">Com deslocamentos concluídos</option></select></label>
          <button className="button button-secondary" type="submit">Filtrar</button>
          {(query.q || selectedFilter !== "all") && <Link className="button button-ghost" href="/despesas">Limpar</Link>}
        </form>

        {!filtered.length ? (
          <div className="empty-state"><strong>Nenhum processo encontrado.</strong>Altere os filtros ou abra um processo para cadastrar despesas e deslocamentos.</div>
        ) : (
          <div className="expense-process-list">
            {filtered.map((row) => {
              const expenses = num(row.expenses_forecast_total);
              const trips = num(row.trip_cost_forecast_total);
              const total = expenses + trips;
              return (
                <Link className="expense-process-row" href={`/despesas/${row.process_id}`} key={row.process_id}>
                  <div className="finance-process-main"><strong>{row.process_number}</strong><span>{row.subject || "Objeto não informado"}</span></div>
                  <div><span>Despesas</span><strong>{formatCurrency(expenses)}</strong></div>
                  <div><span>Deslocamentos</span><strong>{formatCurrency(trips)}</strong></div>
                  <div><span>Custo total</span><strong>{formatCurrency(total)}</strong></div>
                  <div><span>Reembolso pendente</span><strong>{formatCurrency(row.reimbursable_pending_total)}</strong></div>
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
