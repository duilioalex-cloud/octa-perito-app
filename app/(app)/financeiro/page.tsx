import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentOrganization } from "@/lib/current-organization";
import { formatCurrency } from "@/lib/process-options";

export const metadata = { title: "Financeiro" };

function num(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function moneyFromSummary(summaryValue: number | string | null | undefined, processValue: number | string | null | undefined) {
  const summary = num(summaryValue);
  const process = num(processValue);
  return summary > 0 || process <= 0 ? summary : process;
}

export default async function FinancialPage() {
  const organization = await requireCurrentOrganization("finance:view");
  const supabase = await createClient();

  const [{ data: dashboard, error: dashboardError }, { data: rows, error: rowsError }, { data: processFallbacks }] = await Promise.all([
    supabase.from("organization_financial_dashboard").select("*").eq("organization_id", organization.id).maybeSingle(),
    supabase.from("process_financial_summary").select("*").eq("organization_id", organization.id),
    supabase.from("processes").select("id,fee_proposed,fee_arbitrated,fee_deposited,fee_received").eq("organization_id", organization.id),
  ]);

  const processFallbackById = new Map((processFallbacks || []).map((process) => [process.id, process]));
  const effectiveTotals = (rows || []).reduce((totals, row) => {
    const processFallback = processFallbackById.get(row.process_id);
    const proposed = moneyFromSummary(row.proposed_total, processFallback?.fee_proposed);
    const approved = moneyFromSummary(row.approved_total, processFallback?.fee_arbitrated);
    const deposited = moneyFromSummary(row.deposited_total, processFallback?.fee_deposited);
    const received = moneyFromSummary(row.received_total, processFallback?.fee_received);
    totals.proposed += proposed;
    totals.approved += approved;
    totals.deposited += deposited;
    totals.received += received;
    totals.depositBalance += Math.max(deposited - received, 0);
    return totals;
  }, { proposed: 0, approved: 0, deposited: 0, received: 0, depositBalance: 0 });

  const processCount = Math.max(Number(dashboard?.process_count || 0), processFallbacks?.length || 0, rows?.length || 0);
  const proposed = Math.max(num(dashboard?.proposed_total), effectiveTotals.proposed);
  const approved = Math.max(num(dashboard?.approved_total), effectiveTotals.approved);
  const deposited = Math.max(num(dashboard?.deposited_total), effectiveTotals.deposited);
  const received = Math.max(num(dashboard?.received_total), effectiveTotals.received);
  const depositBalance = Math.max(num(dashboard?.deposit_balance), effectiveTotals.depositBalance);
  const expensesForecast = num(dashboard?.expenses_forecast_total);
  const tripsForecast = num(dashboard?.trip_cost_forecast_total);
  const pendingReimbursements = num(dashboard?.reimbursable_pending_total);
  const forecastResult = approved > 0 ? approved - expensesForecast - tripsForecast : num(dashboard?.forecast_result);
  const cashResult = num(dashboard?.realized_cash_result);
  const averageApprovedFee = processCount > 0 ? approved / processCount : num(dashboard?.average_approved_fee);

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">GESTAO FINANCEIRA</p>
          <h1>Financeiro</h1>
          <p>Atalho central para honorarios, depositos, despesas, deslocamentos e resultado da carteira.</p>
        </div>
        <div className="header-actions">
          <Link className="button button-secondary" href="/despesas">Despesas</Link>
          <Link className="button button-primary" href="/honorarios">Honorarios</Link>
        </div>
      </header>

      {(dashboardError || rowsError) && <div className="notice notice-error">Nao foi possivel consultar o painel financeiro. Confirme se a migracao 007 foi executada.</div>}

      <section className="stats-grid finance-stats-grid">
        <article className="card stat-card"><span>Honorarios homologados</span><strong>{formatCurrency(approved)}</strong><small>Receita prevista aprovada</small></article>
        <article className="card stat-card"><span>Depositado em juizo</span><strong>{formatCurrency(deposited)}</strong><small>Saldo atual: {formatCurrency(depositBalance)}</small></article>
        <article className="card stat-card"><span>Honorarios levantados</span><strong>{formatCurrency(received)}</strong><small>Receita efetivamente recebida</small></article>
        <article className={`card stat-card ${forecastResult < 0 ? "financial-negative-card" : ""}`}><span>Resultado previsto</span><strong>{formatCurrency(forecastResult)}</strong><small>Homologado menos custos previstos</small></article>
      </section>

      <section className="financial-hub-grid">
        <Link className="card financial-hub-card" href="/honorarios">
          <div>
            <span className="financial-hub-icon">$</span>
            <h2>Honorarios</h2>
            <p>Controle proposta, homologacao, deposito judicial e levantamento por processo.</p>
          </div>
          <div className="financial-hub-metrics">
            <span>Processos com pendencia <strong>{Number(dashboard?.processes_with_financial_pending || 0)}</strong></span>
            <span>A receber <strong>{formatCurrency(Math.max(approved - received, 0))}</strong></span>
          </div>
        </Link>

        <Link className="card financial-hub-card" href="/despesas">
          <div>
            <span className="financial-hub-icon">-</span>
            <h2>Despesas e deslocamentos</h2>
            <p>Registre custos previstos, realizados, viagens periciais e reembolsos pendentes.</p>
          </div>
          <div className="financial-hub-metrics">
            <span>Custos previstos <strong>{formatCurrency(expensesForecast + tripsForecast)}</strong></span>
            <span>Reembolsos <strong>{formatCurrency(pendingReimbursements)}</strong></span>
          </div>
        </Link>
      </section>

      <section className="card panel financial-summary-panel">
        <div className="panel-header">
          <div>
            <h2>Resumo financeiro da carteira</h2>
            <p>Indicadores consolidados para acompanhamento rapido.</p>
          </div>
        </div>
        <div className="finance-overview-grid">
          <div><span>Processos cadastrados</span><strong>{processCount}</strong></div>
          <div><span>Proposto</span><strong>{formatCurrency(proposed)}</strong></div>
          <div><span>Despesas previstas</span><strong>{formatCurrency(expensesForecast)}</strong></div>
          <div><span>Deslocamentos previstos</span><strong>{formatCurrency(tripsForecast)}</strong></div>
          <div><span>Caixa realizado</span><strong className={cashResult < 0 ? "metric-negative" : "metric-positive"}>{formatCurrency(cashResult)}</strong></div>
          <div><span>Honorario medio</span><strong>{formatCurrency(averageApprovedFee)}</strong></div>
        </div>
      </section>
    </>
  );
}
