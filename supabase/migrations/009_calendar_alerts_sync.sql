-- OCTA Perito v0.6.7
-- Agenda pericial, alertas internos e sincronização automática de prazos.

begin;

-- Mantém os prazos processuais sincronizados com a agenda.
create or replace function public.sync_process_deadline_to_calendar()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  source_value text;
  mapped_type text;
  mapped_status text;
begin
  if tg_op = 'DELETE' then
    delete from public.calendar_events
    where organization_id = old.organization_id
      and source_key = 'deadline:' || old.id::text;
    return old;
  end if;

  source_value := 'deadline:' || new.id::text;
  mapped_type := case new.category
    when 'diligence' then 'diligence'
    when 'report' then 'report_due'
    when 'clarification' then 'clarification_due'
    when 'manifestation' then 'manifestation_due'
    when 'fees' then 'financial_due'
    else 'other'
  end;
  mapped_status := case new.status
    when 'completed' then 'completed'
    when 'cancelled' then 'cancelled'
    else 'pending'
  end;

  insert into public.calendar_events (
    organization_id,
    process_id,
    deadline_id,
    title,
    event_type,
    status,
    priority,
    starts_at,
    all_day,
    description,
    completed_at,
    source_key,
    created_by
  ) values (
    new.organization_id,
    new.process_id,
    new.id,
    new.title,
    mapped_type,
    mapped_status,
    new.priority,
    new.due_at,
    false,
    new.notes,
    case when new.status = 'completed' then coalesce(new.completed_at, now()) else null end,
    source_value,
    new.created_by
  )
  on conflict (organization_id, source_key) where source_key is not null
  do update set
    process_id = excluded.process_id,
    deadline_id = excluded.deadline_id,
    title = excluded.title,
    event_type = excluded.event_type,
    status = excluded.status,
    priority = excluded.priority,
    starts_at = excluded.starts_at,
    description = excluded.description,
    completed_at = excluded.completed_at,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists process_deadlines_sync_calendar on public.process_deadlines;
create trigger process_deadlines_sync_calendar
after insert or update or delete on public.process_deadlines
for each row execute procedure public.sync_process_deadline_to_calendar();

-- Reaplica a sincronização para prazos já existentes, sem duplicar eventos.
insert into public.calendar_events (
  organization_id,
  process_id,
  deadline_id,
  title,
  event_type,
  status,
  priority,
  starts_at,
  all_day,
  description,
  completed_at,
  source_key,
  created_by
)
select
  pd.organization_id,
  pd.process_id,
  pd.id,
  pd.title,
  case pd.category
    when 'diligence' then 'diligence'
    when 'report' then 'report_due'
    when 'clarification' then 'clarification_due'
    when 'manifestation' then 'manifestation_due'
    when 'fees' then 'financial_due'
    else 'other'
  end,
  case pd.status
    when 'completed' then 'completed'
    when 'cancelled' then 'cancelled'
    else 'pending'
  end,
  pd.priority,
  pd.due_at,
  false,
  pd.notes,
  case when pd.status = 'completed' then coalesce(pd.completed_at, pd.updated_at) else null end,
  'deadline:' || pd.id::text,
  pd.created_by
from public.process_deadlines pd
on conflict (organization_id, source_key) where source_key is not null
  do update set
    process_id = excluded.process_id,
    deadline_id = excluded.deadline_id,
    title = excluded.title,
    event_type = excluded.event_type,
    status = excluded.status,
    priority = excluded.priority,
    starts_at = excluded.starts_at,
    description = excluded.description,
    completed_at = excluded.completed_at,
    updated_at = now();

-- Visão operacional ampliada para a central de alertas.
create or replace view public.calendar_event_alerts
with (security_invoker = true)
as
select
  ce.*,
  case
    when ce.status in ('completed','cancelled') then 'none'
    when ce.starts_at < now() then 'overdue'
    when ce.starts_at <= now() + interval '1 day' then 'today'
    when ce.starts_at <= now() + interval '3 days' then 'next_3_days'
    when ce.starts_at <= now() + interval '7 days' then 'next_7_days'
    else 'future'
  end as alert_level,
  floor(extract(epoch from (ce.starts_at - now())) / 86400)::integer as days_remaining,
  (
    ce.event_type in ('diligence','inspection','hearing')
    and nullif(trim(coalesce(ce.location_name, '')), '') is null
    and nullif(trim(coalesce(ce.address, '')), '') is null
    and nullif(trim(coalesce(ce.city, '')), '') is null
  ) as missing_location,
  (
    ce.event_type in ('diligence','inspection','hearing')
    and ce.status in ('scheduled','pending')
    and ce.starts_at <= now() + interval '3 days'
  ) as needs_confirmation
from public.calendar_events ce;

grant select on public.calendar_event_alerts to authenticated;

comment on function public.sync_process_deadline_to_calendar() is 'Sincroniza automaticamente prazos processuais com a agenda pericial do OCTA.';
comment on view public.calendar_event_alerts is 'Eventos com classificação temporal e pendências operacionais para a central de alertas.';

commit;
