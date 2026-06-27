import Link from "next/link";
import { deleteExpertReportAction } from "@/app/actions/reports";
import { DeleteReportButton } from "@/components/delete-report-button";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/current-organization";
import { hasPermission } from "@/lib/permissions";
import { formatDateTime } from "@/lib/process-options";
import { REPORT_STATUS_OPTIONS, reportStatusLabel } from "@/lib/report-options";

export const metadata = { title: "Laudos" };

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; type?: string; error?: string; success?: string }> }) {
  const query = await searchParams;
  const organization = await getCurrentOrganization();
  if (!organization) return null;
  const supabase = await createClient();

  let request = supabase
    .from("expert_reports")
    .select("id,title,status,current_version,updated_at,process_id,report_type_id")
    .eq("organization_id", organization.id)
    .order("updated_at", { ascending: false });
  if (query.q) request = request.ilike("title", `%${query.q}%`);
  if (query.status) request = request.eq("status", query.status);
  if (query.type) request = request.eq("report_type_id", query.type);

  const [{ data: reports }, { data: reportTypes }, { data: processes }] = await Promise.all([
    request,
    supabase.from("report_types").select("id,name,specialty").eq("status", "active").order("name"),
    supabase.from("processes").select("id,process_number,subject").eq("organization_id", organization.id),
  ]);

  const processMap = new Map((processes || []).map((item) => [item.id, item]));
  const typeMap = new Map((reportTypes || []).map((item) => [item.id, item]));
  const draftCount = (reports || []).filter((item) => item.status === "draft").length;
  const reviewCount = (reports || []).filter((item) => item.status === "in_review").length;
  const finalCount = (reports || []).filter((item) => ["final", "filed"].includes(item.status)).length;
  const canCreateReport = hasPermission(organization.role, "reports:write");
  const canDelete = ["owner", "admin"].includes(organization.role);

  return (
    <>
      <header className="page-header">
        <div><p className="eyebrow">CONSTRUTOR TÉCNICO</p><h1>Laudos periciais</h1><p>Capítulos modulares, quesitos, anexos, fontes e controle de versões.</p></div>
        {canCreateReport && <div className="header-actions"><Link className="button button-primary" href="/laudos/novo">+ Novo laudo</Link></div>}
      </header>

      {query.success && <div className="notice notice-success">{query.success}</div>}
      {query.error && <div className="notice notice-error">{query.error}</div>}

      <section className="card process-summary-card report-summary-card">
        <div><span>Total localizado</span><strong>{reports?.length || 0}</strong></div>
        <div><span>Em elaboração</span><strong>{draftCount}</strong></div>
        <div><span>Em revisão</span><strong>{reviewCount}</strong></div>
        <div><span>Finalizados/protocolados</span><strong>{finalCount}</strong></div>
      </section>

      <section className="card filter-card">
        <form className="filter-form">
          <label className="field filter-grow"><span>Pesquisar</span><input className="input" name="q" defaultValue={query.q || ""} placeholder="Título do laudo" /></label>
          <label className="field"><span>Status</span><select className="select" name="status" defaultValue={query.status || ""}><option value="">Todos</option>{REPORT_STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="field"><span>Tipo</span><select className="select" name="type" defaultValue={query.type || ""}><option value="">Todos</option>{reportTypes?.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</select></label>
          <button className="button button-secondary filter-button">Filtrar</button>
        </form>
      </section>

      {!reports?.length ? (
        <div className="card empty-state"><strong>Nenhum laudo encontrado.</strong>Crie o primeiro laudo vinculado a um processo.</div>
      ) : (
        <section className="card panel">
          <div className="panel-header"><h2>Laudos cadastrados</h2><span>{reports.length} registro(s)</span></div>
          <div className="entity-list">
            {reports.map((report) => {
              const process = processMap.get(report.process_id);
              const type = typeMap.get(report.report_type_id);
              const deleteAction = deleteExpertReportAction.bind(null, report.id);
              return (
                <article className="entity-list-item" key={report.id}>
                  <Link className="entity-list-link report-list-row" href={`/laudos/${report.id}`}>
                    <div><strong>{report.title}</strong><span>{type?.name || "Tipo não identificado"} · {type?.specialty || "Especialidade não informada"}</span></div>
                    <div><strong>{process?.process_number || "Processo não identificado"}</strong><span>{process?.subject || "Objeto não informado"}</span></div>
                    <span className={`status status-${report.status}`}>{reportStatusLabel(report.status)}</span>
                    <div><strong>v{report.current_version || 0}</strong><span>{formatDateTime(report.updated_at)}</span></div>
                  </Link>
                  {canDelete && <DeleteReportButton action={deleteAction} reportTitle={report.title} compact />}
                </article>
              );
            })}
          </div>
        </section>
      )}
    </>
  );
}
