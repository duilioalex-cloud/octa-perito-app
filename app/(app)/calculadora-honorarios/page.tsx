import Link from "next/link";
import { FeeCalculator } from "@/components/fee-calculator";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentOrganization } from "@/lib/current-organization";
import { hasPermission } from "@/lib/permissions";
import { generateFeeProposalDocumentAction, saveFeeCalculatorAction } from "@/app/actions/fees";
import { formatCurrency, formatDate, processStatusLabel } from "@/lib/process-options";

export const metadata = { title: "Calculadora de honorarios" };

function num(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function moneyFromSummary(summaryValue: number | string | null | undefined, processValue: number | string | null | undefined) {
  const summary = num(summaryValue);
  const process = num(processValue);
  return summary > 0 || process <= 0 ? summary : process;
}

export default async function FeeCalculatorPage({
  searchParams,
}: {
  searchParams: Promise<{ process?: string; q?: string; error?: string; success?: string }>;
}) {
  const query = await searchParams;
  const organization = await requireCurrentOrganization("finance:view");
  const canWriteFinance = hasPermission(organization.role, "finance:write");
  const canWriteDocuments = hasPermission(organization.role, "documents:write");
  const supabase = await createClient();

  const { data: processes } = await supabase
    .from("processes")
    .select("id,process_number,court,district,division,case_class,plaintiff,defendant,subject,status,expertise_area,appointed_at,report_due_at,fee_proposed,fee_arbitrated,fee_deposited,fee_received,updated_at")
    .eq("organization_id", organization.id)
    .order("updated_at", { ascending: false });

  const search = (query.q || "").trim().toLocaleLowerCase("pt-BR");
  const filteredProcesses = (processes || []).filter((process) => {
    if (!search) return true;
    return `${process.process_number} ${process.subject || ""} ${process.plaintiff || ""} ${process.defendant || ""}`.toLocaleLowerCase("pt-BR").includes(search);
  });

  const selectedProcessId = query.process || "";
  const selectedProcess = selectedProcessId ? (processes || []).find((process) => process.id === selectedProcessId) || null : null;

  const [{ data: financialSummary }, { data: primaryFee }, { data: calculatorExpense }] = selectedProcess
    ? await Promise.all([
        supabase
          .from("process_financial_summary")
          .select("proposed_total,approved_total,expenses_forecast_total,trip_cost_forecast_total,operational_cost_forecast_total,forecast_result")
          .eq("process_id", selectedProcess.id)
          .eq("organization_id", organization.id)
          .maybeSingle(),
        supabase
          .from("process_fees")
          .select("id,proposed_amount,advance_percentage,notes,metadata,updated_at")
          .eq("process_id", selectedProcess.id)
          .eq("organization_id", organization.id)
          .eq("is_primary", true)
          .neq("status", "cancelled")
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("process_expenses")
          .select("id,total_amount,metadata,updated_at")
          .eq("process_id", selectedProcess.id)
          .eq("organization_id", organization.id)
          .contains("metadata", { source: "fee_calculator" })
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ])
    : [{ data: null }, { data: null }, { data: null }];

  const calculatorAction = selectedProcess && canWriteFinance
    ? saveFeeCalculatorAction.bind(null, selectedProcess.id, primaryFee?.id || null, calculatorExpense?.id || null)
    : null;
  const proposalAction = selectedProcess && canWriteDocuments
    ? generateFeeProposalDocumentAction.bind(null, selectedProcess.id)
    : undefined;
  const calculatorMetadata = ((primaryFee?.metadata as any)?.calculator || (calculatorExpense?.metadata as any)?.calculator || null) as Record<string, any> | null;
  const proposedTotal = selectedProcess ? moneyFromSummary(financialSummary?.proposed_total, selectedProcess.fee_proposed) : 0;
  const approvedTotal = selectedProcess ? moneyFromSummary(financialSummary?.approved_total, selectedProcess.fee_arbitrated) : 0;
  const operationalCost = num(financialSummary?.operational_cost_forecast_total ?? ((financialSummary?.expenses_forecast_total ?? 0) + (financialSummary?.trip_cost_forecast_total ?? 0)));
  const forecastResult = approvedTotal > 0 ? approvedTotal - operationalCost : num(financialSummary?.forecast_result);

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">HONORARIOS E PROPOSTA</p>
          <h1>Calculadora de honorarios</h1>
          <p>Calcule o valor a cobrar, salve no processo e gere a proposta de honorarios com memoria de calculo.</p>
        </div>
        <div className="header-actions">
          <Link className="button button-secondary" href="/honorarios">Honorarios</Link>
          <Link className="button button-primary" href="/processos/novo">Nova pericia</Link>
        </div>
      </header>

      {query.error && <div className="notice notice-error">{query.error}</div>}
      {query.success && <div className="notice notice-success">{query.success}</div>}

      <section className="card panel">
        <div className="panel-header">
          <div>
            <h2>Selecionar processo</h2>
            <span>Escolha a pericia que recebera o valor a cobrar e a proposta.</span>
          </div>
          <span>{filteredProcesses.length} processo(s)</span>
        </div>
        <form className="filter-form finance-filter-form" method="get">
          <label className="field filter-grow">
            <span>Buscar</span>
            <input className="input" name="q" defaultValue={query.q || ""} placeholder="Numero, parte ou objeto" />
          </label>
          <label className="field">
            <span>Processo</span>
            <select className="select" name="process" defaultValue={selectedProcessId}>
              <option value="">Selecione</option>
              {filteredProcesses.map((process) => (
                <option value={process.id} key={process.id}>{process.process_number} - {process.subject || "Sem objeto"}</option>
              ))}
            </select>
          </label>
          <button className="button button-secondary" type="submit">Carregar</button>
          {(query.q || selectedProcessId) && <Link className="button button-ghost" href="/calculadora-honorarios">Limpar</Link>}
        </form>
      </section>

      {!selectedProcess ? (
        <section className="card panel" style={{ marginTop: 16 }}>
          <div className="panel-header"><h2>Processos recentes</h2><span>Escolha um processo para calcular</span></div>
          {!filteredProcesses.length ? (
            <div className="empty-state"><strong>Nenhum processo encontrado.</strong>Cadastre uma pericia para iniciar a proposta de honorarios.</div>
          ) : (
            <div className="finance-process-list">
              {filteredProcesses.slice(0, 12).map((process) => (
                <Link className="finance-process-row" href={`/calculadora-honorarios?process=${process.id}`} key={process.id}>
                  <div className="finance-process-main"><strong>{process.process_number}</strong><span>{process.subject || "Objeto nao informado"}</span></div>
                  <div><span>Status</span><b>{processStatusLabel(process.status)}</b></div>
                  <div><span>Proposto</span><strong>{formatCurrency(process.fee_proposed)}</strong></div>
                  <div><span>Arbitrado</span><strong>{formatCurrency(process.fee_arbitrated)}</strong></div>
                  <div><span>Laudo</span><strong>{formatDate(process.report_due_at)}</strong></div>
                  <div className="finance-row-arrow" aria-hidden="true">›</div>
                </Link>
              ))}
            </div>
          )}
        </section>
      ) : (
        <>
          <section className="card process-summary-card process-finance-summary-card" style={{ marginTop: 16 }}>
            <div><span>Processo</span><strong>{selectedProcess.process_number}</strong></div>
            <div><span>Status</span><strong>{processStatusLabel(selectedProcess.status)}</strong></div>
            <div><span>Ja proposto</span><strong>{formatCurrency(proposedTotal)}</strong></div>
            <div><span>Homologado</span><strong>{formatCurrency(approvedTotal)}</strong></div>
          </section>

          {!calculatorAction ? (
            <div className="notice notice-error">Seu nivel de acesso permite visualizar, mas nao permite salvar calculos financeiros.</div>
          ) : (
            <FeeCalculator
              action={calculatorAction}
              proposalAction={proposalAction}
              returnTo={`/calculadora-honorarios?process=${selectedProcess.id}`}
              processInfo={{
                processNumber: selectedProcess.process_number,
                court: selectedProcess.court || "",
                district: selectedProcess.district || "",
                division: selectedProcess.division || "",
                caseClass: selectedProcess.case_class || "",
                subject: selectedProcess.subject || "",
                appointedAt: formatDate(selectedProcess.appointed_at),
                reportDueAt: formatDate(selectedProcess.report_due_at),
                expertiseArea: selectedProcess.expertise_area || "",
              }}
              summary={{
                proposedTotal,
                approvedTotal,
                operationalCost,
                forecastResult,
              }}
              initial={calculatorMetadata ? { calculator: calculatorMetadata, memoryText: calculatorMetadata.memory_text || primaryFee?.notes || "" } : null}
            />
          )}
        </>
      )}
    </>
  );
}
