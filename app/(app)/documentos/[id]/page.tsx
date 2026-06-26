import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/current-organization";
import { updateGeneratedDocumentAction } from "@/app/actions/documents";
import { SubmitButton } from "@/components/submit-button";
import { DOCUMENT_STATUS_OPTIONS, documentStatusLabel } from "@/lib/document-options";
import { formatDateTime } from "@/lib/process-options";

export const metadata = { title: "Documento" };
export default async function DocumentPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ success?: string; error?: string }> }) {
  const { id } = await params; const query = await searchParams; const organization = await getCurrentOrganization(); if (!organization) return null; const supabase = await createClient();
  const { data: document } = await supabase.from("generated_documents").select("*").eq("id", id).eq("organization_id", organization.id).maybeSingle(); if (!document) notFound();
  const [{ data: process }, { data: versions }] = await Promise.all([
    supabase.from("processes").select("id,process_number,subject").eq("id", document.process_id).maybeSingle(),
    supabase.from("document_versions").select("id,version,created_at").eq("document_id", id).order("version", { ascending: false }).limit(20),
  ]);
  const action = updateGeneratedDocumentAction.bind(null, id);
  return <><header className="page-header"><div><p className="eyebrow">{documentStatusLabel(document.status).toUpperCase()} · VERSÃO {document.version}</p><h1>{document.title}</h1><p>Processo {process?.process_number || "não identificado"} · atualizado em {formatDateTime(document.updated_at)}</p></div><div className="header-actions"><Link className="button button-secondary" href={process ? `/processos/${process.id}` : "/documentos"}>Abrir processo</Link><Link className="button button-secondary" href="/configuracoes">Identidade</Link><a className="button button-secondary" href={`/api/documentos/${id}/word`}>Exportar Word</a><a className="button button-primary" href={`/api/documentos/${id}/pdf`}>Exportar PDF</a></div></header>{query.success && <div className="notice notice-success">{query.success}</div>}{query.error && <div className="notice notice-error">{query.error}</div>}<section className="document-detail-grid"><form className="card panel" action={action}><div className="form-grid"><label className="field full"><span>Título</span><input className="input" name="title" defaultValue={document.title} required /></label><label className="field"><span>Status</span><select className="select" name="status" defaultValue={document.status}>{DOCUMENT_STATUS_OPTIONS.map(([value,label]) => <option value={value} key={value}>{label}</option>)}</select></label><div className="field"><span>Versão atual</span><div className="read-only-field">v{document.version}</div></div><label className="field full"><span>Conteúdo</span><textarea className="document-editor" name="content" defaultValue={document.content} required /></label></div><div className="generator-actions"><span>Revise integralmente antes do protocolo.</span><SubmitButton pendingText="Salvando...">Salvar nova versão</SubmitButton></div></form><aside className="card panel"><div className="panel-header"><h2>Histórico</h2><span>{versions?.length || 0} versão(ões)</span></div><div className="version-list">{versions?.map((version) => <div className="version-item" key={version.id}><strong>Versão {version.version}</strong><span>{formatDateTime(version.created_at)}</span></div>)}</div><div className="notice notice-success">Documento gerado automaticamente. A responsabilidade pela revisão e utilização é exclusiva do profissional emitente.</div></aside></section></>;
}
