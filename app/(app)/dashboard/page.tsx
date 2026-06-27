import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/current-organization";
import { eventTypeIcon, eventTypeLabel } from "@/lib/calendar-options";
import { expenseCategoryLabel } from "@/lib/expense-options";
import { formatCurrency, formatDate, formatDateTime, PROCESS_STATUS_OPTIONS } from "@/lib/process-options";
import {
  DASHBOARD_PERIOD_OPTIONS,
  dashboardPeriod,
  dateInPeriod,
  daysFromNow,
  lastMonthBuckets,
  monthKey,
  numberValue,
} from "@/lib/dashboard-options";
import { BreakdownBars, FinancialFunnel, MonthlyCashChart, StatusBars } from "@/components/dashboard-charts";

export const metadata = { title: "Painel financeiro e operacional" };

type ProcessRow = {
  id: string;
  process_number: string;
  subject: string | null;
  plaintiff: string | null;
  defendant: string | null;
  status: string;
  priority: string;
  report_due_at: string | null;
  financial_status: string | null;
  last_movement_at: string | null;
  created_at: string;
};

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
  expenses_paid_total: number | string | null;
  reimbursable_pending_total: number | string | null;
  trip_cost_forecast_total: number | string | null;
  trip_cost_completed_total: number | string | null;
  forecast_result: number | string | null;
  realized_cash_result: number | string | null;
  last_movement_at: string | null;
};

