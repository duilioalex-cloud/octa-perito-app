import Link from "next/link";
import { notFound } from "next/navigation";
import { SubmitButton } from "@/components/submit-button";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/current-organization";
import { updateProcessAction } from "@/app/actions/processes";
import { EXPERTISE_TYPE_OPTIONS, PRIORITY_OPTIONS, PROCESS_STATUS_OPTIONS, toDateTimeLocal } from "@/lib/process-options";

export const metadata = { title: "Editar processo" };

export default async function EditProcessPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { id } = await params;
  const query = await searchParams;
  const organization = await getCurrentOrganization();
  if (!organization) return null;
  const supabase = await createClient();
  const { data: process } = await supabase.from("processes").select("*").eq("id", id).eq("organization_id", organization.id).maybeSingle();
  if (!process) notFound();
  const action = updateProcessAction.bind(null, id);

  return (
    <>
      <header className="page-header"><div><p className="eyebrow">EDIÇÃO</p><h1>Atualizar processo</h1><p>{process.process_number}</p></div></header>
      <section className="card form-card form-card-wide">
        {query.error && <div className="notice notice-error">{query.error}</div>}
        <form action={action}>
          <div className="form-section"><h2>Identificação processual</h2></div>
          <div className="form-grid">
            <label className="field full"><span>Número do processo *</span><input className="input" name="process_number" defaultValue={process.process_number} required /></label>
            <label className="field"><span>Tribunal</span><input className="input" name="court" defaultValue={process.court ?? ""} /></label>
            <label className="field"><span>Comarca</span><input className="input" name="district" defaultValue={process.district ?? ""} /></label>
            <label className="field"><span>Vara</span><input className="input" name="division" defaultValue={process.division ?? ""} /></label>
            <label className="field"><span>Classe processual</span><input className="input" name="case_class" defaultValue={process.case_class ?? ""} /></label>
            <label className="field"><span>Área da perícia</span><input className="input" name="expertise_area" defaultValue={process.expertise_area ?? ""} /></label>
            <label className="field"><span>Tipo de atuação</span><select className="select" name="expertise_type" defaultValue={process.expertise_type}>{EXPERTISE_TYPE_OPTIONS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
            <label className="field"><span>Status</span><select className="select" name="status" defaultValue={process.status}>{PROCESS_STATUS_OPTIONS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
            <label className="field"><span>Prioridade</span><select className="select" name="priority" defaultValue={process.priority ?? "normal"}>{PRIORITY_OPTIONS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
            <label className="field"><span>Responsável</span><input className="input" name="responsible_name" defaultValue={process.responsible_name ?? ""} /></label>
            <label className="field"><span>Autor</span><input className="input" name="plaintiff" defaultValue={process.plaintiff ?? ""} /></label>
            <label className="field"><span>Réu</span><input className="input" name="defendant" defaultValue={process.defendant ?? ""} /></label>
            <label className="field full"><span>Objeto ou assunto</span><input className="input" name="subject" defaultValue={process.subject ?? ""} /></label>
          </div>

          <div className="form-section"><h2>Datas e prazos</h2></div>
          <div className="form-grid">
            <label className="field"><span>Data da nomeação</span><input className="input" name="appointed_at" type="date" defaultValue={process.appointed_at ?? ""} /></label>
            <label className="field"><span>Prazo para manifestação</span><input className="input" name="appointment_response_due_at" type="date" defaultValue={process.appointment_response_due_at ?? ""} /></label>
            <label className="field"><span>Data e hora da diligência</span><input className="input" name="diligence_at" type="datetime-local" defaultValue={toDateTimeLocal(process.diligence_at)} /></label>
            <label className="field"><span>Prazo do laudo</span><input className="input" name="report_due_at" type="date" defaultValue={process.report_due_at ?? ""} /></label>
          </div>

          <div className="form-section"><h2>Honorários</h2></div>
          <div className="form-grid">
            <label className="field"><span>Valor proposto (R$)</span><input className="input" name="fee_proposed" inputMode="decimal" defaultValue={Number(process.fee_proposed ?? 0).toFixed(2).replace(".", ",")} /></label>
            <label className="field"><span>Valor arbitrado (R$)</span><input className="input" name="fee_arbitrated" inputMode="decimal" defaultValue={Number(process.fee_arbitrated ?? 0).toFixed(2).replace(".", ",")} /></label>
            <label className="field"><span>Valor depositado (R$)</span><input className="input" name="fee_deposited" inputMode="decimal" defaultValue={Number(process.fee_deposited ?? 0).toFixed(2).replace(".", ",")} /></label>
            <label className="field"><span>Valor recebido (R$)</span><input className="input" name="fee_received" inputMode="decimal" defaultValue={Number(process.fee_received ?? 0).toFixed(2).replace(".", ",")} /></label>
            <label className="field full"><span>Observações</span><textarea className="textarea" name="notes" defaultValue={process.notes ?? ""} /></label>
          </div>
          <div className="form-actions"><Link className="button button-secondary" href={`/processos/${id}`}>Cancelar</Link><div style={{ minWidth: 210 }}><SubmitButton pendingText="Atualizando...">Salvar alterações</SubmitButton></div></div>
        </form>
      </section>
    </>
  );
}
