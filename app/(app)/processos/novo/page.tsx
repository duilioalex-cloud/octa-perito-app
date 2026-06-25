import Link from "next/link";
import { SubmitButton } from "@/components/submit-button";
import { createProcessAction } from "@/app/actions/processes";

export const metadata = { title: "Nova perícia" };

export default async function NewProcessPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  return (
    <>
      <header className="page-header"><div><p className="eyebrow">NOVO CADASTRO</p><h1>Nova perícia</h1><p>Registre os dados essenciais. Informações complementares poderão ser inseridas depois.</p></div></header>
      <section className="card form-card">
        {params.error && <div className="notice notice-error">{params.error}</div>}
        <form action={createProcessAction}>
          <div className="form-grid">
            <label className="field full"><span>Número do processo</span><input className="input" name="process_number" placeholder="0000000-00.0000.0.00.0000" required /></label>
            <label className="field"><span>Tribunal</span><input className="input" name="court" placeholder="TJMG, TRT-3..." /></label>
            <label className="field"><span>Comarca</span><input className="input" name="district" /></label>
            <label className="field"><span>Vara</span><input className="input" name="division" /></label>
            <label className="field"><span>Tipo de atuação</span><select className="select" name="expertise_type"><option value="judicial_expert">Perito judicial</option><option value="technical_assistant">Assistente técnico</option><option value="extrajudicial">Perícia extrajudicial</option></select></label>
            <label className="field"><span>Autor</span><input className="input" name="plaintiff" /></label>
            <label className="field"><span>Réu</span><input className="input" name="defendant" /></label>
            <label className="field full"><span>Objeto ou assunto</span><input className="input" name="subject" placeholder="Insalubridade, dano ambiental, avaliação de imóvel..." /></label>
            <label className="field"><span>Data da nomeação</span><input className="input" name="appointed_at" type="date" /></label>
            <label className="field"><span>Prazo estimado do laudo</span><input className="input" name="report_due_at" type="date" /></label>
            <label className="field full"><span>Observações iniciais</span><textarea className="textarea" name="notes" /></label>
          </div>
          <div className="form-actions"><Link className="button button-secondary" href="/processos">Cancelar</Link><div style={{ minWidth: 210 }}><SubmitButton pendingText="Salvando...">Cadastrar perícia</SubmitButton></div></div>
        </form>
      </section>
    </>
  );
}
