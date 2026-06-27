import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentOrganization } from "@/lib/current-organization";
import { formatCurrency } from "@/lib/process-options";

export const metadata = { title: "Financeiro" };

function num(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default async function FinancialPage() {
  const organization = await requireCurrentOrganization("finance:view");
  const supabase = await createClient();

  const { data: dashboard, error } = await supabase
    .from("organization_financial_dashboard")
    .select("*")
    .eq("organization_id", organization.id)
    .maybeSingle();

  const approved = num(dashboard?.approved_total);
  const deposited = num(dashboard?.deposited_total);
  const received = num(dashboard?.received_total);
  const expensesForecast = num(dashboard?.expenses_forecast_total);
  const tripsForecast = num(dashboard?.trip_cost_forecast_total);
  const pendingReimbursements = num(dashboard?.reimbursable_pending_total);
  const forecastResult = num(dashboard?.forecast_result);
  const cashResult = num(dashboard?.realized_cash_result);

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

      {error && <div className="notice notice-error">Nao foi possivel consultar o painel financeiro. Confirme se a migracao 007 foi executada.</div>}

      <section className="stats-grid finance-stats-grid">
        <article className="card stat-card"><span>Honorarios homologados</span><strong>{formatCurrency(approved)}</strong><small>Receita prevista aprovada</small></article>
        <article className="card stat-card"><span>Depositado em juizo</span><strong>{formatCurrency(deposited)}</strong><small>Saldo atual: {formatCurrency(dashboard?.deposit_balance)}</small></article>
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
          <div><span>Processos cadastrados</span><strong>{Number(dashboard?.process_count || 0)}</strong></div>
          <div><span>Proposto</span><strong>{formatCurrency(dashboard?.proposed_total)}</strong></div>
          <div><span>Despesas previstas</span><strong>{formatCurrency(expensesForecast)}</strong></div>
          <div><span>Deslocamentos previstos</span><strong>{formatCurrency(tripsForecast)}</strong></div>
          <div><span>Caixa realizado</span><strong className={cashResult < 0 ? "metric-negative" : "metric-positive"}>{formatCurrency(cashResult)}</strong></div>
          <div><span>Honorario medio</span><strong>{formatCurrency(dashboard?.average_approved_fee)}</strong></div>
        </div>
      </section>
    </>
  );
}