type ReportRow = {
  id: string;
  process_id: string;
  title: string;
  status: string;
  updated_at: string;
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

type FeeRow = {
  process_id: string;
  proposed_amount: number | string | null;
  approved_amount: number | string | null;
  proposed_at: string | null;
  approved_at: string | null;
  status: string;
};

type TransactionRow = {
  process_id: string;
  transaction_type: string;
  deposit_delta: number | string | null;
  received_delta: number | string | null;
  occurred_at: string | null;
  created_at: string;
};

type ExpenseRow = {
  process_id: string;
  category: string;
  total_amount: number | string | null;
  payment_status: string;
  expense_date: string;
  is_reimbursable: boolean;
  reimbursement_status: string;
};

type TripRow = {
  process_id: string;
  status: string;
  total_cost: number | string | null;
  departure_at: string | null;
  created_at: string;
};

type ActionItem = {
  key: string;
  title: string;
  description: string;
  href: string;
  label: string;
  level: "danger" | "warning" | "info" | "success";
  weight: number;
};

function relatedProcess(value: EventRow["processes"]) {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function sum<T>(rows: T[], value: (row: T) => number) {
  return rows.reduce((total, row) => total + value(row), 0);
}

function daysSince(value: string | null | undefined, reference: Date) {
  if (!value) return 9999;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 9999;
  return Math.floor((reference.getTime() - date.getTime()) / 86400000);
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ period?: string; process?: string }> }) {
  const query = await searchParams;
  const organization = await getCurrentOrganization();
  if (!organization) return null;

  const supabase = await createClient();
  const now = new Date();
  const selectedPeriod = dashboardPeriod(query.period, now);
  const nextSeven = new Date(now.getTime() + 7 * 86400000);

  const [
    dashboardResult,
    financialRowsResult,
    processesResult,
    reportsResult,
    eventsResult,
    feesResult,
    transactionsResult,
    expensesResult,
    tripsResult,
  ] = await Promise.all([
    supabase.from("organization_financial_dashboard").select("*").eq("organization_id", organization.id).maybeSingle(),
    supabase.from("process_financial_summary").select("*").eq("organization_id", organization.id).order("forecast_result", { ascending: false }),
    supabase.from("processes").select("id,process_number,subject,plaintiff,defendant,status,priority,report_due_at,financial_status,last_movement_at,created_at").eq("organization_id", organization.id).order("last_movement_at", { ascending: false }),
    supabase.from("expert_reports").select("id,process_id,title,status,updated_at").eq("organization_id", organization.id).order("updated_at", { ascending: false }),
    supabase.from("calendar_events").select("id,process_id,title,event_type,status,priority,starts_at,location_name,city,processes(id,process_number)").eq("organization_id", organization.id).not("status", "in", "(completed,cancelled)").order("starts_at", { ascending: true }),
    supabase.from("process_fees").select("process_id,proposed_amount,approved_amount,proposed_at,approved_at,status").eq("organization_id", organization.id).neq("status", "cancelled"),
    supabase.from("fee_transactions").select("process_id,transaction_type,deposit_delta,received_delta,occurred_at,created_at").eq("organization_id", organization.id).eq("status", "confirmed"),
    supabase.from("process_expenses").select("process_id,category,total_amount,payment_status,expense_date,is_reimbursable,reimbursement_status").eq("organization_id", organization.id).neq("payment_status", "cancelled"),
    supabase.from("process_trips").select("process_id,status,total_cost,departure_at,created_at").eq("organization_id", organization.id).neq("status", "cancelled"),
  ]);

  const financialRows = (financialRowsResult.data ?? []) as FinancialRow[];
  const processes = (processesResult.data ?? []) as ProcessRow[];
  const reports = (reportsResult.data ?? []) as ReportRow[];
  const events = (eventsResult.data ?? []) as EventRow[];
  const fees = (feesResult.data ?? []) as FeeRow[];
  const transactions = (transactionsResult.data ?? []) as TransactionRow[];
  const expenses = (expensesResult.data ?? []) as ExpenseRow[];
  const trips = (tripsResult.data ?? []) as TripRow[];

  const hasDataError = [dashboardResult.error, financialRowsResult.error, processesResult.error, reportsResult.error, eventsResult.error, feesResult.error, transactionsResult.error, expensesResult.error, tripsResult.error].some(Boolean);

  const selectedProcessId = processes.some((process) => process.id === query.process) ? query.process ?? null : null;
  const selectedProcess = selectedProcessId ? processes.find((process) => process.id === selectedProcessId) ?? null : null;
  const processMatches = (processId: string | null | undefined) => !selectedProcessId || processId === selectedProcessId;

  const scopedProcesses = selectedProcessId ? processes.filter((process) => process.id === selectedProcessId) : processes;
  const scopedFinancialRows = financialRows.filter((row) => processMatches(row.process_id));
  const scopedReports = reports.filter((report) => processMatches(report.process_id));
  const scopedEvents = events.filter((event) => processMatches(event.process_id));
  const scopedFees = fees.filter((fee) => processMatches(fee.process_id));
  const scopedTransactions = transactions.filter((transaction) => processMatches(transaction.process_id));
  const scopedExpenses = expenses.filter((expense) => processMatches(expense.process_id));
  const scopedTrips = trips.filter((trip) => processMatches(trip.process_id));

  const proposedInPeriod = sum(scopedFees.filter((fee) => dateInPeriod(fee.proposed_at, selectedPeriod.start, selectedPeriod.end)), (fee) => numberValue(fee.proposed_amount));
  const approvedInPeriod = sum(scopedFees.filter((fee) => dateInPeriod(fee.approved_at, selectedPeriod.start, selectedPeriod.end)), (fee) => numberValue(fee.approved_amount));
  const transactionsInPeriod = scopedTransactions.filter((transaction) => dateInPeriod(transaction.occurred_at || transaction.created_at, selectedPeriod.start, selectedPeriod.end));
  const depositedInPeriod = sum(transactionsInPeriod, (transaction) => Math.max(numberValue(transaction.deposit_delta), 0));
  const receivedInPeriod = sum(transactionsInPeriod, (transaction) => numberValue(transaction.received_delta));
  const expensesInPeriod = scopedExpenses.filter((expense) => dateInPeriod(expense.expense_date, selectedPeriod.start, selectedPeriod.end));
  const tripsInPeriod = scopedTrips.filter((trip) => dateInPeriod(trip.departure_at || trip.created_at, selectedPeriod.start, selectedPeriod.end));
  const expensesPaidInPeriod = sum(expensesInPeriod.filter((expense) => expense.payment_status === "paid"), (expense) => numberValue(expense.total_amount));
  const tripsCompletedInPeriod = sum(tripsInPeriod.filter((trip) => trip.status === "completed"), (trip) => numberValue(trip.total_cost));
  const forecastExpensesInPeriod = sum(expensesInPeriod, (expense) => numberValue(expense.total_amount));
  const forecastTripsInPeriod = sum(tripsInPeriod, (trip) => numberValue(trip.total_cost));
  const realizedCostsInPeriod = expensesPaidInPeriod + tripsCompletedInPeriod;
  const forecastCostsInPeriod = forecastExpensesInPeriod + forecastTripsInPeriod;
  const cashResultInPeriod = receivedInPeriod - realizedCostsInPeriod;
  const forecastResultInPeriod = approvedInPeriod - forecastCostsInPeriod;

  const activeProcesses = scopedProcesses.filter((process) => process.status !== "closed");
  const reportsInProgress = scopedReports.filter((report) => ["draft", "in_review"].includes(report.status));
  const activeEvents = scopedEvents.filter((event) => !["completed", "cancelled"].includes(event.status));
  const upcomingEvents = activeEvents.filter((event) => {
    const starts = new Date(event.starts_at);
    return starts >= now && starts <= nextSeven;
  });
  const deadlineTypes = new Set(["report_due", "clarification_due", "manifestation_due", "financial_due"]);
  const diligenceTypes = new Set(["diligence", "inspection"]);
  const deadlineEvents = activeEvents.filter((event) => deadlineTypes.has(event.event_type));
  const upcomingDeadlines = deadlineEvents.filter((event) => {
    const starts = new Date(event.starts_at);
    return starts >= now && starts <= nextSeven;
  });
  const overdueDeadlines = deadlineEvents.filter((event) => new Date(event.starts_at) < now);
  const activeDiligences = activeEvents.filter((event) => diligenceTypes.has(event.event_type));
  const upcomingDiligences = activeDiligences.filter((event) => new Date(event.starts_at) >= now);
  const overdueDiligences = activeDiligences.filter((event) => new Date(event.starts_at) < now);
  const financialPending = scopedFinancialRows.filter((row) => !["fully_released", "cancelled", "not_defined"].includes(row.financial_status));
  const staleProcesses = activeProcesses.filter((process) => daysSince(process.last_movement_at || process.created_at, now) >= 30);
  const urgentProcesses = activeProcesses.filter((process) => ["high", "urgent"].includes(process.priority));

  const scheduledReportProcessIds = new Set(deadlineEvents.filter((event) => event.event_type === "report_due" && event.process_id).map((event) => event.process_id as string));
  const reportDueSoon = activeProcesses.filter((process) => {
    const days = daysFromNow(process.report_due_at, now);
    return days !== null && days >= 0 && days <= 7 && !["delivered", "closed"].includes(process.status) && !scheduledReportProcessIds.has(process.id);
  });

  const portfolioApproved = sum(scopedFinancialRows, (row) => numberValue(row.approved_total));
  const portfolioProposed = sum(scopedFinancialRows, (row) => numberValue(row.proposed_total));
  const portfolioDeposited = sum(scopedFinancialRows, (row) => numberValue(row.deposited_total));
  const portfolioReceived = sum(scopedFinancialRows, (row) => numberValue(row.received_total));
  const portfolioDepositBalance = sum(scopedFinancialRows, (row) => numberValue(row.deposit_balance));
  const portfolioForecastResult = sum(scopedFinancialRows, (row) => numberValue(row.forecast_result));
  const portfolioReimbursements = sum(scopedFinancialRows, (row) => numberValue(row.reimbursable_pending_total));
  const portfolioReceivable = Math.max(portfolioApproved - portfolioReceived, 0);
  const portfolioCosts = sum(scopedFinancialRows, (row) => numberValue(row.expenses_forecast_total) + numberValue(row.trip_cost_forecast_total));

  const monthBuckets = lastMonthBuckets(6, now);
  const monthMap = new Map(monthBuckets.map((bucket) => [bucket.key, bucket]));
  for (const transaction of scopedTransactions) {
    const key = monthKey(transaction.occurred_at || transaction.created_at);
    const bucket = monthMap.get(key);
    if (bucket) bucket.revenue += numberValue(transaction.received_delta);
  }
  for (const expense of scopedExpenses) {
    if (expense.payment_status !== "paid") continue;
    const bucket = monthMap.get(monthKey(expense.expense_date));
    if (bucket) bucket.cost += numberValue(expense.total_amount);
  }
  for (const trip of scopedTrips) {
    if (trip.status !== "completed") continue;
    const bucket = monthMap.get(monthKey(trip.departure_at || trip.created_at));
    if (bucket) bucket.cost += numberValue(trip.total_cost);
  }

  const expenseCategoryMap = new Map<string, number>();
  for (const expense of expensesInPeriod) {
    expenseCategoryMap.set(expense.category, (expenseCategoryMap.get(expense.category) || 0) + numberValue(expense.total_amount));
  }
  if (forecastTripsInPeriod > 0) expenseCategoryMap.set("__trips", forecastTripsInPeriod);
  const expenseBreakdown = [...expenseCategoryMap.entries()]
    .map(([category, value]) => ({ label: category === "__trips" ? "Deslocamentos calculados" : expenseCategoryLabel(category), value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 7);

  const processStatusItems = PROCESS_STATUS_OPTIONS.map(([status, label]) => ({
    label,
    value: scopedProcesses.filter((process) => process.status === status).length,
  }));

  const actionItems: ActionItem[] = [];
  overdueDeadlines.slice(0, 4).forEach((event) => {
    const process = relatedProcess(event.processes);
    actionItems.push({
      key: `deadline-${event.id}`,
      title: "Prazo vencido",
      description: `${event.title}${process?.process_number ? ` · ${process.process_number}` : ""}`,
      href: `/agenda/${event.id}`,
      label: formatDateTime(event.starts_at),
      level: "danger",
      weight: 1200 + Math.abs(daysFromNow(event.starts_at, now) || 0),
    });
  });
  overdueDiligences.slice(0, 2).forEach((event) => {
    const process = relatedProcess(event.processes);
    actionItems.push({
      key: `diligence-overdue-${event.id}`,
      title: "Diligência pendente",
      description: `${event.title}${process?.process_number ? ` · ${process.process_number}` : ""}`,
      href: `/agenda/${event.id}`,
      label: formatDateTime(event.starts_at),
      level: "danger",
      weight: 1100 + Math.abs(daysFromNow(event.starts_at, now) || 0),
    });
  });
  upcomingDeadlines.slice(0, 4).forEach((event) => {
    const process = relatedProcess(event.processes);
    const days = Math.max(daysFromNow(event.starts_at, now) ?? 0, 0);
    actionItems.push({
      key: `deadline-upcoming-${event.id}`,
      title: days === 0 ? "Prazo vence hoje" : `Prazo vence em ${days} dia(s)`,
      description: `${event.title}${process?.process_number ? ` · ${process.process_number}` : ""}`,
      href: `/agenda/${event.id}`,
      label: formatDateTime(event.starts_at),
      level: days <= 1 ? "danger" : "warning",
      weight: 1000 - days,
    });
  });
  reportDueSoon.forEach((process) => {
    const days = daysFromNow(process.report_due_at, now) ?? 7;
    actionItems.push({
      key: `report-${process.id}`,
      title: days === 0 ? "Laudo vence hoje" : `Laudo vence em ${days} dia(s)`,
      description: `${process.process_number} · ${process.subject || "Objeto não informado"}`,
      href: `/processos/${process.id}`,
      label: formatDate(process.report_due_at),
      level: days <= 1 ? "danger" : "warning",
      weight: 900 - days,
    });
  });
  scopedFinancialRows
    .filter((row) => numberValue(row.approved_total) - numberValue(row.deposited_total) > 0 || numberValue(row.deposit_balance) > 0)
    .sort((a, b) => (numberValue(b.approved_total) - numberValue(b.received_total)) - (numberValue(a.approved_total) - numberValue(a.received_total)))
    .slice(0, 3)
    .forEach((row) => {
      const waitingDeposit = Math.max(numberValue(row.approved_total) - numberValue(row.deposited_total), 0);
      const depositBalance = numberValue(row.deposit_balance);
      actionItems.push({
        key: `finance-${row.process_id}`,
        title: waitingDeposit > 0 ? "Honorários aguardando depósito" : "Saldo aguardando levantamento",
        description: `${row.process_number} · ${row.subject || "Objeto não informado"}`,
        href: `/honorarios/${row.process_id}`,
        label: formatCurrency(waitingDeposit > 0 ? waitingDeposit : depositBalance),
        level: waitingDeposit > 0 ? "warning" : "info",
        weight: 700 + Math.min((waitingDeposit + depositBalance) / 1000, 100),
      });
    });
  staleProcesses.slice(0, 3).forEach((process) => {
    const inactiveDays = daysSince(process.last_movement_at || process.created_at, now);
    actionItems.push({
      key: `stale-${process.id}`,
      title: "Processo sem movimentação recente",
      description: `${process.process_number} · ${process.subject || "Objeto não informado"}`,
      href: `/processos/${process.id}`,
      label: `${inactiveDays} dias`,
      level: "info",
      weight: 400 + inactiveDays,
    });
  });
  const prioritizedActions = actionItems.sort((a, b) => b.weight - a.weight).slice(0, 8);

  const topFinancialProcesses = [...scopedFinancialRows]
    .filter((row) => numberValue(row.approved_total) > 0 || numberValue(row.forecast_result) !== 0)
    .sort((a, b) => numberValue(b.forecast_result) - numberValue(a.forecast_result))
    .slice(0, 5);

  const processFilterOptions = [...processes].sort((a, b) => a.process_number.localeCompare(b.process_number, "pt-BR", { numeric: true }));
  const processesHref = selectedProcessId ? `/processos/${selectedProcessId}` : "/processos";
  const feesHref = selectedProcessId ? `/honorarios/${selectedProcessId}` : "/honorarios";
  const expensesHref = selectedProcessId ? `/despesas/${selectedProcessId}` : "/despesas";

  return (
    <>
      <header className="page-header dashboard-page-header">
        <div>
          <p className="eyebrow">PAINEL EXECUTIVO</p>
          <h1>Financeiro e operacional</h1>
          <p>Receitas, custos, prazos, laudos e pendências consolidados para decisão rápida.</p>
        </div>
        <div className="dashboard-header-tools">
          <form className="dashboard-period-form" method="get">
            <label>
              <span>Período dos indicadores</span>
              <select className="select" name="period" defaultValue={selectedPeriod.key}>
                {DASHBOARD_PERIOD_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="dashboard-process-filter">
              <span>Processo</span>
              <select className="select" name="process" defaultValue={selectedProcessId ?? ""}>
                <option value="">Todos os processos</option>
                {processFilterOptions.map((process) => (
                  <option key={process.id} value={process.id}>{process.process_number}{process.subject ? ` — ${process.subject}` : ""}</option>
                ))}
              </select>
            </label>
            <button className="button button-secondary" type="submit">Aplicar filtros</button>
            {(selectedProcessId || selectedPeriod.key !== "month") && <Link className="dashboard-filter-clear" href="/dashboard">Limpar filtros</Link>}
          </form>
          <div className="header-actions"><Link className="button button-secondary" href="/agenda/novo">+ Agendar</Link><Link className="button button-primary" href="/processos/novo">+ Nova perícia</Link></div>
        </div>
      </header>

      {hasDataError && <div className="notice notice-error">Alguns indicadores não puderam ser carregados. Confirme se as migrações 007, 008 e 009 foram executadas integralmente.</div>}

      <section className="dashboard-period-summary">
        <div>
          <span>Escopo dos indicadores</span>
          <strong>{selectedPeriod.label}</strong>
          <small>{selectedProcess ? `${selectedProcess.process_number}${selectedProcess.subject ? ` · ${selectedProcess.subject}` : ""}` : "Todos os processos"}</small>
        </div>
        <div><span>Proposto</span><strong>{formatCurrency(proposedInPeriod)}</strong></div>
        <div><span>Depositado</span><strong>{formatCurrency(depositedInPeriod)}</strong></div>
        <div><span>Resultado previsto</span><strong className={forecastResultInPeriod < 0 ? "metric-negative" : "metric-positive"}>{formatCurrency(forecastResultInPeriod)}</strong></div>
      </section>

      <section className="stats-grid dashboard-primary-stats">
        <article className="card stat-card dashboard-metric-card"><span>Homologado no período</span><strong>{formatCurrency(approvedInPeriod)}</strong><small>{portfolioApproved > 0 ? `${((approvedInPeriod / portfolioApproved) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% da carteira homologada` : "Sem carteira homologada"}</small></article>
        <article className="card stat-card dashboard-metric-card"><span>Levantado no período</span><strong>{formatCurrency(receivedInPeriod)}</strong><small>Receita efetivamente disponível</small></article>
        <article className="card stat-card dashboard-metric-card"><span>Custos realizados</span><strong>{formatCurrency(realizedCostsInPeriod)}</strong><small>{formatCurrency(expensesPaidInPeriod)} despesas + {formatCurrency(tripsCompletedInPeriod)} deslocamentos</small></article>
        <article className={`card stat-card dashboard-metric-card ${cashResultInPeriod < 0 ? "dashboard-metric-negative" : "dashboard-metric-positive"}`}><span>Resultado de caixa</span><strong>{formatCurrency(cashResultInPeriod)}</strong><small>Levantamentos menos custos pagos</small></article>
      </section>

      <section className="card panel dashboard-portfolio-card">
        <div className="panel-header"><div><h2>{selectedProcess ? "Posição financeira do processo" : "Carteira financeira atual"}</h2><p>{selectedProcess ? `Valores acumulados do processo ${selectedProcess.process_number}.` : "Posição acumulada de todos os processos."}</p></div><Link href={feesHref}>Abrir honorários</Link></div>
        <div className="dashboard-portfolio-grid">
          <div><span>Saldo depositado em juízo</span><strong>{formatCurrency(portfolioDepositBalance)}</strong><small>Aguardando levantamento</small></div>
          <div><span>Total ainda a receber</span><strong>{formatCurrency(portfolioReceivable)}</strong><small>Homologado menos levantado</small></div>
          <div><span>Custo operacional previsto</span><strong>{formatCurrency(portfolioCosts)}</strong><small>Despesas e deslocamentos</small></div>
          <div><span>Resultado previsto da carteira</span><strong className={portfolioForecastResult < 0 ? "metric-negative" : "metric-positive"}>{formatCurrency(portfolioForecastResult)}</strong><small>Homologado menos custos previstos</small></div>
          <div><span>Reembolsos pendentes</span><strong>{formatCurrency(portfolioReimbursements)}</strong><small>Valores ainda não recuperados</small></div>
        </div>
      </section>

      <section className="dashboard-operational-grid">
        <Link className="card dashboard-operational-card" href={processesHref}><span>Processos ativos</span><strong>{activeProcesses.length}</strong><small>{urgentProcesses.length} com prioridade alta/urgente</small></Link>
        <Link className="card dashboard-operational-card" href="/agenda"><span>Diligências ativas</span><strong>{activeDiligences.length}</strong><small>{upcomingDiligences.length} futuras · {overdueDiligences.length} vencidas</small></Link>
        <Link className="card dashboard-operational-card" href="/laudos"><span>Laudos em andamento</span><strong>{reportsInProgress.length}</strong><small>{scopedReports.filter((report) => report.status === "in_review").length} em revisão</small></Link>
        <Link className="card dashboard-operational-card" href="/agenda"><span>Prazos próximos</span><strong>{upcomingDeadlines.length}</strong><small>Vencimento nos próximos 7 dias</small></Link>
        <Link className="card dashboard-operational-card dashboard-operational-danger" href="/alertas"><span>Prazos vencidos</span><strong>{overdueDeadlines.length}</strong><small>Exigem tratamento imediato</small></Link>
        <Link className="card dashboard-operational-card" href={feesHref}><span>Pendências financeiras</span><strong>{financialPending.length}</strong><small>Processos com fluxo incompleto</small></Link>
        <Link className="card dashboard-operational-card" href={processesHref}><span>Sem movimentação há 30 dias</span><strong>{staleProcesses.length}</strong><small>Revisar andamento e próximos atos</small></Link>
      </section>

      <section className="dashboard-grid dashboard-financial-grid">
        <article className="card panel">
          <div className="panel-header"><div><h2>{selectedProcess ? "Funil financeiro do processo" : "Funil financeiro da carteira"}</h2><p>Conversão entre proposta, homologação, depósito e levantamento.</p></div><Link href={feesHref}>Detalhar</Link></div>
          <FinancialFunnel items={[
            { label: "Proposto", value: portfolioProposed, help: "Valores apresentados", tone: "blue" },
            { label: "Homologado", value: portfolioApproved, help: "Receita aprovada", tone: "purple" },
            { label: "Depositado", value: portfolioDeposited, help: "Valores ingressados judicialmente", tone: "warning" },
            { label: "Levantado", value: portfolioReceived, help: "Receita efetivamente recebida", tone: "green" },
          ]} />
        </article>

        <article className="card panel">
          <div className="panel-header"><div><h2>Distribuição dos processos</h2><p>{selectedProcess ? "Situação do processo selecionado." : "Situação atual da carteira."}</p></div><Link href={processesHref}>Ver processos</Link></div>
          <StatusBars items={processStatusItems} />
        </article>
      </section>

      <section className="dashboard-grid dashboard-analysis-grid">
        <article className="card panel">
          <div className="panel-header"><div><h2>Fluxo de caixa — últimos 6 meses</h2><p>Levantamentos confirmados versus custos realizados.</p></div><span className="dashboard-update-label">Atualizado agora</span></div>
          <MonthlyCashChart items={monthBuckets} />
        </article>

        <article className="card panel">
          <div className="panel-header"><div><h2>Composição dos custos</h2><p>{selectedPeriod.label}{selectedProcess ? ` · ${selectedProcess.process_number}` : ""}</p></div><Link href={expensesHref}>Abrir despesas</Link></div>
          <BreakdownBars items={expenseBreakdown} />
        </article>
      </section>

      <section className="dashboard-grid dashboard-priority-grid">
        <article className="card panel">
          <div className="panel-header"><div><h2>Prioridades para ação</h2><p>Itens ordenados por urgência operacional e financeira.</p></div><Link href="/alertas">Central de alertas</Link></div>
          {!prioritizedActions.length ? (
            <div className="empty-state dashboard-compact-empty"><strong>Nenhuma pendência crítica localizada.</strong>O fluxo operacional está regular.</div>
          ) : (
            <div className="dashboard-action-list">
              {prioritizedActions.map((action) => (
                <Link className="dashboard-action-row" href={action.href} key={action.key}>
                  <i className={`dashboard-action-indicator action-${action.level}`} />
                  <div><strong>{action.title}</strong><span>{action.description}</span></div>
                  <b className={`dashboard-action-label action-label-${action.level}`}>{action.label}</b>
                  <em>›</em>
                </Link>
              ))}
            </div>
          )}
        </article>

        <article className="card panel">
          <div className="panel-header"><div><h2>Próximos compromissos</h2><p>Agenda operacional dos próximos 7 dias{selectedProcess ? ` para ${selectedProcess.process_number}` : ""}.</p></div><Link href="/agenda">Abrir agenda</Link></div>
          {!upcomingEvents.length ? (
            <div className="empty-state dashboard-compact-empty"><strong>Nenhum compromisso nos próximos 7 dias.</strong></div>
          ) : (
            <div className="dashboard-upcoming-list">
              {upcomingEvents.slice(0, 6).map((event) => {
                const process = relatedProcess(event.processes);
                return (
                  <Link href={`/agenda/${event.id}`} className="dashboard-upcoming-row" key={event.id}>
                    <div className={`agenda-event-icon agenda-icon-${event.event_type}`}>{eventTypeIcon(event.event_type)}</div>
                    <div><strong>{event.title}</strong><span>{eventTypeLabel(event.event_type)}{process?.process_number ? ` · ${process.process_number}` : ""}</span><small>{event.location_name || event.city || "Local não informado"}</small></div>
                    <div><span>Data</span><strong>{formatDateTime(event.starts_at)}</strong></div>
                  </Link>
                );
              })}
            </div>
          )}
        </article>
      </section>

      <section className="card panel dashboard-top-processes">
        <div className="panel-header"><div><h2>{selectedProcess ? "Resultado previsto do processo" : "Processos com maior resultado previsto"}</h2><p>Honorários homologados descontados dos custos previstos.</p></div><Link href={expensesHref}>Analisar custos</Link></div>
        {!topFinancialProcesses.length ? (
          <div className="empty-state dashboard-compact-empty"><strong>Ainda não há valores homologados suficientes para comparação.</strong></div>
        ) : (
          <div className="dashboard-ranking-list">
            {topFinancialProcesses.map((row, index) => {
              const cost = numberValue(row.expenses_forecast_total) + numberValue(row.trip_cost_forecast_total);
              return (
                <Link href={`/honorarios/${row.process_id}`} className="dashboard-ranking-row" key={row.process_id}>
                  <span className="dashboard-ranking-position">{index + 1}</span>
                  <div><strong>{row.process_number}</strong><span>{row.subject || "Objeto não informado"}</span></div>
                  <div><span>Homologado</span><strong>{formatCurrency(row.approved_total)}</strong></div>
                  <div><span>Custos previstos</span><strong>{formatCurrency(cost)}</strong></div>
                  <div><span>Resultado previsto</span><strong className={numberValue(row.forecast_result) < 0 ? "metric-negative" : "metric-positive"}>{formatCurrency(row.forecast_result)}</strong></div>
                  <b>›</b>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
