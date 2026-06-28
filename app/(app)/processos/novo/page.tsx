import Link from "next/link";
import { SubmitButton } from "@/components/submit-button";
import { createProcessAction } from "@/app/actions/processes";
import { requireCurrentOrganization } from "@/lib/current-organization";
import { EXPERTISE_TYPE_OPTIONS, PRIORITY_OPTIONS, PROCESS_STATUS_OPTIONS } from "@/lib/process-options";

export const metadata = { title: "Nova perícia" };

export default async function NewProcessPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireCurrentOrganization("processes:write");
  const params = await searchParams;
  return (
    <>
      <header className="page-header"><div><p className="eyebrow">NOVO CADASTRO</p><h1>Nova perícia</h1><p>Registre os dados operacionais, os prazos iniciais e os honorários conhecidos.</p></div></header>
      <section className="card form-card form-card-wide">
        {params.error && <div className="notice notice-error">{params.error}</div>}
        <form action={createProcessAction}>
          <div className="form-section"><h2>Identificação processual</h2><p>Dados essenciais para localizar e classificar o trabalho.</p></div>
          <div className="form-grid">
            <label className="field full"><span>Número do processo *</span><input className="input" name="process_number" placeholder="0000000-00.0000.0.00.0000" required /></label>
            <label className="field"><span>Tribunal</span><input className="input" name="court" placeholder="TJMG, TRT-3..." /></label>
            <label className="field"><span>Comarca</span><input className="input" name="district" /></label>
            <label className="field"><span>Vara</span><input className="input" name="division" /></label>
            <label className="field"><span>Classe processual</span><input className="input" name="case_class" placeholder="Ação Civil Pública, Reclamação Trabalhista..." /></label>
            <label className="field"><span>Área da perícia</span><input className="input" name="expertise_area" placeholder="Ambiental, SST, avaliação, civil..." /></label>
            <label className="field"><span>Tipo de atuação</span><select className="select" name="expertise_type">{EXPERTISE_TYPE_OPTIONS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
            <label className="field"><span>Status inicial</span><select className="select" name="status">{PROCESS_STATUS_OPTIONS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
            <label className="field"><span>Prioridade</span><select className="select" name="priority" defaultValue="normal">{PRIORITY_OPTIONS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
            <label className="field"><span>Responsável</span><input className="input" name="responsible_name" placeholder="Profissional responsável" /></label>
            <label className="field"><span>Autor</span><input className="input" name="plaintiff" /></label>
            <label className="field"><span>Réu</span><input className="input" name="defendant" /></label>
            <label className="field full"><span>Objeto ou assunto</span><input className="input" name="subject" placeholder="Insalubridade, dano ambiental, avaliação de imóvel..." /></label>
          </div>

          <div className="form-section"><h2>Datas e prazos</h2><p>Os prazos informados serão incluídos automaticamente no painel.</p></div>
          <div className="form-grid">
            <label className="field"><span>Data da nomeação</span><input className="input" name="appointed_at" type="date" /></label>
            <label className="field"><span>Prazo para manifestação</span><input className="input" name="appointment_response_due_at" type="date" /></label>
            <label className="field"><span>Data e hora da diligência</span><input className="input" name="diligence_at" type="datetime-local" /></label>
            <label className="field"><span>Prazo do laudo</span><input className="input" name="report_due_at" type="date" /></label>
          </div>

          <div className="form-section"><h2>Honorários</h2><p>Informe apenas valores conhecidos. Eles poderão ser atualizados depois.</p></div>
          <div className="form-grid">
            <label className="field"><span>Honorarios propostos (R$)</span><input className="input" name="fee_proposed" inputMode="decimal" placeholder="0,00" /></label>
            <label className="field"><span>Valor que o perito cobrou (R$)</span><input className="input" name="fee_charged" inputMode="decimal" placeholder="0,00" /></label>
            <label className="field"><span>Valor arbitrado (R$)</span><input className="input" name="fee_arbitrated" inputMode="decimal" placeholder="0,00" /></label>
            <label className="field"><span>Valor depositado (R$)</span><input className="input" name="fee_deposited" inputMode="decimal" placeholder="0,00" /></label>
            <label className="field"><span>Valor recebido (R$)</span><input className="input" name="fee_received" inputMode="decimal" placeholder="0,00" /></label>
            <label className="field full"><span>Observações iniciais</span><textarea className="textarea" name="notes" /></label>
          </div>
          <div className="form-actions"><Link className="button button-secondary" href="/processos">Cancelar</Link><div style={{ minWidth: 210 }}><SubmitButton pendingText="Salvando...">Cadastrar perícia</SubmitButton></div></div>
        </form>
      </section>
    </>
  );
}
