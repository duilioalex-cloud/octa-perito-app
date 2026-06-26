import Link from "next/link";
import { notFound } from "next/navigation";
import {
  appendTechnicalBlockAction,
  createEquipmentAction,
  createQuestionAction,
  createReportVersionAction,
  createSourceAction,
  deleteEquipmentAction,
  deleteQuestionAction,
  deleteReportAttachmentAction,
  deleteSourceAction,
  moveReportSectionAction,
  toggleReportSectionAction,
  updateExpertReportAction,
  updateQuestionAction,
  updateReportSectionAction,
  uploadReportAttachmentAction,
} from "@/app/actions/reports";
import { SubmitButton } from "@/components/submit-button";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/current-organization";
import { formatDate, formatDateTime } from "@/lib/process-options";
import {
  ATTACHMENT_TYPE_OPTIONS,
  QUESTION_ORIGIN_OPTIONS,
  QUESTION_STATUS_OPTIONS,
  REPORT_STATUS_OPTIONS,
  SECTION_REVIEW_STATUS_OPTIONS,
  SOURCE_TYPE_OPTIONS,
  attachmentTypeLabel,
  contentKindLabel,
  formatFileSize,
  questionOriginLabel,
  questionStatusLabel,
  reportStatusLabel,
  sectionReviewStatusLabel,
  sourceTypeLabel,
  technicalBlockCategoryLabel,
} from "@/lib/report-options";

export const metadata = { title: "Construtor de laudo" };

