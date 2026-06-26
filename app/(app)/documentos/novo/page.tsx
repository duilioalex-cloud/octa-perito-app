import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/current-organization";
import { createGeneratedDocumentAction } from "@/app/actions/documents";
import { DocumentGenerator } from "@/components/document-generator";
import { formatCurrency, formatDate } from "@/lib/process-options";
import { templateBody } from "@/lib/document-options";

export const metadata = { title: "Gerar documento" };
const today = () => new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(new Date());

export default async function NewDocumentPage({ searchParams }: { searchParams: Promise<{ template?: string; process?: string; error?: string }> }) {
  const query = await searchParams; const organization = await getCurrentOrganization(); if (!organization) return null; const supabase = await createClient();
  const { data: templates } = await supabase.from("templates").select("id,title").eq("status", "active").order("is_octa_model", { ascending: false }).order("sort_order");
  const { data: processes } = await supabase.from("processes").select("id,process_number,subject").eq("organization_id", organization.id).order("updated_at", { ascending: false });
  if (!query.template || !query.process) return <><header className="page-header"><div><p className="eyebrow">GERADOR DE DOCUMENTOS</p><h1>Selecionar base</h1><p>Escolha o processo e o modelo que serão usados na geração.</p></div><Link className="button button-secondary" href="/biblioteca">Voltar</Link></header>{query.error && <div className="notice notice-error">{query.error}</div>}<form className="card form-card" method="get"><div className="form-grid"><label className="field full"><span>Processo</span><select className="select" name="process" defaultValue={query.process || ""} required><option value="">Selecione</option>{processes?.map((p) => <option value={p.id} key={p.id}>{p.process_number} — {p.subject || "Sem objeto"}</option>)}</select></label><label className="field full"><span>Modelo</span><select className="select" name="template" defaultValue={query.template || ""} required><option value="">Selecione</option>{templates?.map((t) => <option value={t.id} key={t.id}>{t.title}</option>)}</select></label></div><div className="form-actions"><button className="button button-primary">Continuar</button></div></form></>;

  const [{ data: template }, { data: process }, { data: { user } }] = await Promise.all([
    supabase.from("templates").select("*").eq("id", query.template).maybeSingle(),
    supabase.from("processes").select("*").eq("id", query.process).eq("organization_id", organization.id).maybeSingle(),
    supabase.auth.getUser(),
  ]);
  if (!template || !process || !user) return <div className="notice notice-error">Modelo ou processo não encontrado.</div>;
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  const initialValues: Record<string,string> = {
    tratamento_juizo: "EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DE DIREITO",
    vara: process.division || "",
    comarca: process.district || "",
    numero_processo: process.process_number || "",
    classe_processual: process.case_class || "",
    autor: process.plaintiff || "",
    reu: process.defendant || "",
    nome_perito: profile?.full_name || user.user_metadata?.full_name || "",
    qualificacao_profissional: profile?.professional_title || "",
    registro_profissional: [profile?.council, profile?.council_number].filter(Boolean).join(" nº "),
    objeto_pericia: process.subject || "",
    data_diligencia: formatDate(process.diligence_at),
    horario_diligencia: process.diligence_at ? new Date(process.diligence_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "",
    valor_arbitrado: formatCurrency(process.fee_arbitrated),
    valor_requerido: formatCurrency(process.fee_proposed),
    prazo_original: formatDate(process.report_due_at),
    data_final_atual: formatDate(process.report_due_at),
    cidade_assinatura: process.district || "",
    data_assinatura: today(),
  };
  for (const variable of template.variables || []) if (!(variable in initialValues)) initialValues[variable] = "";
  const action = createGeneratedDocumentAction.bind(null, template.id, process.id);
  return <><header className="page-header"><div><p className="eyebrow">GERADOR DE PETIÇÕES</p><h1>{template.title}</h1><p>Processo {process.process_number}. Revise todos os campos antes de salvar.</p></div><Link className="button button-secondary" href={`/biblioteca/${template.id}`}>Trocar modelo</Link></header>{query.error && <div className="notice notice-error">{query.error}</div>}<DocumentGenerator title={`${template.title} — ${process.process_number}`} templateBody={templateBody(template.content)} variables={template.variables || []} initialValues={initialValues} action={action} /></>;
}
