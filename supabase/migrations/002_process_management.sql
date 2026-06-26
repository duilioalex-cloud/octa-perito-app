-- OCTA Perito v0.2 — gestão operacional de processos, prazos e honorários básicos

alter table public.processes add column if not exists case_class text;
alter table public.processes add column if not exists expertise_area text;
alter table public.processes add column if not exists priority text not null default 'normal';
alter table public.processes add column if not exists appointment_response_due_at date;
alter table public.processes add column if not exists diligence_at timestamptz;
alter table public.processes add column if not exists responsible_name text;
alter table public.processes add column if not exists fee_proposed numeric(14,2) not null default 0;
alter table public.processes add column if not exists fee_arbitrated numeric(14,2) not null default 0;
alter table public.processes add column if not exists fee_deposited numeric(14,2) not null default 0;
alter table public.processes add column if not exists fee_received numeric(14,2) not null default 0;

alter table public.processes drop constraint if exists processes_priority_check;
alter table public.processes add constraint processes_priority_check
  check (priority in ('low','normal','high','urgent'));

alter table public.processes drop constraint if exists processes_fee_proposed_check;
alter table public.processes add constraint processes_fee_proposed_check check (fee_proposed >= 0);
alter table public.processes drop constraint if exists processes_fee_arbitrated_check;
alter table public.processes add constraint processes_fee_arbitrated_check check (fee_arbitrated >= 0);
alter table public.processes drop constraint if exists processes_fee_deposited_check;
alter table public.processes add constraint processes_fee_deposited_check check (fee_deposited >= 0);
alter table public.processes drop constraint if exists processes_fee_received_check;
alter table public.processes add constraint processes_fee_received_check check (fee_received >= 0);

create table if not exists public.process_deadlines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  process_id uuid not null references public.processes(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 180),
  category text not null default 'other' check (category in ('manifestation','fees','diligence','report','clarification','other')),
  due_at timestamptz not null,
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  status text not null default 'pending' check (status in ('pending','completed','cancelled')),
  notes text,
  completed_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.process_activities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  process_id uuid not null references public.processes(id) on delete cascade,
  activity_type text not null default 'note',
  description text not null check (char_length(description) between 3 and 500),
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists process_deadlines_org_due_idx on public.process_deadlines (organization_id, status, due_at);
create index if not exists process_deadlines_process_idx on public.process_deadlines (process_id, due_at);
create index if not exists process_activities_process_idx on public.process_activities (process_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists processes_set_updated_at on public.processes;
create trigger processes_set_updated_at before update on public.processes
for each row execute procedure public.set_updated_at();

drop trigger if exists process_deadlines_set_updated_at on public.process_deadlines;
create trigger process_deadlines_set_updated_at before update on public.process_deadlines
for each row execute procedure public.set_updated_at();

alter table public.process_deadlines enable row level security;
alter table public.process_activities enable row level security;

drop policy if exists "deadlines_select_member" on public.process_deadlines;
create policy "deadlines_select_member" on public.process_deadlines
for select to authenticated using (public.is_org_member(organization_id));

drop policy if exists "deadlines_insert_member" on public.process_deadlines;
create policy "deadlines_insert_member" on public.process_deadlines
for insert to authenticated with check (
  public.is_org_member(organization_id)
  and created_by = auth.uid()
  and exists (
    select 1 from public.processes p
    where p.id = process_id and p.organization_id = organization_id
  )
);

drop policy if exists "deadlines_update_member" on public.process_deadlines;
create policy "deadlines_update_member" on public.process_deadlines
for update to authenticated using (public.is_org_member(organization_id))
with check (public.is_org_member(organization_id));

drop policy if exists "deadlines_delete_admin" on public.process_deadlines;
create policy "deadlines_delete_admin" on public.process_deadlines
for delete to authenticated using (public.is_org_admin(organization_id));

drop policy if exists "activities_select_member" on public.process_activities;
create policy "activities_select_member" on public.process_activities
for select to authenticated using (public.is_org_member(organization_id));

drop policy if exists "activities_insert_member" on public.process_activities;
create policy "activities_insert_member" on public.process_activities
for insert to authenticated with check (
  public.is_org_member(organization_id)
  and (created_by = auth.uid() or created_by is null)
  and exists (
    select 1 from public.processes p
    where p.id = process_id and p.organization_id = organization_id
  )
);
