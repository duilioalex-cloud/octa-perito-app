import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/current-organization";
import { feeStatusLabel, financeStatusClass, FEE_STATUS_OPTIONS } from "@/lib/finance-options";
import { formatCurrency } from "@/lib/process-options";

export const metadata = { title: "Honorários" };

type FinancialRow = {
  process_id: string;
  process_number: string;
  subject: string | null;
  process_status: string;
  financial_status: string;
  proposed_total: number | string | null;
  approved_total: number | string | null;
  deposited_total: number | string | null;
  deposit_balance: number | string | null;
  received_total: number | string | null;
  expenses_forecast_total: number | string | null;
  forecast_result: number | string | null;
  realized_cash_result: number | string | null;
};

function num(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default async function FeesPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; error?: string; success?: string }> }) {
  const query = await searchParams;
  const organization = await getCurrentOrganization();
  if (!organization) return null;
  const supabase = await createClient();

  const [{ data: dashboard }, { data: rows, error }] = await Promise.all([
    supabase.from("organization_financial_dashboard").select("*").eq("organization_id", organization.id).maybeSingle(),
    supabase.from("process_financial_summary").select("*").eq("organization_id", organization.id).order("last_movement_at", { ascending: false }),
  ]);

  const search = (query.q || "").trim().toLocaleLowerCase("pt-BR");
  const selectedStatus = query.status || "all";
  const filtered = ((rows || []) as FinancialRow[]).filter((row) => {
    const matchesSearch = !search || `${row.process_number} ${row.subject || ""}`.toLocaleLowerCase("pt-BR").includes(search);
    const matchesStatus = selectedStatus === "all" || row.financial_status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const approved = num(dashboard?.approved_total);
  const deposited = num(dashboard?.deposited_total);
  const received = num(dashboard?.received_total);
  const depositBalance = num(dashboard?.deposit_balance);
  const toDeposit = Math.max(approved - deposited, 0);

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">GESTÃO FINANCEIRA</p>
          <h1>Honorários periciais</h1>
          <p>Controle separado de proposta, homologação, depósito judicial e levantamento efetivo.</p>
        </div>
        <div className="header-actions">
          <Link className="button button-secondary" href="/processos">Ver processos</Link>
          <Link className="button button-primary" href="/processos/novo">Cadastrar processo</Link>
        </div>
      </header>

      {query.error && <div className="notice notice-error">{query.error}</div>}
      {query.success && <div className="notice notice-success">{query.success}</div>}
      {error && <div className="notice notice-error">Não foi possível consultar o painel financeiro. Confirme se a migração 007 foi executada.</div>}

      <section className="stats-grid finance-stats-grid">
        <article className="card stat-card"><span>Total proposto</span><strong>{formatCurrency(dashboard?.proposed_total)}</strong><small>Valores apresentados nos processos</small></article>
        <article className="card stat-card"><span>Total homologado</span><strong>{formatCurrency(approved)}</strong><small>Receita prevista aprovada</small></article>
        <article className="card stat-card"><span>Total depositado</span><strong>{formatCurrency(deposited)}</strong><small>Saldo judicial atual: {formatCurrency(depositBalance)}</small></article>
        <article className="card stat-card"><span>Total levantado</span><strong>{formatCurrency(received)}</strong><small>A receber por depósito: {formatCurrency(toDeposit)}</small></article>
      </section>

      <section className="card panel finance-overview-card">
        <div className="finance-overview-grid">
          <div><span>Processos cadastrados</span><strong>{Number(dashboard?.process_count || 0)}</strong></div>
          <div><span>Pendências financeiras</span><strong>{Number(dashboard?.processes_with_financial_pending || 0)}</strong></div>
          <div><span>Despesas previstas</span><strong>{formatCurrency(dashboard?.expenses_forecast_total)}</strong></div>
          <div><span>Resultado previsto</span><strong>{formatCurrency(dashboard?.forecast_result)}</strong></div>
          <div><span>Fluxo de caixa realizado</span><strong>{formatCurrency(dashboard?.realized_cash_result)}</strong></div>
          <div><span>Honorário médio homologado</span><strong>{formatCurrency(dashboard?.average_approved_fee)}</strong></div>
        </div>
      </section>

      <section className="card panel" style={{ marginTop: 16 }}>
        <div className="panel-header"><h2>Processos e honorários</h2><span>{filtered.length} item(ns)</span></div>
        <form className="filter-form finance-filter-form" method="get">
          <label className="field filter-grow"><span>Buscar processo</span><input className="input" name="q" defaultValue={query.q || ""} placeholder="Número ou objeto do processo" /></label>
          <label className="field"><span>Situação financeira</span><select className="select" name="status" defaultValue={selectedStatus}><option value="all">Todas as situações</option>{FEE_STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <button className="button button-secondary" type="submit">Filtrar</button>
          {(query.q || selectedStatus !== "all") && <Link className="button button-ghost" href="/honorarios">Limpar</Link>}
        </form>

        {!filtered.length ? (
          <div className="empty-state"><strong>Nenhum processo encontrado.</strong>Cadastre um processo ou altere os filtros para iniciar o controle financeiro.</div>
        ) : (
          <div className="finance-process-list">
            {filtered.map((row) => {
              const approvedAmount = num(row.approved_total);
              const depositedAmount = num(row.deposited_total);
              const receivedAmount = num(row.received_total);
              return (
                <Link className="finance-process-row" href={`/honorarios/${row.process_id}`} key={row.process_id}>
                  <div className="finance-process-main"><strong>{row.process_number}</strong><span>{row.subject || "Objeto não informado"}</span></div>
                  <div><span>Situação</span><b className={financeStatusClass(row.financial_status)}>{feeStatusLabel(row.financial_status)}</b></div>
                  <div><span>Homologado</span><strong>{formatCurrency(approvedAmount)}</strong></div>
                  <div><span>Depositado</span><strong>{formatCurrency(depositedAmount)}</strong></div>
                  <div><span>Levantado</span><strong>{formatCurrency(receivedAmount)}</strong></div>
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
