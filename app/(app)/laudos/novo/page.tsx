import Link from "next/link";
import { createExpertReportAction } from "@/app/actions/reports";
import { SubmitButton } from "@/components/submit-button";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentOrganization } from "@/lib/current-organization";

export const metadata = { title: "Novo laudo" };

export default async function NewReportPage({ searchParams }: { searchParams: Promise<{ process?: string; error?: string }> }) {
  const query = await searchParams;
  const organization = await requireCurrentOrganization("reports:write");
  const supabase = await createClient();
  const [{ data: processes }, { data: reportTypes }] = await Promise.all([
    supabase.from("processes").select("id,process_number,subject,expertise_area,status").eq("organization_id", organization.id).order("updated_at", { ascending: false }),
    supabase.from("report_types").select("id,name,specialty,description,is_octa_model").eq("status", "active").order("is_octa_model", { ascending: false }).order("name"),
  ]);
  const selectedProcess = processes?.find((item) => item.id === query.process);
  const defaultTitle = selectedProcess ? `Laudo Técnico Pericial — Processo ${selectedProcess.process_number}` : "Laudo Técnico Pericial";

  return (
    <>
      <header className="page-header"><div><p className="eyebrow">NOVO DOCUMENTO TÉCNICO</p><h1>Criar laudo</h1><p>Selecione o processo e o modelo estrutural. Os capítulos serão gerados automaticamente.</p></div><Link className="button button-secondary" href="/laudos">Voltar</Link></header>
      {query.error && <div className="notice notice-error">{query.error}</div>}
      <form className="card form-card form-card-wide" action={createExpertReportAction}>
        <div className="form-section"><h2>Vínculo processual</h2><p>O laudo permanecerá associado ao processo e ao histórico do escritório.</p></div>
        <div className="form-grid">
          <label className="field full"><span>Processo</span><select className="select" name="process_id" defaultValue={query.process || ""} required><option value="">Selecione</option>{processes?.map((process) => <option key={process.id} value={process.id}>{process.process_number} — {process.subject || "Sem objeto informado"}</option>)}</select></label>
          <label className="field full"><span>Tipo de laudo</span><select className="select" name="report_type_id" required><option value="">Selecione</option>{reportTypes?.map((type) => <option key={type.id} value={type.id}>{type.name} — {type.specialty}{type.is_octa_model ? " · OCTA" : ""}</option>)}</select></label>
        </div>

        <div className="form-section"><h2>Identificação inicial</h2><p>O título e a data podem ser alterados posteriormente.</p></div>
        <div className="form-grid">
          <label className="field full"><span>Título</span><input className="input" name="title" defaultValue={defaultTitle} required /></label>
          <label className="field"><span>Data do laudo</span><input className="input" name="report_date" type="date" /></label>
          <label className="field full"><span>Notas internas</span><textarea className="textarea" name="notes" placeholder="Pendências, estratégia de revisão ou observações internas. Não entram automaticamente no corpo do laudo." /></label>
        </div>
        <div className="form-actions"><Link className="button button-ghost" href="/laudos">Cancelar</Link><SubmitButton pendingText="Criando laudo..." className="button button-primary">Criar construtor</SubmitButton></div>
      </form>
    </>
  );
}