function warningsFromMetadata(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") return [] as string[];
  const value = (metadata as { review_warnings?: unknown }).review_warnings;
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export default async function ReportBuilderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ success?: string; error?: string }> }) {
  const { id } = await params;
  const query = await searchParams;
  const organization = await getCurrentOrganization();
  if (!organization) return null;
  const supabase = await createClient();

  const { data: report } = await supabase
    .from("expert_reports")
    .select("*")
    .eq("id", id)
    .eq("organization_id", organization.id)
    .maybeSingle();
  if (!report) notFound();

  const [
    { data: process },
    { data: reportType },
    { data: sections },
    { data: questions },
    { data: sources },
    { data: equipment },
    { data: attachments },
    { data: versions },
  ] = await Promise.all([
    supabase.from("processes").select("id,process_number,court,district,division,case_class,plaintiff,defendant,subject,expertise_area").eq("id", report.process_id).eq("organization_id", organization.id).maybeSingle(),
    supabase.from("report_types").select("id,name,specialty,description").eq("id", report.report_type_id).maybeSingle(),
    supabase.from("expert_report_sections").select("*").eq("report_id", id).order("sort_order", { ascending: true }).order("created_at", { ascending: true }),
    supabase.from("expert_report_questions").select("*").eq("report_id", id).order("origin", { ascending: true }).order("sort_order", { ascending: true }).order("created_at", { ascending: true }),
    supabase.from("expert_report_sources").select("*").eq("report_id", id).order("sort_order", { ascending: true }).order("created_at", { ascending: true }),
    supabase.from("expert_report_equipment").select("*").eq("report_id", id).order("sort_order", { ascending: true }).order("created_at", { ascending: true }),
    supabase.from("expert_report_attachments").select("*").eq("report_id", id).order("file_type", { ascending: true }).order("sort_order", { ascending: true }).order("created_at", { ascending: true }),
    supabase.from("expert_report_versions").select("id,version,change_summary,created_at").eq("report_id", id).order("version", { ascending: false }).limit(30),
  ]);

  const { data: technicalBlocks } = await supabase
    .from("technical_blocks")
    .select("id,title,category,description,content,specialty")
    .eq("status", "active")
    .eq("specialty", reportType?.specialty || "")
    .order("category")
    .order("title");

  const enabledSections = (sections || []).filter((section) => section.is_enabled).length;
  const reviewedSections = (sections || []).filter((section) => ["reviewed", "final"].includes(section.review_status)).length;
  const pendingQuestions = (questions || []).filter((question) => question.answer_status === "pending" || !question.answer?.trim()).length;
  const updateReport = updateExpertReportAction.bind(null, id);
  const createQuestion = createQuestionAction.bind(null, id);
  const createSource = createSourceAction.bind(null, id);
  const createEquipment = createEquipmentAction.bind(null, id);
  const uploadAttachment = uploadReportAttachmentAction.bind(null, id);
  const createVersion = createReportVersionAction.bind(null, id);

  return (
    <>
      <header className="page-header">
        <div><p className="eyebrow">{reportStatusLabel(report.status).toUpperCase()} · VERSÃO {report.current_version || 0}</p><h1>{report.title}</h1><p>{process?.process_number || "Processo não identificado"} · {reportType?.name || "Tipo não identificado"}</p></div>
        <div className="header-actions"><Link className="button button-secondary" href="/laudos">Voltar</Link>{process && <Link className="button button-secondary" href={`/processos/${process.id}`}>Abrir processo</Link>}<a className="button button-primary" href={`/api/laudos/${id}/word`}>Exportar Word</a></div>
      </header>

      {query.success && <div className="notice notice-success">{query.success}</div>}
      {query.error && <div className="notice notice-error">{query.error}</div>}

      <section className="card process-summary-card report-summary-card">
        <div><span>Capítulos ativos</span><strong>{enabledSections}/{sections?.length || 0}</strong></div>
        <div><span>Capítulos revisados</span><strong>{reviewedSections}</strong></div>
        <div><span>Quesitos pendentes</span><strong>{pendingQuestions}</strong></div>
        <div><span>Anexos</span><strong>{attachments?.length || 0}</strong></div>
      </section>

      <div className="report-builder-layout">
        <aside className="card report-builder-nav">
          <strong>Navegação do laudo</strong>
          <a href="#dados-gerais">Dados gerais</a>
          <div className="report-nav-group"><span>CAPÍTULOS</span>{sections?.map((section, index) => <a className={!section.is_enabled ? "report-nav-disabled" : ""} href={`#section-${section.id}`} key={section.id}>{index + 1}. {section.title}</a>)}</div>
          <a href="#quesitos">Quesitos <b>{questions?.length || 0}</b></a>
          <a href="#fontes">Fontes <b>{sources?.length || 0}</b></a>
          <a href="#equipamentos">Equipamentos <b>{equipment?.length || 0}</b></a>
          <a href="#anexos">Anexos <b>{attachments?.length || 0}</b></a>
          <a href="#versoes">Versões <b>{versions?.length || 0}</b></a>
        </aside>

        <main className="report-builder-content">
          <section className="card panel report-builder-section" id="dados-gerais">
            <div className="panel-header"><div><h2>Dados gerais</h2><span>Identificação e controle do documento</span></div><span className={`status status-${report.status}`}>{reportStatusLabel(report.status)}</span></div>
            <form action={updateReport}>
              <div className="form-grid">
                <label className="field full"><span>Título</span><input className="input" name="title" defaultValue={report.title} required /></label>
                <label className="field"><span>Status</span><select className="select" name="status" defaultValue={report.status}>{REPORT_STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                <label className="field"><span>Data do laudo</span><input className="input" name="report_date" type="date" defaultValue={report.report_date || ""} /></label>
                <label className="field full"><span>Notas internas</span><textarea className="textarea textarea-small" name="notes" defaultValue={report.notes || ""} /></label>
              </div>
              <div className="generator-actions"><span>Finalizar não substitui a revisão técnica integral.</span><SubmitButton pendingText="Salvando..." className="button button-primary">Salvar dados gerais</SubmitButton></div>
            </form>
            <div className="report-process-facts">
              <div><span>Processo</span><strong>{process?.process_number || "Não informado"}</strong></div>
              <div><span>Comarca/Vara</span><strong>{[process?.district, process?.division].filter(Boolean).join(" · ") || "Não informado"}</strong></div>
              <div><span>Partes</span><strong>{[process?.plaintiff, process?.defendant].filter(Boolean).join(" × ") || "Não informadas"}</strong></div>
              <div><span>Objeto</span><strong>{process?.subject || "Não informado"}</strong></div>
            </div>
          </section>

          <div className="report-chapter-heading"><p className="eyebrow">ESTRUTURA MODULAR</p><h2>Capítulos do laudo</h2><p>Salve cada capítulo separadamente. Use os controles para ativar, desativar e ordenar.</p></div>

          {sections?.map((section, index) => {
            const updateSection = updateReportSectionAction.bind(null, id, section.id);
            const toggleSection = toggleReportSectionAction.bind(null, id, section.id);
            const moveSection = moveReportSectionAction.bind(null, id, section.id);
            const appendBlock = appendTechnicalBlockAction.bind(null, id, section.id);
            const warnings = warningsFromMetadata(section.metadata);
            return (
              <section className={`card panel report-builder-section report-chapter ${!section.is_enabled ? "report-chapter-disabled" : ""}`} id={`section-${section.id}`} key={section.id}>
                <div className="panel-header report-section-header">
                  <div><p className="eyebrow">CAPÍTULO {index + 1} · {contentKindLabel(section.content_kind).toUpperCase()}</p><h2>{section.title}</h2><span>{section.is_required ? "Capítulo obrigatório" : "Capítulo opcional"}</span></div>
                  <div className="report-section-controls">
                    <span className={`section-state section-state-${section.review_status}`}>{sectionReviewStatusLabel(section.review_status)}</span>
                    <form action={moveSection}><input type="hidden" name="direction" value="up" /><button className="button button-ghost button-icon" type="submit" title="Mover para cima" disabled={index === 0}>↑</button></form>
                    <form action={moveSection}><input type="hidden" name="direction" value="down" /><button className="button button-ghost button-icon" type="submit" title="Mover para baixo" disabled={index === (sections.length - 1)}>↓</button></form>
                    {!section.is_required && <form action={toggleSection}><input type="hidden" name="enabled" value={section.is_enabled ? "false" : "true"} /><button className="button button-secondary button-small" type="submit">{section.is_enabled ? "Desativar" : "Ativar"}</button></form>}
                  </div>
                </div>

                {warnings.length > 0 && <div className="review-warning"><strong>Alertas de revisão</strong><ul>{warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></div>}

                <form action={updateSection}>
                  <div className="form-grid">
                    <label className="field full"><span>Título do capítulo</span><input className="input" name="title" defaultValue={section.title} required /></label>
                    <label className="field"><span>Status de revisão</span><select className="select" name="review_status" defaultValue={section.review_status}>{SECTION_REVIEW_STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                    <label className="field checkbox-field"><input name="is_enabled" type="checkbox" defaultChecked={section.is_enabled} disabled={section.is_required} /><span>Incluir na exportação</span>{section.is_required && <input name="is_enabled" type="hidden" value="on" />}</label>
                    <label className="field full"><span>Conteúdo técnico</span><textarea className="document-editor report-section-editor" name="content" defaultValue={section.content || ""} /></label>
                  </div>
                  <div className="generator-actions"><span>Campos entre chaves devem ser substituídos antes da conclusão.</span><SubmitButton pendingText="Salvando capítulo..." className="button button-primary">Salvar capítulo</SubmitButton></div>
                </form>

                {!!technicalBlocks?.length && (
                  <form className="technical-block-inserter" action={appendBlock}>
                    <label className="field"><span>Inserir bloco técnico reutilizável</span><select className="select" name="block_id" required><option value="">Selecione um bloco</option>{technicalBlocks.map((block) => <option key={block.id} value={block.id}>{technicalBlockCategoryLabel(block.category)} — {block.title}</option>)}</select></label>
                    <SubmitButton pendingText="Inserindo..." className="button button-secondary">Inserir ao final</SubmitButton>
                  </form>
                )}
              </section>
            );
          })}

          <section className="card panel report-builder-section" id="quesitos">
            <div className="panel-header"><div><h2>Quesitos e respostas</h2><span>Organize por origem e mantenha o status de cada resposta.</span></div><span className="metric-badge">{questions?.length || 0}</span></div>
            <div className="report-item-stack">
              {questions?.map((question) => {
                const updateQuestion = updateQuestionAction.bind(null, id, question.id);
                const deleteQuestion = deleteQuestionAction.bind(null, id, question.id);
                return (
                  <article className="report-subcard" key={question.id}>
                    <div className="report-subcard-header"><div><strong>{question.question_number ? `Quesito ${question.question_number}` : "Quesito"}</strong><span>{questionOriginLabel(question.origin, question.origin_label)}</span></div><span className={`question-state question-state-${question.answer_status}`}>{questionStatusLabel(question.answer_status)}</span></div>
                    <form action={updateQuestion}>
                      <div className="form-grid">
                        <label className="field"><span>Origem</span><select className="select" name="origin" defaultValue={question.origin}>{QUESTION_ORIGIN_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                        <label className="field"><span>Identificação personalizada</span><input className="input" name="origin_label" defaultValue={question.origin_label || ""} placeholder="Ex.: Quesitos do INSS" /></label>
                        <label className="field"><span>Número</span><input className="input" name="question_number" defaultValue={question.question_number || ""} /></label>
                        <label className="field"><span>Status</span><select className="select" name="answer_status" defaultValue={question.answer_status}>{QUESTION_STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                        <label className="field full"><span>Quesito</span><textarea className="textarea textarea-small" name="question" defaultValue={question.question} required /></label>
                        <label className="field full"><span>Resposta</span><textarea className="document-editor report-answer-editor" name="answer" defaultValue={question.answer || ""} /></label>
                        <label className="field"><span>Ordem</span><input className="input" name="sort_order" type="number" defaultValue={question.sort_order} /></label>
                        <label className="field full"><span>Nota interna</span><input className="input" name="notes" defaultValue={question.notes || ""} /></label>
                      </div>
                      <div className="report-inline-actions"><SubmitButton pendingText="Salvando..." className="button button-primary button-small">Salvar quesito</SubmitButton></div>
                    </form>
                    <form action={deleteQuestion}><button className="button button-danger button-small" type="submit">Excluir quesito</button></form>
                  </article>
                );
              })}
            </div>
            <details className="report-add-panel" open={!questions?.length}>
              <summary>+ Adicionar quesito</summary>
              <form action={createQuestion}>
                <div className="form-grid">
                  <label className="field"><span>Origem</span><select className="select" name="origin" defaultValue="court">{QUESTION_ORIGIN_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                  <label className="field"><span>Identificação personalizada</span><input className="input" name="origin_label" placeholder="Ex.: Quesitos do Ministério Público" /></label>
                  <label className="field"><span>Número</span><input className="input" name="question_number" /></label>
                  <label className="field"><span>Status</span><select className="select" name="answer_status" defaultValue="pending">{QUESTION_STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                  <label className="field full"><span>Quesito</span><textarea className="textarea textarea-small" name="question" required /></label>
                  <label className="field full"><span>Resposta inicial</span><textarea className="textarea" name="answer" /></label>
                  <label className="field"><span>Ordem</span><input className="input" name="sort_order" type="number" defaultValue={(questions?.length || 0) + 1} /></label>
                  <label className="field full"><span>Nota interna</span><input className="input" name="notes" /></label>
                </div>
                <div className="form-actions"><SubmitButton pendingText="Adicionando..." className="button button-primary">Adicionar quesito</SubmitButton></div>
              </form>
            </details>
          </section>

          <section className="card panel report-builder-section" id="fontes">
            <div className="panel-header"><div><h2>Documentos e fontes analisadas</h2><span>Registre a origem dos elementos que sustentam as conclusões.</span></div><span className="metric-badge">{sources?.length || 0}</span></div>
            <div className="report-simple-list">
              {sources?.map((source) => <div className="report-simple-row" key={source.id}><div><strong>{source.title}</strong><span>{sourceTypeLabel(source.source_type)}{source.reference_label ? ` · ${source.reference_label}` : ""}{source.source_date ? ` · ${formatDate(source.source_date)}` : ""}</span>{source.description && <p>{source.description}</p>}</div><form action={deleteSourceAction.bind(null, id, source.id)}><button className="button button-danger button-small" type="submit">Excluir</button></form></div>)}
            </div>
            <details className="report-add-panel" open={!sources?.length}><summary>+ Adicionar fonte</summary><form action={createSource}><div className="form-grid"><label className="field"><span>Tipo</span><select className="select" name="source_type">{SOURCE_TYPE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="field"><span>Data</span><input className="input" name="source_date" type="date" /></label><label className="field full"><span>Título</span><input className="input" name="title" required /></label><label className="field"><span>Referência nos autos</span><input className="input" name="reference_label" placeholder="ID, evento, folha ou documento" /></label><label className="field"><span>Ordem</span><input className="input" name="sort_order" type="number" defaultValue={(sources?.length || 0) + 1} /></label><label className="field full"><span>Descrição</span><textarea className="textarea textarea-small" name="description" /></label><label className="field checkbox-field"><input name="was_analyzed" type="checkbox" defaultChecked /><span>Fonte efetivamente analisada</span></label></div><div className="form-actions"><SubmitButton pendingText="Adicionando..." className="button button-primary">Adicionar fonte</SubmitButton></div></form></details>
          </section>

          <section className="card panel report-builder-section" id="equipamentos">
            <div className="panel-header"><div><h2>Equipamentos</h2><span>Controle de identificação, uso e calibração.</span></div><span className="metric-badge">{equipment?.length || 0}</span></div>
            <div className="report-simple-list">
              {equipment?.map((item) => <div className="report-simple-row" key={item.id}><div><strong>{item.name}</strong><span>{[item.brand, item.model, item.serial_number ? `S/N ${item.serial_number}` : null].filter(Boolean).join(" · ") || "Identificação complementar não informada"}</span>{item.calibration_certificate && <p>Certificado: {item.calibration_certificate} · validade {formatDate(item.calibration_due_date)}</p>}</div><form action={deleteEquipmentAction.bind(null, id, item.id)}><button className="button button-danger button-small" type="submit">Excluir</button></form></div>)}
            </div>
            <details className="report-add-panel" open={!equipment?.length}><summary>+ Adicionar equipamento</summary><form action={createEquipment}><div className="form-grid"><label className="field full"><span>Equipamento</span><input className="input" name="name" required /></label><label className="field"><span>Marca</span><input className="input" name="brand" /></label><label className="field"><span>Modelo</span><input className="input" name="model" /></label><label className="field"><span>Número de série</span><input className="input" name="serial_number" /></label><label className="field"><span>Certificado de calibração</span><input className="input" name="calibration_certificate" /></label><label className="field"><span>Data de calibração</span><input className="input" name="calibration_date" type="date" /></label><label className="field"><span>Validade da calibração</span><input className="input" name="calibration_due_date" type="date" /></label><label className="field"><span>Ordem</span><input className="input" name="sort_order" type="number" defaultValue={(equipment?.length || 0) + 1} /></label><label className="field full"><span>Descrição de uso</span><textarea className="textarea textarea-small" name="usage_description" /></label></div><div className="form-actions"><SubmitButton pendingText="Adicionando..." className="button button-primary">Adicionar equipamento</SubmitButton></div></form></details>
          </section>

          <section className="card panel report-builder-section" id="anexos">
            <div className="panel-header"><div><h2>Fotografias e anexos</h2><span>Arquivos privados vinculados ao laudo e, opcionalmente, a um capítulo.</span></div><span className="metric-badge">{attachments?.length || 0}</span></div>
            <div className="attachment-grid">
              {attachments?.map((attachment) => <article className="attachment-card" key={attachment.id}><div className="attachment-icon">{attachment.file_type === "photo" ? "▧" : "▤"}</div><div><span className="tag">{attachmentTypeLabel(attachment.file_type)}</span><strong>{attachment.caption || attachment.original_name}</strong><small>{formatFileSize(attachment.size_bytes)} · {formatDateTime(attachment.created_at)}</small>{attachment.description && <p>{attachment.description}</p>}<div className="report-inline-actions"><a className="button button-secondary button-small" href={`/api/laudos/anexos/${attachment.id}`}>Abrir</a><form action={deleteReportAttachmentAction.bind(null, id, attachment.id)}><button className="button button-danger button-small" type="submit">Excluir</button></form></div></div></article>)}
            </div>
            <details className="report-add-panel" open={!attachments?.length}><summary>+ Enviar arquivo</summary><form action={uploadAttachment} encType="multipart/form-data"><div className="form-grid"><label className="field full"><span>Arquivo</span><input className="input file-input" name="file" type="file" accept="image/jpeg,image/png,image/webp,application/pdf,.docx,.xlsx" required /></label><label className="field"><span>Tipo</span><select className="select" name="file_type">{ATTACHMENT_TYPE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="field"><span>Vincular ao capítulo</span><select className="select" name="section_id"><option value="">Sem vínculo específico</option>{sections?.map((section) => <option key={section.id} value={section.id}>{section.title}</option>)}</select></label><label className="field full"><span>Legenda</span><input className="input" name="caption" placeholder="Ex.: Figura 1 — Vista geral da área vistoriada" /></label><label className="field"><span>Data e hora da captura</span><input className="input" name="captured_at" type="datetime-local" /></label><label className="field"><span>Local</span><input className="input" name="location_text" /></label><label className="field"><span>Ordem</span><input className="input" name="sort_order" type="number" defaultValue={(attachments?.length || 0) + 1} /></label><label className="field full"><span>Descrição</span><textarea className="textarea textarea-small" name="description" /></label></div><div className="notice notice-neutral">Formatos aceitos: JPG, PNG, WEBP, PDF, DOCX e XLSX. Limite de 10 MB por arquivo.</div><div className="form-actions"><SubmitButton pendingText="Enviando..." className="button button-primary">Enviar arquivo</SubmitButton></div></form></details>
          </section>

          <section className="card panel report-builder-section" id="versoes">
            <div className="panel-header"><div><h2>Histórico de versões</h2><span>Snapshots completos e imutáveis do laudo.</span></div><span className="metric-badge">{versions?.length || 0}</span></div>
            <form className="version-create-form" action={createVersion}><label className="field filter-grow"><span>Resumo da alteração</span><input className="input" name="change_summary" placeholder="Ex.: revisão dos quesitos e inclusão de fotografias" /></label><SubmitButton pendingText="Registrando..." className="button button-primary">Registrar versão</SubmitButton></form>
            <div className="version-list">{versions?.map((version) => <div className="version-item" key={version.id}><div><strong>Versão {version.version}</strong><small>{version.change_summary || "Sem resumo informado"}</small></div><span>{formatDateTime(version.created_at)}</span></div>)}</div>
          </section>
        </main>
      </div>
    </>
  );
}
