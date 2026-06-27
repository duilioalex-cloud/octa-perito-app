import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentOrganization } from "@/lib/current-organization";
import { saveCalendarEventAction } from "@/app/actions/calendar";
import { SubmitButton } from "@/components/submit-button";
import { EVENT_STATUS_OPTIONS, EVENT_TYPE_OPTIONS } from "@/lib/calendar-options";
import { PRIORITY_OPTIONS } from "@/lib/process-options";

export const metadata = { title: "Novo compromisso" };

export default async function NewCalendarEventPage({ searchParams }: { searchParams: Promise<{ process?: string; error?: string }> }) {
  const query = await searchParams;
  const organization = await requireCurrentOrganization("calendar:write");
  const supabase = await createClient();
  const { data: processes } = await supabase.from("processes").select("id,process_number,subject,status").eq("organization_id", organization.id).neq("status", "closed").order("process_number");
  const action = saveCalendarEventAction.bind(null, null);

  return (
    <>
      <header className="page-header"><div><p className="eyebrow">AGENDA PERICIAL</p><h1>Novo compromisso</h1><p>Cadastre uma diligência, vistoria, audiência, prazo ou compromisso operacional.</p></div><Link className="button button-secondary" href="/agenda">Voltar à agenda</Link></header>
      {query.error && <div className="notice notice-error">{query.error}</div>}
      <section className="card form-card agenda-form-card">
        <form className="form-grid" action={action}>
          <label className="field full"><span>Título do compromisso</span><input className="input" name="title" placeholder="Ex.: Vistoria técnica na Fazenda Santa Luzia" required /></label>
          <label className="field full"><span>Processo vinculado</span><select className="select" name="process_id" defaultValue={query.process || ""}><option value="">Compromisso sem processo vinculado</option>{(processes || []).map((process) => <option value={process.id} key={process.id}>{process.process_number} — {process.subject || "Objeto não informado"}</option>)}</select></label>
          <label className="field"><span>Tipo</span><select className="select" name="event_type" defaultValue="diligence">{EVENT_TYPE_OPTIONS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
          <label className="field"><span>Status inicial</span><select className="select" name="status" defaultValue="scheduled">{EVENT_STATUS_OPTIONS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
          <label className="field"><span>Início</span><input className="input" name="starts_at" type="datetime-local" required /></label>
          <label className="field"><span>Término</span><input className="input" name="ends_at" type="datetime-local" /></label>
          <label className="field"><span>Prioridade</span><select className="select" name="priority" defaultValue="normal">{PRIORITY_OPTIONS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
          <label className="field"><span>Responsável</span><input className="input" name="responsible_name" placeholder="Nome do responsável" /></label>
          <label className="field"><span>Local</span><input className="input" name="location_name" placeholder="Ex.: Portaria da empresa" /></label>
          <label className="field"><span>Endereço</span><input className="input" name="address" placeholder="Rua, número e referência" /></label>
          <label className="field"><span>Cidade</span><input className="input" name="city" /></label>
          <label className="field"><span>UF</span><input className="input" name="state" maxLength={2} placeholder="MG" /></label>
          <label className="field full"><span>Lembretes em minutos antes do evento</span><input className="input" name="reminder_offsets_minutes" defaultValue="1440,180" placeholder="Ex.: 10080,1440,180" /><small className="field-help">Ex.: 10080 = 7 dias; 1440 = 1 dia; 180 = 3 horas.</small></label>
          <label className="field full"><span>Descrição e instruções</span><textarea className="textarea" name="description" placeholder="Participantes, documentos necessários, ponto de encontro e demais orientações." /></label>
          <label className="check-line full"><input name="all_day" type="checkbox" /> Compromisso de dia inteiro</label>
          <div className="form-actions full"><Link className="button button-ghost" href="/agenda">Cancelar</Link><SubmitButton className="button button-primary" pendingText="Cadastrando...">Cadastrar compromisso</SubmitButton></div>
        </form>
      </section>
    </>
  );
}
