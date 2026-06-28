import Link from "next/link";
import { notFound } from "next/navigation";
import { SubmitButton } from "@/components/submit-button";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/current-organization";
import { hasPermission } from "@/lib/permissions";
import { completeDeadlineAction, createDeadlineAction } from "@/app/actions/deadlines";
import { generateFeeProposalDocumentAction, saveFeeCalculatorAction } from "@/app/actions/fees";
import { deleteProcessAction, updateProcessStatusAction } from "@/app/actions/processes";
import { deleteExpertReportAction } from "@/app/actions/reports";
import { DeleteProcessButton } from "@/components/delete-process-button";
import { DeleteReportButton } from "@/components/delete-report-button";
import { FeeCalculator } from "@/components/fee-calculator";
import {
  DEADLINE_CATEGORY_OPTIONS,
  deadlineCategoryLabel,
  expertiseTypeLabel,
  formatCurrency,
  formatDate,
  formatDateTime,
  priorityLabel,
  PRIORITY_OPTIONS,
  PROCESS_STATUS_OPTIONS,
  processStatusLabel,
} from "@/lib/process-options";

export const metadata = { title: "Detalhes da perícia" };

function num(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function moneyFromSummary(summaryValue: number | string | null | undefined, processValue: number | string | null | undefined) {
  const summary = num(summaryValue);
  const process = num(processValue);
  return summary > 0 || process <= 0 ? summary : process;
}

export default async function ProcessDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; success?: string }> }) {
  const { id } = await params;
  const query = await searchParams;
  const organization = await getCurrentOrganization();
  if (!organization) return null;
  const canViewFinance = hasPermission(organization.role, "finance:view");
  const canWriteDocuments = hasPermission(organization.role, "documents:write");
  const canWriteReports = hasPermission(organization.role, "reports:write");
  const canWriteCalendar = hasPermission(organization.role, "calendar:write");
  const canWriteProcess = hasPermission(organization.role, "processes:write");
  const supabase = await createClient();

  const [{ data: process }, { data: deadlines }, { data: activities }, { data: documents }, { data: reports }, { data: financialSummary }, { data: primaryFee }, { data: calculatorExpense }] = await Promise.all([
    supabase.from("processes").select("*").eq("id", id).eq("organization_id", organization.id).maybeSingle(),
    supabase.from("process_deadlines").select("*").eq("process_id", id).eq("organization_id", organization.id).order("due_at", { ascending: true }),
    supabase.from("process_activities").select("id, activity_type, description, created_at").eq("process_id", id).eq("organization_id", organization.id).order("created_at", { ascending: false }).limit(12),
    supabase.from("generated_documents").select("id,title,status,version,updated_at").eq("process_id", id).eq("organization_id", organization.id).order("updated_at", { ascending: false }),
    supabase.from("expert_reports").select("id,title,status,current_version,updated_at").eq("process_id", id).eq("organization_id", organization.id).order("updated_at", { ascending: false }),
    canViewFinance
      ? supabase.from("process_financial_summary").select("proposed_total,approved_total,deposited_total,deposit_balance,received_total,expenses_forecast_total,trip_cost_forecast_total,operational_cost_forecast_total,forecast_result,financial_status").eq("process_id", id).eq("organization_id", organization.id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    canViewFinance
      ? supabase.from("process_fees").select("id,proposed_amount,advance_percentage,notes,metadata,updated_at").eq("process_id", id).eq("organization_id", organization.id).eq("is_primary", true).neq("status", "cancelled").order("updated_at", { ascending: false }).limit(1).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    canViewFinance
      ? supabase.from("process_expenses").select("id,total_amount,metadata,updated_at").eq("process_id", id).eq("organization_id", organization.id).contains("metadata", { source: "fee_calculator" }).order("updated_at", { ascending: false }).limit(1).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  if (!process) notFound();

  const details = [
    ["Número do processo", process.process_number],
    ["Tribunal", process.court || "Não informado"],
    ["Comarca", process.district || "Não informada"],
    ["Vara", process.division || "Não informada"],
    ["Classe processual", process.case_class || "Não informada"],
    ["Área da perícia", process.expertise_area || "Não informada"],
    ["Tipo de atuação", expertiseTypeLabel(process.expertise_type)],
    ["Prioridade", priorityLabel(process.priority)],
    ["Responsável", process.responsible_name || "Não informado"],
    ["Autor", process.plaintiff || "Não informado"],
    ["Réu", process.defendant || "Não informado"],
    ["Objeto", process.subject || "Não informado"],
    ["Data da nomeação", formatDate(process.appointed_at)],
    ["Prazo para manifestação", formatDate(process.appointment_response_due_at)],
    ["Diligência", formatDateTime(process.diligence_at)],
    ["Prazo do laudo", formatDate(process.report_due_at)],
  ];

  const statusAction = updateProcessStatusAction.bind(null, id);
  const deadlineAction = createDeadlineAction.bind(null, id);
  const deleteProcess = deleteProcessAction.bind(null, id);
  const calculatorAction = saveFeeCalculatorAction.bind(null, id, primaryFee?.id || null, calculatorExpense?.id || null);
  const proposalAction = generateFeeProposalDocumentAction.bind(null, id);
  const canDelete = ["owner", "admin"].includes(organization.role);
  const calculatorMetadata = ((primaryFee?.metadata as any)?.calculator || (calculatorExpense?.metadata as any)?.calculator || null) as Record<string, any> | null;
  const proposedTotal = moneyFromSummary(financialSummary?.proposed_total, process.fee_proposed);
  const approvedTotal = moneyFromSummary(financialSummary?.approved_total, process.fee_arbitrated);
  const depositedTotal = moneyFromSummary(financialSummary?.deposited_total, process.fee_deposited);
  const receivedTotal = moneyFromSummary(financialSummary?.received_total, process.fee_received);
  const operationalCost = num(financialSummary?.operational_cost_forecast_total ?? ((financialSummary?.expenses_forecast_total ?? 0) + (financialSummary?.trip_cost_forecast_total ?? 0)));
  const forecastResult = approvedTotal > 0 ? approvedTotal - operationalCost : num(financialSummary?.forecast_result);

  return (
    <>
      <header className="page-header">
        <div><p className="eyebrow">PROCESSO PERICIAL</p><h1>{process.process_number}</h1><p>{process.subject || "Objeto ainda não informado"}</p></div>
        <div className="header-actions"><Link className="button button-secondary" href="/processos">Voltar</Link>{canWriteDocuments && <Link className="button button-secondary" href={`/documentos/novo?process=${id}`}>Gerar petição</Link>}{canWriteReports && <Link className="button button-secondary" href={`/laudos/novo?process=${id}`}>Criar laudo</Link>}{canViewFinance && <Link className="button button-secondary" href={`/honorarios/${id}`}>Honorários</Link>}{canViewFinance && <Link className="button button-secondary" href={`/despesas/${id}`}>Despesas</Link>}{canWriteCalendar && <Link className="button button-secondary" href={`/agenda/novo?process=${id}`}>Agendar</Link>}{canWriteProcess && <Link className="button button-primary" href={`/processos/${id}/editar`}>Editar processo</Link>}{canDelete && <DeleteProcessButton action={deleteProcess} processNumber={process.process_number} />}</div>
      </header>

      {query.error && <div className="notice notice-error">{query.error}</div>}
      {query.success && <div className="notice notice-success">{query.success}</div>}

      <section className={`card process-summary-card ${canViewFinance ? "process-finance-summary-card" : ""}`}>
        <div><span>Status atual</span><strong>{processStatusLabel(process.status)}</strong></div>
        {canViewFinance ? (
          <>
            <div><span>Honorários homologados</span><strong>{formatCurrency(approvedTotal)}</strong></div>
            <div><span>Honorários propostos</span><strong>{formatCurrency(proposedTotal)}</strong></div>
            <div><span>Custo previsto</span><strong>{formatCurrency(operationalCost)}</strong></div>
            <div><span>Resultado previsto</span><strong>{formatCurrency(forecastResult)}</strong></div>
            <div><span>Depositado</span><strong>{formatCurrency(depositedTotal)}</strong></div>
            <div><span>Recebido</span><strong>{formatCurrency(receivedTotal)}</strong></div>
          </>
        ) : (
          <>
            <div><span>Prioridade</span><strong>{priorityLabel(process.priority)}</strong></div>
            <div><span>Prazo do laudo</span><strong>{formatDate(process.report_due_at)}</strong></div>
            <div><span>Responsável</span><strong>{process.responsible_name || "Não informado"}</strong></div>
          </>
        )}
      </section>

      <section className="dashboard-grid process-main-grid">
        <article className="card panel">
          <div className="panel-header"><h2>Dados essenciais</h2><span className={`status status-${process.status}`}>{processStatusLabel(process.status)}</span></div>
          <div className="detail-grid">{details.map(([label, value]) => <div className="detail-item" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
          <div className="notes-box"><span>Observações</span><p>{process.notes || "Nenhuma observação registrada."}</p></div>
        </article>

        <aside className="process-side-stack">
          <article className="card panel">
            <div className="panel-header"><h2>Atualizar etapa</h2></div>
            <form className="status-form" action={statusAction}>
              <select className="select" name="status" defaultValue={process.status}>{PROCESS_STATUS_OPTIONS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select>
              <SubmitButton pendingText="Atualizando...">Salvar status</SubmitButton>
            </form>
          </article>

          <article className="card panel">
            <div className="panel-header"><h2>Novo prazo</h2></div>
            <form className="form-stack compact-form" action={deadlineAction}>
              <label className="field"><span>Título</span><input className="input" name="title" placeholder="Ex.: manifestação sobre honorários" required /></label>
              <label className="field"><span>Categoria</span><select className="select" name="category">{DEADLINE_CATEGORY_OPTIONS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
              <label className="field"><span>Data e hora</span><input className="input" name="due_at" type="datetime-local" required /></label>
              <label className="field"><span>Prioridade</span><select className="select" name="priority" defaultValue="normal">{PRIORITY_OPTIONS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
              <label className="field"><span>Observação</span><textarea className="textarea textarea-small" name="notes" /></label>
              <SubmitButton pendingText="Cadastrando...">Adicionar prazo</SubmitButton>
            </form>
          </article>
        </aside>
      </section>

      {canViewFinance && (
        <FeeCalculator
          action={calculatorAction}
          proposalAction={canWriteDocuments ? proposalAction : undefined}
          processInfo={{
            processNumber: process.process_number,
            court: process.court || "",
            district: process.district || "",
            division: process.division || "",
            caseClass: process.case_class || "",
            subject: process.subject || "",
            appointedAt: formatDate(process.appointed_at),
            reportDueAt: formatDate(process.report_due_at),
            expertiseArea: process.expertise_area || "",
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

      <section className="dashboard-grid">
        <article className="card panel">
          <div className="panel-header"><h2>Prazos e compromissos</h2><span>{deadlines?.length ?? 0} item(ns)</span></div>
          {!deadlines?.length ? <div className="empty-state"><strong>Nenhum prazo cadastrado.</strong>Use o formulário ao lado para incluir o primeiro prazo.</div> : (
            <div className="deadline-list">
              {deadlines.map((deadline) => (
                <div className={`deadline-row deadline-${deadline.status}`} key={deadline.id}>
                  <div><strong>{deadline.title}</strong><span>{deadlineCategoryLabel(deadline.category)} · {priorityLabel(deadline.priority)}</span>{deadline.notes && <small>{deadline.notes}</small>}</div>
                  <div className="deadline-date"><small>Data</small><b>{formatDateTime(deadline.due_at)}</b></div>
                  {deadline.status === "pending" ? (
                    <form action={completeDeadlineAction.bind(null, id, deadline.id)}><button className="button button-ghost button-small" type="submit">Concluir</button></form>
                  ) : <span className="status">{deadline.status === "completed" ? "Concluído" : "Cancelado"}</span>}
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="card panel">
          <div className="panel-header"><h2>Histórico recente</h2></div>
          {!activities?.length ? <div className="empty-state"><strong>Nenhum histórico registrado.</strong></div> : (
            <div className="activity-list">{activities.map((activity) => <div className="activity-item" key={activity.id}><i></i><div><strong>{activity.description}</strong><span>{formatDateTime(activity.created_at)}</span></div></div>)}</div>
          )}
        </article>
      </section>
      <section className="card panel" style={{ marginTop: 16 }}>
        <div className="panel-header"><h2>Documentos do processo</h2><Link href={`/documentos/novo?process=${id}`}>Gerar documento</Link></div>
        {!documents?.length ? <div className="empty-state"><strong>Nenhum documento gerado.</strong>Use a Biblioteca Técnica para criar a primeira petição.</div> : <div className="list">{documents.map((document) => <Link className="list-row document-process-row" href={`/documentos/${document.id}`} key={document.id}><div><strong>{document.title}</strong><span>Versão {document.version}</span></div><div><span>Status</span><strong>{document.status}</strong></div><div><span>Atualizado</span><strong>{formatDateTime(document.updated_at)}</strong></div></Link>)}</div>}
      </section>

      <section className="card panel" style={{ marginTop: 16 }}>
        <div className="panel-header"><h2>Laudos periciais</h2><Link href={`/laudos/novo?process=${id}`}>Criar laudo</Link></div>
        {!reports?.length ? (
          <div className="empty-state"><strong>Nenhum laudo criado.</strong>Inicie um laudo modular vinculado a este processo.</div>
        ) : (
          <div className="entity-list">
            {reports.map((report) => {
              const deleteReport = deleteExpertReportAction.bind(null, report.id);
              return (
                <article className="entity-list-item" key={report.id}>
                  <Link className="entity-list-link document-process-row" href={`/laudos/${report.id}`}>
                    <div><strong>{report.title}</strong><span>Versão {report.current_version || 0}</span></div>
                    <div><span>Status</span><strong>{report.status}</strong></div>
                    <div><span>Atualizado</span><strong>{formatDateTime(report.updated_at)}</strong></div>
                  </Link>
                  {canDelete && <DeleteReportButton action={deleteReport} reportTitle={report.title} compact />}
                </article>
              );
            })}
          </div>
        )}
      </section>

    </>
  );
}
