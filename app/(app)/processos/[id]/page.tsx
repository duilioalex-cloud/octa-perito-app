import Link from "next/link";
import { notFound } from "next/navigation";
import { SubmitButton } from "@/components/submit-button";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/current-organization";
import { completeDeadlineAction, createDeadlineAction } from "@/app/actions/deadlines";
import { deleteProcessAction, updateProcessStatusAction } from "@/app/actions/processes";
import { deleteExpertReportAction } from "@/app/actions/reports";
import { DeleteProcessButton } from "@/components/delete-process-button";
import { DeleteReportButton } from "@/components/delete-report-button";
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

export default async function ProcessDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; success?: string }> }) {
  const { id } = await params;
  const query = await searchParams;
  const organization = await getCurrentOrganization();
  if (!organization) return null;
  const supabase = await createClient();

  const [{ data: process }, { data: deadlines }, { data: activities }, { data: documents }, { data: reports }, { data: financialSummary }] = await Promise.all([
    supabase.from("processes").select("*").eq("id", id).eq("organization_id", organization.id).maybeSingle(),
    supabase.from("process_deadlines").select("*").eq("process_id", id).eq("organization_id", organization.id).order("due_at", { ascending: true }),
    supabase.from("process_activities").select("id, activity_type, description, created_at").eq("process_id", id).eq("organization_id", organization.id).order("created_at", { ascending: false }).limit(12),
    supabase.from("generated_documents").select("id,title,status,version,updated_at").eq("process_id", id).eq("organization_id", organization.id).order("updated_at", { ascending: false }),
    supabase.from("expert_reports").select("id,title,status,current_version,updated_at").eq("process_id", id).eq("organization_id", organization.id).order("updated_at", { ascending: false }),
    supabase.from("process_financial_summary").select("proposed_total,approved_total,deposited_total,deposit_balance,received_total,financial_status").eq("process_id", id).eq("organization_id", organization.id).maybeSingle(),
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
  const canDelete = ["owner", "admin"].includes(organization.role);

  return (
    <>
      <header className="page-header">
        <div><p className="eyebrow">PROCESSO PERICIAL</p><h1>{process.process_number}</h1><p>{process.subject || "Objeto ainda não informado"}</p></div>
        <div className="header-actions"><Link className="button button-secondary" href="/processos">Voltar</Link><Link className="button button-secondary" href={`/documentos/novo?process=${id}`}>Gerar petição</Link><Link className="button button-secondary" href={`/laudos/novo?process=${id}`}>Criar laudo</Link><Link className="button button-secondary" href={`/honorarios/${id}`}>Honorários</Link><Link className="button button-secondary" href={`/despesas/${id}`}>Despesas</Link><Link className="button button-primary" href={`/processos/${id}/editar`}>Editar processo</Link>{canDelete && <DeleteProcessButton action={deleteProcess} processNumber={process.process_number} />}</div>
      </header>

      {query.error && <div className="notice notice-error">{query.error}</div>}
      {query.success && <div className="notice notice-success">{query.success}</div>}

      <section className="card process-summary-card">
        <div><span>Status atual</span><strong>{processStatusLabel(process.status)}</strong></div>
        <div><span>Honorários homologados</span><strong>{formatCurrency(financialSummary?.approved_total ?? process.fee_arbitrated)}</strong></div>
        <div><span>Depositado</span><strong>{formatCurrency(financialSummary?.deposited_total ?? process.fee_deposited)}</strong></div>
        <div><span>Recebido</span><strong>{formatCurrency(financialSummary?.received_total ?? process.fee_received)}</strong></div>
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
