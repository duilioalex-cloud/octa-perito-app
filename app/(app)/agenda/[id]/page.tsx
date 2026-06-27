import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/current-organization";
import {
  addEventParticipantAction,
  deleteCalendarEventAction,
  deleteEventParticipantAction,
  saveCalendarEventAction,
  updateCalendarEventStatusAction,
  updateParticipantAttendanceFromFormAction,
} from "@/app/actions/calendar";
import { SubmitButton } from "@/components/submit-button";
import { DangerActionButton } from "@/components/danger-action-button";
import {
  ATTENDANCE_STATUS_OPTIONS,
  EVENT_STATUS_OPTIONS,
  EVENT_TYPE_OPTIONS,
  attendanceStatusLabel,
  eventStatusClass,
  eventStatusLabel,
  eventTypeIcon,
  eventTypeLabel,
} from "@/lib/calendar-options";
import { PRIORITY_OPTIONS, formatDateTime, priorityLabel } from "@/lib/process-options";

export const metadata = { title: "Detalhes do compromisso" };

function dateTimeLocal(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
}

export default async function CalendarEventDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ success?: string; error?: string }> }) {
  const { id } = await params;
  const query = await searchParams;
  const organization = await getCurrentOrganization();
  if (!organization) return null;
  const supabase = await createClient();

  const [{ data: event }, { data: participants }, { data: processes }] = await Promise.all([
    supabase.from("calendar_events").select("*,processes(id,process_number,subject)").eq("id", id).eq("organization_id", organization.id).maybeSingle(),
    supabase.from("event_participants").select("*").eq("event_id", id).order("name"),
    supabase.from("processes").select("id,process_number,subject,status").eq("organization_id", organization.id).neq("status", "closed").order("process_number"),
  ]);
  if (!event) notFound();

  const process = Array.isArray(event.processes) ? event.processes[0] : event.processes;
  const saveAction = saveCalendarEventAction.bind(null, id);
  const deleteAction = deleteCalendarEventAction.bind(null, id);
  const participantAction = addEventParticipantAction.bind(null, id);
  const canDelete = ["owner", "admin"].includes(organization.role);
  const reminders = Array.isArray(event.reminder_offsets_minutes) ? event.reminder_offsets_minutes.join(",") : "1440,180";

  return (
    <>
      <header className="page-header">
        <div><p className="eyebrow">COMPROMISSO PERICIAL</p><h1>{event.title}</h1><p>{eventTypeLabel(event.event_type)} · {formatDateTime(event.starts_at)}</p></div>
        <div className="header-actions"><Link className="button button-secondary" href="/agenda">Voltar</Link>{process && <Link className="button button-secondary" href={`/processos/${process.id}`}>Abrir processo</Link>}{canDelete && <DangerActionButton action={deleteAction} label="Excluir compromisso" confirmation={`Excluir definitivamente o compromisso “${event.title}”?`} />}</div>
      </header>

      {query.success && <div className="notice notice-success">{query.success}</div>}
      {query.error && <div className="notice notice-error">{query.error}</div>}

      <section className="card agenda-event-summary">
        <div className={`agenda-event-icon agenda-icon-${event.event_type}`}>{eventTypeIcon(event.event_type)}</div>
        <div><span>Tipo</span><strong>{eventTypeLabel(event.event_type)}</strong></div>
        <div><span>Status</span><b className={eventStatusClass(event.status)}>{eventStatusLabel(event.status)}</b></div>
        <div><span>Prioridade</span><strong>{priorityLabel(event.priority)}</strong></div>
        <div><span>Processo</span><strong>{process?.process_number || "Sem vínculo"}</strong></div>
      </section>

      <section className="dashboard-grid agenda-detail-grid">
        <article className="card panel">
          <div className="panel-header"><h2>Editar compromisso</h2><span>{event.deadline_id ? "Sincronizado com prazo processual" : "Evento manual"}</span></div>
          <form className="form-grid" action={saveAction}>
            <label className="field full"><span>Título</span><input className="input" name="title" defaultValue={event.title} required /></label>
            <label className="field full"><span>Processo vinculado</span><select className="select" name="process_id" defaultValue={event.process_id || ""}><option value="">Sem processo vinculado</option>{(processes || []).map((item) => <option value={item.id} key={item.id}>{item.process_number} — {item.subject || "Objeto não informado"}</option>)}</select></label>
            <label className="field"><span>Tipo</span><select className="select" name="event_type" defaultValue={event.event_type}>{EVENT_TYPE_OPTIONS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
            <label className="field"><span>Status</span><select className="select" name="status" defaultValue={event.status}>{EVENT_STATUS_OPTIONS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
            <label className="field"><span>Início</span><input className="input" name="starts_at" type="datetime-local" defaultValue={dateTimeLocal(event.starts_at)} required /></label>
            <label className="field"><span>Término</span><input className="input" name="ends_at" type="datetime-local" defaultValue={dateTimeLocal(event.ends_at)} /></label>
            <label className="field"><span>Prioridade</span><select className="select" name="priority" defaultValue={event.priority}>{PRIORITY_OPTIONS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
            <label className="field"><span>Responsável</span><input className="input" name="responsible_name" defaultValue={event.responsible_name || ""} /></label>
            <label className="field"><span>Local</span><input className="input" name="location_name" defaultValue={event.location_name || ""} /></label>
            <label className="field"><span>Endereço</span><input className="input" name="address" defaultValue={event.address || ""} /></label>
            <label className="field"><span>Cidade</span><input className="input" name="city" defaultValue={event.city || ""} /></label>
            <label className="field"><span>UF</span><input className="input" name="state" maxLength={2} defaultValue={event.state || ""} /></label>
            <label className="field full"><span>Lembretes em minutos</span><input className="input" name="reminder_offsets_minutes" defaultValue={reminders} /><small className="field-help">Ex.: 10080 = 7 dias; 1440 = 1 dia; 180 = 3 horas.</small></label>
            <label className="field full"><span>Descrição e instruções</span><textarea className="textarea" name="description" defaultValue={event.description || ""} /></label>
            <label className="check-line full"><input name="all_day" type="checkbox" defaultChecked={event.all_day} /> Compromisso de dia inteiro</label>
            <div className="form-actions full"><SubmitButton className="button button-primary" pendingText="Salvando...">Salvar alterações</SubmitButton></div>
          </form>
        </article>

        <aside className="process-side-stack">
          <article className="card panel">
            <div className="panel-header"><h2>Ações rápidas</h2></div>
            <div className="agenda-status-actions">
              {event.status !== "confirmed" && <form action={updateCalendarEventStatusAction.bind(null, id, "confirmed")}><button className="button button-secondary button-full" type="submit">Confirmar compromisso</button></form>}
              {event.status !== "completed" && <form action={updateCalendarEventStatusAction.bind(null, id, "completed")}><button className="button button-primary button-full" type="submit">Marcar como realizado</button></form>}
              {event.status !== "rescheduled" && <form action={updateCalendarEventStatusAction.bind(null, id, "rescheduled")}><button className="button button-ghost button-full" type="submit">Marcar como reagendado</button></form>}
              {event.status !== "cancelled" && <form action={updateCalendarEventStatusAction.bind(null, id, "cancelled")}><button className="button button-ghost button-full" type="submit">Cancelar compromisso</button></form>}
            </div>
          </article>

          <article className="card panel">
            <div className="panel-header"><h2>Resumo operacional</h2></div>
            <div className="finance-definition-list">
              <div><span>Início</span><strong>{formatDateTime(event.starts_at)}</strong></div>
              <div><span>Término</span><strong>{event.ends_at ? formatDateTime(event.ends_at) : "Não informado"}</strong></div>
              <div><span>Local</span><strong>{event.location_name || "Não informado"}</strong></div>
              <div><span>Endereço</span><strong>{event.address || "Não informado"}</strong></div>
              <div><span>Cidade/UF</span><strong>{[event.city, event.state].filter(Boolean).join("/") || "Não informado"}</strong></div>
              <div><span>Responsável</span><strong>{event.responsible_name || "Não informado"}</strong></div>
            </div>
          </article>
        </aside>
      </section>

      <section className="card panel agenda-participants-panel">
        <div className="panel-header"><h2>Participantes</h2><span>{participants?.length || 0} pessoa(s)</span></div>
        {!participants?.length ? <div className="empty-state"><strong>Nenhum participante cadastrado.</strong>Inclua advogados, assistentes técnicos, representantes ou acompanhantes.</div> : (
          <div className="participant-list">
            {participants.map((participant) => (
              <article className="participant-row" key={participant.id}>
                <div><strong>{participant.name}</strong><span>{participant.role_label || "Participante"}{participant.organization_name ? ` · ${participant.organization_name}` : ""}</span><small>{[participant.email, participant.phone].filter(Boolean).join(" · ") || "Contato não informado"}</small></div>
                <div><span>Presença</span><strong>{attendanceStatusLabel(participant.attendance_status)}</strong></div>
                <div className="participant-actions">
                  <form action={updateParticipantAttendanceFromFormAction.bind(null, id, participant.id)}>
                    <select className="select select-small" name="attendance_status" defaultValue={participant.attendance_status}>{ATTENDANCE_STATUS_OPTIONS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select>
                    <button className="button button-ghost button-small" type="submit">Atualizar</button>
                  </form>
                  <DangerActionButton action={deleteEventParticipantAction.bind(null, id, participant.id)} label="Remover" compact confirmation={`Remover ${participant.name} deste compromisso?`} />
                </div>
              </article>
            ))}
          </div>
        )}

        <details className="inline-edit-panel agenda-participant-add">
          <summary>+ Adicionar participante</summary>
          <form className="form-grid" action={participantAction}>
            <label className="field"><span>Nome</span><input className="input" name="name" required /></label>
            <label className="field"><span>Função</span><input className="input" name="role_label" placeholder="Ex.: Assistente técnico" /></label>
            <label className="field"><span>Empresa/órgão</span><input className="input" name="organization_name" /></label>
            <label className="field"><span>Situação</span><select className="select" name="attendance_status" defaultValue="invited">{ATTENDANCE_STATUS_OPTIONS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
            <label className="field"><span>E-mail</span><input className="input" name="email" type="email" /></label>
            <label className="field"><span>Telefone</span><input className="input" name="phone" /></label>
            <label className="field full"><span>Observações</span><textarea className="textarea textarea-small" name="notes" /></label>
            <div className="form-actions full"><SubmitButton className="button button-primary" pendingText="Adicionando...">Adicionar participante</SubmitButton></div>
          </form>
        </details>
      </section>
    </>
  );
}
