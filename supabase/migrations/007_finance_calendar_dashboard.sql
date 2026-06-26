-- OCTA Perito v0.6 — Honorários, Agenda Pericial e Painel Financeiro
-- Migração idempotente. Não remove processos, documentos, laudos ou arquivos existentes.
-- Estrutura financeira com separação entre valores propostos, homologados, depositados e efetivamente recebidos.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================================================
-- 1. AMPLIAÇÃO DOS PROCESSOS
-- =========================================================

alter table public.processes add column if not exists accepted_at date;
alter table public.processes add column if not exists financial_status text not null default 'not_defined';
alter table public.processes add column if not exists estimated_value numeric(14,2) not null default 0;
alter table public.processes add column if not exists last_movement_at timestamptz not null default now();

alter table public.processes drop constraint if exists processes_financial_status_check;
alter table public.processes add constraint processes_financial_status_check
  check (financial_status in (
    'not_defined',
    'proposal_draft',
    'proposal_submitted',
    'awaiting_approval',
    'approved',
    'awaiting_deposit',
    'partially_deposited',
    'fully_deposited',
    'release_requested',
    'partially_released',
    'fully_released',
    'cancelled'
  ));

alter table public.processes drop constraint if exists processes_estimated_value_check;
alter table public.processes add constraint processes_estimated_value_check
  check (estimated_value >= 0);

create index if not exists processes_financial_status_idx
  on public.processes (organization_id, financial_status, last_movement_at desc);

-- =========================================================
-- 2. HONORÁRIOS PERICIAIS
-- =========================================================

create table if not exists public.process_fees (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  process_id uuid not null references public.processes(id) on delete cascade,
  title text not null default 'Honorários periciais'
    check (char_length(title) between 3 and 180),
  fee_type text not null default 'judicial_expert'
    check (fee_type in ('judicial_expert','technical_assistant','extrajudicial','supplemental','other')),
  status text not null default 'not_defined'
    check (status in (
      'not_defined',
      'proposal_draft',
      'proposal_submitted',
      'awaiting_approval',
      'approved',
      'awaiting_deposit',
      'partially_deposited',
      'fully_deposited',
      'release_requested',
      'partially_released',
      'fully_released',
      'cancelled'
    )),
  funding_mode text not null default 'court_deposit'
    check (funding_mode in ('court_deposit','legal_aid','direct_payment','contract','mixed','other')),
  responsibility_type text not null default 'not_defined'
    check (responsibility_type in ('not_defined','court','plaintiff','defendant','both_parties','legal_aid','client','other')),
  responsible_party text,
  initial_arbitrated_amount numeric(14,2) not null default 0 check (initial_arbitrated_amount >= 0),
  proposed_amount numeric(14,2) not null default 0 check (proposed_amount >= 0),
  approved_amount numeric(14,2) not null default 0 check (approved_amount >= 0),
  advance_percentage numeric(5,2) not null default 0 check (advance_percentage between 0 and 100),
  opening_deposited_amount numeric(14,2) not null default 0 check (opening_deposited_amount >= 0),
  opening_received_amount numeric(14,2) not null default 0 check (opening_received_amount >= 0),
  currency char(3) not null default 'BRL',
  proposed_at date,
  approved_at date,
  deposit_due_at date,
  release_requested_at date,
  closed_at date,
  is_primary boolean not null default true,
  source_key text,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (approved_at is null or proposed_at is null or approved_at >= proposed_at),
  check (closed_at is null or approved_at is null or closed_at >= approved_at)
);

create unique index if not exists process_fees_primary_unique
  on public.process_fees (process_id)
  where is_primary = true and status <> 'cancelled';

create unique index if not exists process_fees_source_key_unique
  on public.process_fees (process_id, source_key)
  where source_key is not null;

create index if not exists process_fees_org_status_idx
  on public.process_fees (organization_id, status, updated_at desc);

create index if not exists process_fees_process_idx
  on public.process_fees (process_id, updated_at desc);

create table if not exists public.fee_transactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  process_id uuid not null references public.processes(id) on delete cascade,
  fee_id uuid not null references public.process_fees(id) on delete cascade,
  transaction_type text not null
    check (transaction_type in ('deposit','release','refund','adjustment')),
  status text not null default 'pending'
    check (status in ('planned','pending','confirmed','cancelled')),
  amount numeric(14,2) not null check (amount > 0),
  net_amount numeric(14,2),
  withheld_amount numeric(14,2) not null default 0 check (withheld_amount >= 0),
  deposit_delta numeric(14,2) not null default 0,
  received_delta numeric(14,2) not null default 0,
  occurred_at date,
  due_at date,
  payment_method text,
  reference_number text,
  source_key text,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (net_amount is null or net_amount >= 0),
  check (net_amount is null or net_amount + withheld_amount <= amount)
);

create unique index if not exists fee_transactions_source_key_unique
  on public.fee_transactions (fee_id, source_key)
  where source_key is not null;

create index if not exists fee_transactions_fee_idx
  on public.fee_transactions (fee_id, status, occurred_at desc);

create index if not exists fee_transactions_process_idx
  on public.fee_transactions (process_id, occurred_at desc, created_at desc);

-- =========================================================
-- 3. DESLOCAMENTOS E DESPESAS
-- =========================================================

create table if not exists public.process_trips (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  process_id uuid not null references public.processes(id) on delete cascade,
  title text not null default 'Deslocamento pericial'
    check (char_length(title) between 3 and 180),
  status text not null default 'planned'
    check (status in ('planned','confirmed','completed','cancelled')),
  origin_city text,
  origin_state text,
  destination_city text,
  destination_state text,
  departure_at timestamptz,
  return_at timestamptz,
  one_way_km numeric(12,2) not null default 0 check (one_way_km >= 0),
  total_km numeric(12,2) not null default 0 check (total_km >= 0),
  trips_count integer not null default 1 check (trips_count >= 1),
  fuel_efficiency_km_l numeric(10,2) not null default 0 check (fuel_efficiency_km_l >= 0),
  fuel_price_per_liter numeric(12,2) not null default 0 check (fuel_price_per_liter >= 0),
  vehicle_cost_per_km numeric(12,2) not null default 0 check (vehicle_cost_per_km >= 0),
  toll_amount numeric(14,2) not null default 0 check (toll_amount >= 0),
  lodging_amount numeric(14,2) not null default 0 check (lodging_amount >= 0),
  meal_amount numeric(14,2) not null default 0 check (meal_amount >= 0),
  other_amount numeric(14,2) not null default 0 check (other_amount >= 0),
  travel_hours numeric(10,2) not null default 0 check (travel_hours >= 0),
  hourly_rate numeric(14,2) not null default 0 check (hourly_rate >= 0),
  fuel_cost numeric(14,2) not null default 0 check (fuel_cost >= 0),
  vehicle_operating_cost numeric(14,2) not null default 0 check (vehicle_operating_cost >= 0),
  travel_time_cost numeric(14,2) not null default 0 check (travel_time_cost >= 0),
  total_cost numeric(14,2) not null default 0 check (total_cost >= 0),
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (return_at is null or departure_at is null or return_at >= departure_at)
);

create index if not exists process_trips_process_idx
  on public.process_trips (process_id, status, departure_at desc);

create index if not exists process_trips_org_status_idx
  on public.process_trips (organization_id, status, departure_at desc);

create table if not exists public.process_expenses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  process_id uuid not null references public.processes(id) on delete cascade,
  trip_id uuid references public.process_trips(id) on delete set null,
  category text not null default 'other'
    check (category in (
      'fuel','toll','lodging','meal','transport','vehicle_rental','technical_assistant',
      'equipment','laboratory','drone','topography','printing','postage','fees','other'
    )),
  description text not null check (char_length(description) between 3 and 220),
  expense_date date not null default current_date,
  quantity numeric(12,3) not null default 1 check (quantity > 0),
  unit_amount numeric(14,2) not null default 0 check (unit_amount >= 0),
  total_amount numeric(14,2) not null default 0 check (total_amount >= 0),
  payment_method text,
  payment_status text not null default 'pending'
    check (payment_status in ('planned','pending','paid','cancelled')),
  paid_at date,
  is_estimated boolean not null default false,
  is_reimbursable boolean not null default false,
  reimbursement_status text not null default 'not_applicable'
    check (reimbursement_status in ('not_applicable','pending','requested','approved','reimbursed','denied')),
  vendor_name text,
  document_number text,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (paid_at is null or payment_status = 'paid'),
  check (is_reimbursable = true or reimbursement_status = 'not_applicable')
);

create index if not exists process_expenses_process_idx
  on public.process_expenses (process_id, payment_status, expense_date desc);

create index if not exists process_expenses_org_category_idx
  on public.process_expenses (organization_id, category, expense_date desc);

create index if not exists process_expenses_reimbursement_idx
  on public.process_expenses (organization_id, reimbursement_status)
  where is_reimbursable = true;

-- =========================================================
-- 4. AGENDA PERICIAL
-- =========================================================

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  process_id uuid references public.processes(id) on delete cascade,
  deadline_id uuid references public.process_deadlines(id) on delete set null,
  title text not null check (char_length(title) between 3 and 220),
  event_type text not null default 'other'
    check (event_type in (
      'diligence','inspection','meeting','report_due','clarification_due','manifestation_due',
      'hearing','financial_due','personal','other'
    )),
  status text not null default 'scheduled'
    check (status in ('scheduled','confirmed','completed','rescheduled','cancelled','pending')),
  priority text not null default 'normal'
    check (priority in ('low','normal','high','urgent')),
  starts_at timestamptz not null,
  ends_at timestamptz,
  all_day boolean not null default false,
  location_name text,
  address text,
  city text,
  state text,
  responsible_name text,
  description text,
  reminder_offsets_minutes integer[] not null default array[1440,180]::integer[],
  completed_at timestamptz,
  source_key text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at),
  check (completed_at is null or status = 'completed')
);

create unique index if not exists calendar_events_source_key_unique
  on public.calendar_events (organization_id, source_key)
  where source_key is not null;

create index if not exists calendar_events_org_start_idx
  on public.calendar_events (organization_id, status, starts_at);

create index if not exists calendar_events_process_idx
  on public.calendar_events (process_id, starts_at);

create table if not exists public.event_participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.calendar_events(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 180),
  email text,
  phone text,
  role_label text,
  organization_name text,
  attendance_status text not null default 'invited'
    check (attendance_status in ('invited','confirmed','declined','attended','absent')),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists event_participants_event_idx
  on public.event_participants (event_id, attendance_status, name);

-- =========================================================
-- 5. DOCUMENTOS E ANEXOS FINANCEIROS
-- =========================================================

create table if not exists public.financial_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  process_id uuid not null references public.processes(id) on delete cascade,
  fee_id uuid references public.process_fees(id) on delete set null,
  expense_id uuid references public.process_expenses(id) on delete set null,
  trip_id uuid references public.process_trips(id) on delete set null,
  generated_document_id uuid references public.generated_documents(id) on delete set null,
  document_type text not null default 'other'
    check (document_type in (
      'fee_proposal','fee_increase_request','deposit_request','advance_request','release_request',
      'partial_payment_statement','receipt','invoice','expense_proof','other'
    )),
  title text not null check (char_length(title) between 3 and 220),
  status text not null default 'draft'
    check (status in ('draft','issued','filed','approved','rejected','archived')),
  content text,
  issue_date date,
  reference_number text,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists financial_documents_process_idx
  on public.financial_documents (process_id, document_type, created_at desc);

create table if not exists public.financial_attachments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  process_id uuid not null references public.processes(id) on delete cascade,
  fee_id uuid references public.process_fees(id) on delete cascade,
  transaction_id uuid references public.fee_transactions(id) on delete cascade,
  expense_id uuid references public.process_expenses(id) on delete cascade,
  trip_id uuid references public.process_trips(id) on delete cascade,
  financial_document_id uuid references public.financial_documents(id) on delete cascade,
  attachment_type text not null default 'other'
    check (attachment_type in ('deposit_proof','release_order','receipt','invoice','ticket','contract','calculation','other')),
  storage_bucket text not null default 'financial-files',
  storage_path text not null,
  original_name text not null,
  mime_type text,
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  description text,
  document_date date,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (storage_bucket, storage_path)
);

create index if not exists financial_attachments_process_idx
  on public.financial_attachments (process_id, attachment_type, created_at desc);

-- =========================================================
-- 6. PREFERÊNCIAS DE ALERTA
-- =========================================================

create table if not exists public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  timezone text not null default 'America/Sao_Paulo',
  in_app_enabled boolean not null default true,
  email_enabled boolean not null default true,
  daily_digest_enabled boolean not null default true,
  daily_digest_time time not null default '08:00',
  deadline_alert_days integer[] not null default array[7,3,1,0]::integer[],
  event_alert_minutes integer[] not null default array[1440,180]::integer[],
  fee_alerts_enabled boolean not null default true,
  expense_alerts_enabled boolean not null default true,
  overdue_alerts_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

-- =========================================================
-- 7. FUNÇÕES DE VALIDAÇÃO E CÁLCULO
-- =========================================================

create or replace function public.ensure_process_organization_match()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.process_id is not null and not exists (
    select 1
    from public.processes p
    where p.id = new.process_id
      and p.organization_id = new.organization_id
  ) then
    raise exception 'O processo informado não pertence à organização selecionada.';
  end if;
  return new;
end;
$$;

create or replace function public.prepare_fee_transaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.process_fees pf
    where pf.id = new.fee_id
      and pf.process_id = new.process_id
      and pf.organization_id = new.organization_id
  ) then
    raise exception 'O lançamento não corresponde aos honorários, processo e organização informados.';
  end if;

  if new.transaction_type = 'deposit' then
    new.net_amount := new.amount;
    new.withheld_amount := 0;
    new.deposit_delta := new.amount;
    new.received_delta := 0;
  elsif new.transaction_type = 'release' then
    new.net_amount := coalesce(new.net_amount, new.amount - new.withheld_amount);
    if new.net_amount < 0 or new.net_amount + new.withheld_amount > new.amount then
      raise exception 'O valor líquido somado às retenções não pode superar o valor bruto do levantamento.';
    end if;
    new.deposit_delta := -new.amount;
    new.received_delta := new.net_amount;
  elsif new.transaction_type = 'refund' then
    new.net_amount := 0;
    new.withheld_amount := 0;
    new.deposit_delta := -new.amount;
    new.received_delta := 0;
  elsif new.transaction_type = 'adjustment' then
    new.net_amount := coalesce(new.net_amount, 0);
    if new.deposit_delta = 0 and new.received_delta = 0 then
      raise exception 'Um ajuste deve alterar o saldo depositado, o valor recebido ou ambos.';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.calculate_process_expense()
returns trigger
language plpgsql
as $$
begin
  new.total_amount := round(new.quantity * new.unit_amount, 2);
  if new.payment_status = 'paid' and new.paid_at is null then
    new.paid_at := current_date;
  elsif new.payment_status <> 'paid' then
    new.paid_at := null;
  end if;
  return new;
end;
$$;

create or replace function public.calculate_process_trip()
returns trigger
language plpgsql
as $$
declare
  effective_km numeric(12,2);
begin
  if new.total_km <= 0 and new.one_way_km > 0 then
    new.total_km := round(new.one_way_km * 2 * new.trips_count, 2);
  end if;

  effective_km := coalesce(new.total_km, 0);

  if new.fuel_efficiency_km_l > 0 then
    new.fuel_cost := round((effective_km / new.fuel_efficiency_km_l) * new.fuel_price_per_liter, 2);
  else
    new.fuel_cost := 0;
  end if;

  new.vehicle_operating_cost := round(effective_km * new.vehicle_cost_per_km, 2);
  new.travel_time_cost := round(new.travel_hours * new.hourly_rate, 2);
  new.total_cost := round(
    new.fuel_cost
    + new.vehicle_operating_cost
    + new.travel_time_cost
    + new.toll_amount
    + new.lodging_amount
    + new.meal_amount
    + new.other_amount,
    2
  );

  return new;
end;
$$;

create or replace function public.validate_expense_trip_link()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.trip_id is not null and not exists (
    select 1 from public.process_trips pt
    where pt.id = new.trip_id
      and pt.process_id = new.process_id
      and pt.organization_id = new.organization_id
  ) then
    raise exception 'O deslocamento informado não pertence ao mesmo processo e organização da despesa.';
  end if;
  return new;
end;
$$;

create or replace function public.validate_financial_document_links()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.fee_id is not null and not exists (
    select 1 from public.process_fees x
    where x.id = new.fee_id and x.process_id = new.process_id and x.organization_id = new.organization_id
  ) then
    raise exception 'Honorários incompatíveis com o processo do documento financeiro.';
  end if;

  if new.expense_id is not null and not exists (
    select 1 from public.process_expenses x
    where x.id = new.expense_id and x.process_id = new.process_id and x.organization_id = new.organization_id
  ) then
    raise exception 'Despesa incompatível com o processo do documento financeiro.';
  end if;

  if new.trip_id is not null and not exists (
    select 1 from public.process_trips x
    where x.id = new.trip_id and x.process_id = new.process_id and x.organization_id = new.organization_id
  ) then
    raise exception 'Deslocamento incompatível com o processo do documento financeiro.';
  end if;

  if new.generated_document_id is not null and not exists (
    select 1 from public.generated_documents x
    where x.id = new.generated_document_id and x.process_id = new.process_id and x.organization_id = new.organization_id
  ) then
    raise exception 'Documento gerado incompatível com o processo financeiro.';
  end if;

  return new;
end;
$$;

create or replace function public.validate_financial_attachment_links()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.fee_id is not null and not exists (
    select 1 from public.process_fees x
    where x.id = new.fee_id and x.process_id = new.process_id and x.organization_id = new.organization_id
  ) then
    raise exception 'Honorários incompatíveis com o anexo.';
  end if;

  if new.transaction_id is not null and not exists (
    select 1 from public.fee_transactions x
    where x.id = new.transaction_id and x.process_id = new.process_id and x.organization_id = new.organization_id
  ) then
    raise exception 'Lançamento financeiro incompatível com o anexo.';
  end if;

  if new.expense_id is not null and not exists (
    select 1 from public.process_expenses x
    where x.id = new.expense_id and x.process_id = new.process_id and x.organization_id = new.organization_id
  ) then
    raise exception 'Despesa incompatível com o anexo.';
  end if;

  if new.trip_id is not null and not exists (
    select 1 from public.process_trips x
    where x.id = new.trip_id and x.process_id = new.process_id and x.organization_id = new.organization_id
  ) then
    raise exception 'Deslocamento incompatível com o anexo.';
  end if;

  if new.financial_document_id is not null and not exists (
    select 1 from public.financial_documents x
    where x.id = new.financial_document_id and x.process_id = new.process_id and x.organization_id = new.organization_id
  ) then
    raise exception 'Documento financeiro incompatível com o anexo.';
  end if;

  return new;
end;
$$;

create or replace function public.touch_process_last_movement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_process uuid;
begin
  if tg_op = 'DELETE' then
    target_process := old.process_id;
  else
    target_process := new.process_id;
  end if;

  if target_process is not null then
    update public.processes
    set last_movement_at = now()
    where id = target_process;
  end if;

  return null;
end;
$$;

create or replace function public.refresh_process_financial_status(target_process uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  fee_count integer;
  all_cancelled boolean;
  proposed_total numeric(14,2);
  approved_total numeric(14,2);
  opening_deposited numeric(14,2);
  opening_received numeric(14,2);
  transaction_deposit_balance numeric(14,2);
  transaction_received numeric(14,2);
  deposit_balance numeric(14,2);
  received_total numeric(14,2);
  derived_status text;
  has_release_request boolean;
  has_awaiting_deposit boolean;
  has_proposal_draft boolean;
  has_proposal_submitted boolean;
  has_awaiting_approval boolean;
begin
  select
    count(*),
    coalesce(bool_and(status = 'cancelled'), false),
    coalesce(sum(case when status <> 'cancelled' then proposed_amount else 0 end), 0),
    coalesce(sum(case when status <> 'cancelled' then approved_amount else 0 end), 0),
    coalesce(sum(case when status <> 'cancelled' then opening_deposited_amount else 0 end), 0),
    coalesce(sum(case when status <> 'cancelled' then opening_received_amount else 0 end), 0),
    coalesce(bool_or(status = 'release_requested'), false),
    coalesce(bool_or(status = 'awaiting_deposit'), false),
    coalesce(bool_or(status = 'proposal_draft'), false),
    coalesce(bool_or(status = 'proposal_submitted'), false),
    coalesce(bool_or(status = 'awaiting_approval'), false)
  into
    fee_count,
    all_cancelled,
    proposed_total,
    approved_total,
    opening_deposited,
    opening_received,
    has_release_request,
    has_awaiting_deposit,
    has_proposal_draft,
    has_proposal_submitted,
    has_awaiting_approval
  from public.process_fees
  where process_id = target_process;

  select
    coalesce(sum(case when ft.status = 'confirmed' then ft.deposit_delta else 0 end), 0),
    coalesce(sum(case when ft.status = 'confirmed' then ft.received_delta else 0 end), 0)
  into transaction_deposit_balance, transaction_received
  from public.fee_transactions ft
  join public.process_fees pf on pf.id = ft.fee_id
  where pf.process_id = target_process
    and pf.status <> 'cancelled';

  deposit_balance := opening_deposited + transaction_deposit_balance;
  received_total := opening_received + transaction_received;

  if fee_count = 0 then
    derived_status := 'not_defined';
  elsif all_cancelled then
    derived_status := 'cancelled';
  elsif approved_total > 0 and received_total >= approved_total then
    derived_status := 'fully_released';
  elsif received_total > 0 then
    derived_status := 'partially_released';
  elsif has_release_request then
    derived_status := 'release_requested';
  elsif approved_total > 0 and deposit_balance >= approved_total then
    derived_status := 'fully_deposited';
  elsif deposit_balance > 0 then
    derived_status := 'partially_deposited';
  elsif has_awaiting_deposit then
    derived_status := 'awaiting_deposit';
  elsif approved_total > 0 then
    derived_status := 'approved';
  elsif has_awaiting_approval then
    derived_status := 'awaiting_approval';
  elsif has_proposal_submitted then
    derived_status := 'proposal_submitted';
  elsif has_proposal_draft or proposed_total > 0 then
    derived_status := 'proposal_draft';
  else
    derived_status := 'not_defined';
  end if;

  update public.processes
  set financial_status = derived_status,
      last_movement_at = now()
  where id = target_process;
end;
$$;

create or replace function public.trigger_refresh_process_financial_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_process uuid;
begin
  if tg_op = 'DELETE' then
    target_process := old.process_id;
  else
    target_process := new.process_id;
  end if;

  perform public.refresh_process_financial_status(target_process);
  return null;
end;
$$;

-- Funções internas de gatilho não ficam disponíveis para execução direta pelos usuários.
revoke all on function public.ensure_process_organization_match() from public, anon, authenticated;
revoke all on function public.prepare_fee_transaction() from public, anon, authenticated;
revoke all on function public.validate_expense_trip_link() from public, anon, authenticated;
revoke all on function public.validate_financial_document_links() from public, anon, authenticated;
revoke all on function public.validate_financial_attachment_links() from public, anon, authenticated;
revoke all on function public.touch_process_last_movement() from public, anon, authenticated;
revoke all on function public.refresh_process_financial_status(uuid) from public, anon, authenticated;
revoke all on function public.trigger_refresh_process_financial_status() from public, anon, authenticated;

-- =========================================================
-- 8. GATILHOS
-- =========================================================

-- updated_at

drop trigger if exists process_fees_set_updated_at on public.process_fees;
create trigger process_fees_set_updated_at
before update on public.process_fees
for each row execute function public.set_updated_at();

drop trigger if exists fee_transactions_set_updated_at on public.fee_transactions;
create trigger fee_transactions_set_updated_at
before update on public.fee_transactions
for each row execute function public.set_updated_at();

drop trigger if exists process_trips_set_updated_at on public.process_trips;
create trigger process_trips_set_updated_at
before update on public.process_trips
for each row execute function public.set_updated_at();

drop trigger if exists process_expenses_set_updated_at on public.process_expenses;
create trigger process_expenses_set_updated_at
before update on public.process_expenses
for each row execute function public.set_updated_at();

drop trigger if exists calendar_events_set_updated_at on public.calendar_events;
create trigger calendar_events_set_updated_at
before update on public.calendar_events
for each row execute function public.set_updated_at();

drop trigger if exists event_participants_set_updated_at on public.event_participants;
create trigger event_participants_set_updated_at
before update on public.event_participants
for each row execute function public.set_updated_at();

drop trigger if exists financial_documents_set_updated_at on public.financial_documents;
create trigger financial_documents_set_updated_at
before update on public.financial_documents
for each row execute function public.set_updated_at();

drop trigger if exists financial_attachments_set_updated_at on public.financial_attachments;
create trigger financial_attachments_set_updated_at
before update on public.financial_attachments
for each row execute function public.set_updated_at();

drop trigger if exists notification_preferences_set_updated_at on public.notification_preferences;
create trigger notification_preferences_set_updated_at
before update on public.notification_preferences
for each row execute function public.set_updated_at();

-- Validação de processo e organização

drop trigger if exists process_fees_validate_process_org on public.process_fees;
create trigger process_fees_validate_process_org
before insert or update on public.process_fees
for each row execute function public.ensure_process_organization_match();

drop trigger if exists fee_transactions_validate_process_org on public.fee_transactions;
create trigger fee_transactions_validate_process_org
before insert or update on public.fee_transactions
for each row execute function public.ensure_process_organization_match();

drop trigger if exists process_trips_validate_process_org on public.process_trips;
create trigger process_trips_validate_process_org
before insert or update on public.process_trips
for each row execute function public.ensure_process_organization_match();

drop trigger if exists process_expenses_validate_process_org on public.process_expenses;
create trigger process_expenses_validate_process_org
before insert or update on public.process_expenses
for each row execute function public.ensure_process_organization_match();

drop trigger if exists calendar_events_validate_process_org on public.calendar_events;
create trigger calendar_events_validate_process_org
before insert or update on public.calendar_events
for each row execute function public.ensure_process_organization_match();

drop trigger if exists financial_documents_validate_process_org on public.financial_documents;
create trigger financial_documents_validate_process_org
before insert or update on public.financial_documents
for each row execute function public.ensure_process_organization_match();

drop trigger if exists financial_attachments_validate_process_org on public.financial_attachments;
create trigger financial_attachments_validate_process_org
before insert or update on public.financial_attachments
for each row execute function public.ensure_process_organization_match();

-- Cálculos e vínculos
drop trigger if exists fee_transactions_prepare on public.fee_transactions;
create trigger fee_transactions_prepare
before insert or update on public.fee_transactions
for each row execute function public.prepare_fee_transaction();

drop trigger if exists process_trips_calculate on public.process_trips;
create trigger process_trips_calculate
before insert or update on public.process_trips
for each row execute function public.calculate_process_trip();

drop trigger if exists process_expenses_calculate on public.process_expenses;
create trigger process_expenses_calculate
before insert or update on public.process_expenses
for each row execute function public.calculate_process_expense();

drop trigger if exists process_expenses_validate_trip on public.process_expenses;
create trigger process_expenses_validate_trip
before insert or update on public.process_expenses
for each row execute function public.validate_expense_trip_link();

drop trigger if exists financial_documents_validate_links on public.financial_documents;
create trigger financial_documents_validate_links
before insert or update on public.financial_documents
for each row execute function public.validate_financial_document_links();

drop trigger if exists financial_attachments_validate_links on public.financial_attachments;
create trigger financial_attachments_validate_links
before insert or update on public.financial_attachments
for each row execute function public.validate_financial_attachment_links();

-- Atualização da última movimentação do processo

drop trigger if exists process_fees_touch_process on public.process_fees;
create trigger process_fees_touch_process
after insert or update or delete on public.process_fees
for each row execute function public.touch_process_last_movement();

drop trigger if exists fee_transactions_touch_process on public.fee_transactions;
create trigger fee_transactions_touch_process
after insert or update or delete on public.fee_transactions
for each row execute function public.touch_process_last_movement();

drop trigger if exists process_trips_touch_process on public.process_trips;
create trigger process_trips_touch_process
after insert or update or delete on public.process_trips
for each row execute function public.touch_process_last_movement();

drop trigger if exists process_expenses_touch_process on public.process_expenses;
create trigger process_expenses_touch_process
after insert or update or delete on public.process_expenses
for each row execute function public.touch_process_last_movement();

drop trigger if exists calendar_events_touch_process on public.calendar_events;
create trigger calendar_events_touch_process
after insert or update or delete on public.calendar_events
for each row execute function public.touch_process_last_movement();

drop trigger if exists financial_documents_touch_process on public.financial_documents;
create trigger financial_documents_touch_process
after insert or update or delete on public.financial_documents
for each row execute function public.touch_process_last_movement();

drop trigger if exists financial_attachments_touch_process on public.financial_attachments;
create trigger financial_attachments_touch_process
after insert or update or delete on public.financial_attachments
for each row execute function public.touch_process_last_movement();

-- Sincronização da situação financeira do processo
drop trigger if exists process_fees_refresh_process_status on public.process_fees;
create trigger process_fees_refresh_process_status
after insert or update or delete on public.process_fees
for each row execute function public.trigger_refresh_process_financial_status();

drop trigger if exists fee_transactions_refresh_process_status on public.fee_transactions;
create trigger fee_transactions_refresh_process_status
after insert or update or delete on public.fee_transactions
for each row execute function public.trigger_refresh_process_financial_status();

-- =========================================================
-- 9. ROW LEVEL SECURITY
-- =========================================================

alter table public.process_fees enable row level security;
alter table public.fee_transactions enable row level security;
alter table public.process_trips enable row level security;
alter table public.process_expenses enable row level security;
alter table public.calendar_events enable row level security;
alter table public.event_participants enable row level security;
alter table public.financial_documents enable row level security;
alter table public.financial_attachments enable row level security;
alter table public.notification_preferences enable row level security;

-- Honorários
drop policy if exists "process_fees_select_member" on public.process_fees;
create policy "process_fees_select_member" on public.process_fees
for select to authenticated using (public.is_org_member(organization_id));

drop policy if exists "process_fees_insert_member" on public.process_fees;
create policy "process_fees_insert_member" on public.process_fees
for insert to authenticated with check (
  public.is_org_member(organization_id)
  and created_by = auth.uid()
  and exists (select 1 from public.processes p where p.id = process_id and p.organization_id = organization_id)
);

drop policy if exists "process_fees_update_member" on public.process_fees;
create policy "process_fees_update_member" on public.process_fees
for update to authenticated using (public.is_org_member(organization_id))
with check (public.is_org_member(organization_id));

drop policy if exists "process_fees_delete_admin" on public.process_fees;
create policy "process_fees_delete_admin" on public.process_fees
for delete to authenticated using (public.is_org_admin(organization_id));

-- Lançamentos
drop policy if exists "fee_transactions_select_member" on public.fee_transactions;
create policy "fee_transactions_select_member" on public.fee_transactions
for select to authenticated using (public.is_org_member(organization_id));

drop policy if exists "fee_transactions_insert_member" on public.fee_transactions;
create policy "fee_transactions_insert_member" on public.fee_transactions
for insert to authenticated with check (public.is_org_member(organization_id) and created_by = auth.uid());

drop policy if exists "fee_transactions_update_member" on public.fee_transactions;
create policy "fee_transactions_update_member" on public.fee_transactions
for update to authenticated using (public.is_org_member(organization_id))
with check (public.is_org_member(organization_id));

drop policy if exists "fee_transactions_delete_admin" on public.fee_transactions;
create policy "fee_transactions_delete_admin" on public.fee_transactions
for delete to authenticated using (public.is_org_admin(organization_id));

-- Deslocamentos
drop policy if exists "process_trips_select_member" on public.process_trips;
create policy "process_trips_select_member" on public.process_trips
for select to authenticated using (public.is_org_member(organization_id));

drop policy if exists "process_trips_insert_member" on public.process_trips;
create policy "process_trips_insert_member" on public.process_trips
for insert to authenticated with check (public.is_org_member(organization_id) and created_by = auth.uid());

drop policy if exists "process_trips_update_member" on public.process_trips;
create policy "process_trips_update_member" on public.process_trips
for update to authenticated using (public.is_org_member(organization_id))
with check (public.is_org_member(organization_id));

drop policy if exists "process_trips_delete_admin" on public.process_trips;
create policy "process_trips_delete_admin" on public.process_trips
for delete to authenticated using (public.is_org_admin(organization_id));

-- Despesas
drop policy if exists "process_expenses_select_member" on public.process_expenses;
create policy "process_expenses_select_member" on public.process_expenses
for select to authenticated using (public.is_org_member(organization_id));

drop policy if exists "process_expenses_insert_member" on public.process_expenses;
create policy "process_expenses_insert_member" on public.process_expenses
for insert to authenticated with check (public.is_org_member(organization_id) and created_by = auth.uid());

drop policy if exists "process_expenses_update_member" on public.process_expenses;
create policy "process_expenses_update_member" on public.process_expenses
for update to authenticated using (public.is_org_member(organization_id))
with check (public.is_org_member(organization_id));

drop policy if exists "process_expenses_delete_admin" on public.process_expenses;
create policy "process_expenses_delete_admin" on public.process_expenses
for delete to authenticated using (public.is_org_admin(organization_id));

-- Agenda
drop policy if exists "calendar_events_select_member" on public.calendar_events;
create policy "calendar_events_select_member" on public.calendar_events
for select to authenticated using (public.is_org_member(organization_id));

drop policy if exists "calendar_events_insert_member" on public.calendar_events;
create policy "calendar_events_insert_member" on public.calendar_events
for insert to authenticated with check (public.is_org_member(organization_id) and created_by = auth.uid());

drop policy if exists "calendar_events_update_member" on public.calendar_events;
create policy "calendar_events_update_member" on public.calendar_events
for update to authenticated using (public.is_org_member(organization_id))
with check (public.is_org_member(organization_id));

drop policy if exists "calendar_events_delete_admin" on public.calendar_events;
create policy "calendar_events_delete_admin" on public.calendar_events
for delete to authenticated using (public.is_org_admin(organization_id));

-- Participantes
drop policy if exists "event_participants_select_member" on public.event_participants;
create policy "event_participants_select_member" on public.event_participants
for select to authenticated using (
  exists (select 1 from public.calendar_events ce where ce.id = event_id and public.is_org_member(ce.organization_id))
);

drop policy if exists "event_participants_insert_member" on public.event_participants;
create policy "event_participants_insert_member" on public.event_participants
for insert to authenticated with check (
  (created_by = auth.uid() or created_by is null)
  and exists (select 1 from public.calendar_events ce where ce.id = event_id and public.is_org_member(ce.organization_id))
);

drop policy if exists "event_participants_update_member" on public.event_participants;
create policy "event_participants_update_member" on public.event_participants
for update to authenticated using (
  exists (select 1 from public.calendar_events ce where ce.id = event_id and public.is_org_member(ce.organization_id))
) with check (
  exists (select 1 from public.calendar_events ce where ce.id = event_id and public.is_org_member(ce.organization_id))
);

drop policy if exists "event_participants_delete_admin" on public.event_participants;
create policy "event_participants_delete_admin" on public.event_participants
for delete to authenticated using (
  exists (select 1 from public.calendar_events ce where ce.id = event_id and public.is_org_admin(ce.organization_id))
);

-- Documentos financeiros
drop policy if exists "financial_documents_select_member" on public.financial_documents;
create policy "financial_documents_select_member" on public.financial_documents
for select to authenticated using (public.is_org_member(organization_id));

drop policy if exists "financial_documents_insert_member" on public.financial_documents;
create policy "financial_documents_insert_member" on public.financial_documents
for insert to authenticated with check (public.is_org_member(organization_id) and created_by = auth.uid());

drop policy if exists "financial_documents_update_member" on public.financial_documents;
create policy "financial_documents_update_member" on public.financial_documents
for update to authenticated using (public.is_org_member(organization_id))
with check (public.is_org_member(organization_id));

drop policy if exists "financial_documents_delete_admin" on public.financial_documents;
create policy "financial_documents_delete_admin" on public.financial_documents
for delete to authenticated using (public.is_org_admin(organization_id));

-- Anexos financeiros
drop policy if exists "financial_attachments_select_member" on public.financial_attachments;
create policy "financial_attachments_select_member" on public.financial_attachments
for select to authenticated using (public.is_org_member(organization_id));

drop policy if exists "financial_attachments_insert_member" on public.financial_attachments;
create policy "financial_attachments_insert_member" on public.financial_attachments
for insert to authenticated with check (public.is_org_member(organization_id) and created_by = auth.uid());

drop policy if exists "financial_attachments_update_member" on public.financial_attachments;
create policy "financial_attachments_update_member" on public.financial_attachments
for update to authenticated using (public.is_org_member(organization_id))
with check (public.is_org_member(organization_id));

drop policy if exists "financial_attachments_delete_admin" on public.financial_attachments;
create policy "financial_attachments_delete_admin" on public.financial_attachments
for delete to authenticated using (public.is_org_admin(organization_id));

-- Preferências pessoais de notificação
drop policy if exists "notification_preferences_select_own" on public.notification_preferences;
create policy "notification_preferences_select_own" on public.notification_preferences
for select to authenticated using (user_id = auth.uid() and public.is_org_member(organization_id));

drop policy if exists "notification_preferences_insert_own" on public.notification_preferences;
create policy "notification_preferences_insert_own" on public.notification_preferences
for insert to authenticated with check (user_id = auth.uid() and public.is_org_member(organization_id));

drop policy if exists "notification_preferences_update_own" on public.notification_preferences;
create policy "notification_preferences_update_own" on public.notification_preferences
for update to authenticated using (user_id = auth.uid() and public.is_org_member(organization_id))
with check (user_id = auth.uid() and public.is_org_member(organization_id));

drop policy if exists "notification_preferences_delete_own" on public.notification_preferences;
create policy "notification_preferences_delete_own" on public.notification_preferences
for delete to authenticated using (user_id = auth.uid() and public.is_org_member(organization_id));

-- =========================================================
-- 10. STORAGE PRIVADO PARA COMPROVANTES FINANCEIROS
-- Estrutura: financial-files/{organization_id}/{process_id}/{arquivo}
-- =========================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'financial-files',
  'financial-files',
  false,
  10485760,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "financial_files_select_member" on storage.objects;
create policy "financial_files_select_member" on storage.objects
for select to authenticated using (
  bucket_id = 'financial-files'
  and exists (
    select 1 from public.organization_members om
    where om.user_id = auth.uid()
      and om.organization_id::text = (storage.foldername(name))[1]
  )
);

drop policy if exists "financial_files_insert_member" on storage.objects;
create policy "financial_files_insert_member" on storage.objects
for insert to authenticated with check (
  bucket_id = 'financial-files'
  and owner_id = auth.uid()::text
  and exists (
    select 1 from public.organization_members om
    where om.user_id = auth.uid()
      and om.organization_id::text = (storage.foldername(name))[1]
  )
);

drop policy if exists "financial_files_update_member" on storage.objects;
create policy "financial_files_update_member" on storage.objects
for update to authenticated using (
  bucket_id = 'financial-files'
  and exists (
    select 1 from public.organization_members om
    where om.user_id = auth.uid()
      and om.organization_id::text = (storage.foldername(name))[1]
  )
) with check (
  bucket_id = 'financial-files'
  and exists (
    select 1 from public.organization_members om
    where om.user_id = auth.uid()
      and om.organization_id::text = (storage.foldername(name))[1]
  )
);

drop policy if exists "financial_files_delete_member" on storage.objects;
create policy "financial_files_delete_member" on storage.objects
for delete to authenticated using (
  bucket_id = 'financial-files'
  and exists (
    select 1 from public.organization_members om
    where om.user_id = auth.uid()
      and om.organization_id::text = (storage.foldername(name))[1]
  )
);

-- =========================================================
-- 11. VIEWS DO PAINEL
-- =========================================================

create or replace view public.process_financial_summary
with (security_invoker = true)
as
with fee_totals as (
  select
    pf.process_id,
    sum(case when pf.status <> 'cancelled' then pf.initial_arbitrated_amount else 0 end) as initial_arbitrated_total,
    sum(case when pf.status <> 'cancelled' then pf.proposed_amount else 0 end) as proposed_total,
    sum(case when pf.status <> 'cancelled' then pf.approved_amount else 0 end) as approved_total,
    sum(case when pf.status <> 'cancelled' then pf.opening_deposited_amount else 0 end) as opening_deposited_total,
    sum(case when pf.status <> 'cancelled' then pf.opening_received_amount else 0 end) as opening_received_total
  from public.process_fees pf
  group by pf.process_id
),
transaction_totals as (
  select
    pf.process_id,
    sum(case when ft.status = 'confirmed' and ft.deposit_delta > 0 then ft.deposit_delta else 0 end) as new_deposits_total,
    sum(case when ft.status = 'confirmed' then ft.deposit_delta else 0 end) as deposit_balance_delta,
    sum(case when ft.status = 'confirmed' then ft.received_delta else 0 end) as received_delta_total,
    sum(case when ft.status = 'confirmed' then ft.withheld_amount else 0 end) as withheld_total
  from public.process_fees pf
  left join public.fee_transactions ft on ft.fee_id = pf.id
  where pf.status <> 'cancelled'
  group by pf.process_id
),
expense_totals as (
  select
    pe.process_id,
    sum(case when pe.payment_status <> 'cancelled' then pe.total_amount else 0 end) as expenses_forecast_total,
    sum(case when pe.payment_status = 'paid' then pe.total_amount else 0 end) as expenses_paid_total,
    sum(case when pe.is_reimbursable = true and pe.reimbursement_status not in ('reimbursed','denied') and pe.payment_status <> 'cancelled' then pe.total_amount else 0 end) as reimbursable_pending_total
  from public.process_expenses pe
  group by pe.process_id
),
trip_totals as (
  select
    pt.process_id,
    sum(case when pt.status <> 'cancelled' then pt.total_cost else 0 end) as trip_cost_forecast_total,
    sum(case when pt.status = 'completed' then pt.total_cost else 0 end) as trip_cost_completed_total
  from public.process_trips pt
  group by pt.process_id
)
select
  p.id as process_id,
  p.organization_id,
  p.process_number,
  p.subject,
  p.status as process_status,
  p.financial_status,
  coalesce(f.initial_arbitrated_total, 0)::numeric(14,2) as initial_arbitrated_total,
  coalesce(f.proposed_total, 0)::numeric(14,2) as proposed_total,
  coalesce(f.approved_total, 0)::numeric(14,2) as approved_total,
  (coalesce(f.opening_deposited_total, 0) + coalesce(t.new_deposits_total, 0))::numeric(14,2) as deposited_total,
  (coalesce(f.opening_deposited_total, 0) + coalesce(t.deposit_balance_delta, 0))::numeric(14,2) as deposit_balance,
  (coalesce(f.opening_received_total, 0) + coalesce(t.received_delta_total, 0))::numeric(14,2) as received_total,
  coalesce(t.withheld_total, 0)::numeric(14,2) as withheld_total,
  coalesce(e.expenses_forecast_total, 0)::numeric(14,2) as expenses_forecast_total,
  coalesce(e.expenses_paid_total, 0)::numeric(14,2) as expenses_paid_total,
  coalesce(e.reimbursable_pending_total, 0)::numeric(14,2) as reimbursable_pending_total,
  coalesce(tr.trip_cost_forecast_total, 0)::numeric(14,2) as trip_cost_forecast_total,
  coalesce(tr.trip_cost_completed_total, 0)::numeric(14,2) as trip_cost_completed_total,
  (coalesce(f.approved_total, 0) - coalesce(e.expenses_forecast_total, 0))::numeric(14,2) as forecast_result,
  (coalesce(f.opening_received_total, 0) + coalesce(t.received_delta_total, 0) - coalesce(e.expenses_paid_total, 0))::numeric(14,2) as realized_cash_result,
  p.last_movement_at
from public.processes p
left join fee_totals f on f.process_id = p.id
left join transaction_totals t on t.process_id = p.id
left join expense_totals e on e.process_id = p.id
left join trip_totals tr on tr.process_id = p.id;

create or replace view public.organization_financial_dashboard
with (security_invoker = true)
as
select
  organization_id,
  count(*) as process_count,
  count(*) filter (where financial_status not in ('fully_released','cancelled','not_defined')) as processes_with_financial_pending,
  sum(initial_arbitrated_total)::numeric(16,2) as initial_arbitrated_total,
  sum(proposed_total)::numeric(16,2) as proposed_total,
  sum(approved_total)::numeric(16,2) as approved_total,
  sum(deposited_total)::numeric(16,2) as deposited_total,
  sum(deposit_balance)::numeric(16,2) as deposit_balance,
  sum(received_total)::numeric(16,2) as received_total,
  sum(withheld_total)::numeric(16,2) as withheld_total,
  sum(expenses_forecast_total)::numeric(16,2) as expenses_forecast_total,
  sum(expenses_paid_total)::numeric(16,2) as expenses_paid_total,
  sum(reimbursable_pending_total)::numeric(16,2) as reimbursable_pending_total,
  sum(trip_cost_forecast_total)::numeric(16,2) as trip_cost_forecast_total,
  sum(forecast_result)::numeric(16,2) as forecast_result,
  sum(realized_cash_result)::numeric(16,2) as realized_cash_result,
  case when sum(approved_total) > 0
    then round(sum(approved_total) / nullif(count(*) filter (where approved_total > 0), 0), 2)
    else 0
  end::numeric(16,2) as average_approved_fee
from public.process_financial_summary
group by organization_id;

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
  floor(extract(epoch from (ce.starts_at - now())) / 86400)::integer as days_remaining
from public.calendar_events ce;

grant select on public.process_financial_summary to authenticated;
grant select on public.organization_financial_dashboard to authenticated;
grant select on public.calendar_event_alerts to authenticated;

-- =========================================================
-- 12. MIGRAÇÃO DOS DADOS JÁ EXISTENTES
-- =========================================================

-- Converte os campos financeiros básicos da v0.2 em um registro de honorários,
-- preservando os valores anteriores como saldos de abertura.
insert into public.process_fees (
  organization_id,
  process_id,
  title,
  fee_type,
  status,
  initial_arbitrated_amount,
  proposed_amount,
  approved_amount,
  opening_deposited_amount,
  opening_received_amount,
  is_primary,
  source_key,
  notes,
  created_by
)
select
  p.organization_id,
  p.id,
  'Honorários migrados do cadastro do processo',
  case
    when p.expertise_type = 'technical_assistant' then 'technical_assistant'
    when p.expertise_type = 'extrajudicial' then 'extrajudicial'
    else 'judicial_expert'
  end,
  case
    when coalesce(p.fee_received, 0) > 0 and coalesce(p.fee_arbitrated, 0) > 0 and p.fee_received >= p.fee_arbitrated then 'fully_released'
    when coalesce(p.fee_received, 0) > 0 then 'partially_released'
    when coalesce(p.fee_deposited, 0) > 0 and coalesce(p.fee_arbitrated, 0) > 0 and p.fee_deposited >= p.fee_arbitrated then 'fully_deposited'
    when coalesce(p.fee_deposited, 0) > 0 then 'partially_deposited'
    when coalesce(p.fee_arbitrated, 0) > 0 then 'approved'
    when coalesce(p.fee_proposed, 0) > 0 then 'proposal_submitted'
    else 'not_defined'
  end,
  coalesce(p.fee_arbitrated, 0),
  coalesce(p.fee_proposed, 0),
  coalesce(p.fee_arbitrated, 0),
  coalesce(p.fee_deposited, 0),
  coalesce(p.fee_received, 0),
  true,
  'legacy_process_fields',
  'Valores importados automaticamente dos campos financeiros existentes no processo antes da v0.6.',
  p.created_by
from public.processes p
where (
  coalesce(p.fee_proposed, 0) > 0
  or coalesce(p.fee_arbitrated, 0) > 0
  or coalesce(p.fee_deposited, 0) > 0
  or coalesce(p.fee_received, 0) > 0
)
  and not exists (
    select 1 from public.process_fees existing
    where existing.process_id = p.id
      and existing.is_primary = true
      and existing.status <> 'cancelled'
  )
on conflict (process_id, source_key) where source_key is not null do nothing;

-- Cria preferências-padrão para todos os membros atuais.
insert into public.notification_preferences (organization_id, user_id)
select om.organization_id, om.user_id
from public.organization_members om
on conflict (organization_id, user_id) do nothing;

-- Importa prazos existentes para a agenda, sem duplicar registros.
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
  'deadline:' || pd.id::text,
  coalesce(pd.created_by, p.created_by)
from public.process_deadlines pd
join public.processes p on p.id = pd.process_id
on conflict (organization_id, source_key) where source_key is not null do nothing;

-- Inclui diligências cadastradas diretamente no processo.
insert into public.calendar_events (
  organization_id,
  process_id,
  title,
  event_type,
  status,
  priority,
  starts_at,
  all_day,
  responsible_name,
  source_key,
  created_by
)
select
  p.organization_id,
  p.id,
  'Diligência pericial — ' || p.process_number,
  'diligence',
  'scheduled',
  p.priority,
  p.diligence_at,
  false,
  p.responsible_name,
  'process_diligence:' || p.id::text,
  p.created_by
from public.processes p
where p.diligence_at is not null
  and not exists (
    select 1 from public.process_deadlines pd
    where pd.process_id = p.id
      and pd.category = 'diligence'
      and pd.due_at::date = p.diligence_at::date
  )
on conflict (organization_id, source_key) where source_key is not null do nothing;

-- Inclui prazos de entrega de laudo cadastrados diretamente no processo.
insert into public.calendar_events (
  organization_id,
  process_id,
  title,
  event_type,
  status,
  priority,
  starts_at,
  all_day,
  source_key,
  created_by
)
select
  p.organization_id,
  p.id,
  'Prazo para entrega do laudo — ' || p.process_number,
  'report_due',
  case when p.report_due_at < current_date then 'pending' else 'scheduled' end,
  p.priority,
  ((p.report_due_at::timestamp + interval '12 hours') at time zone 'America/Sao_Paulo'),
  true,
  'process_report_due:' || p.id::text,
  p.created_by
from public.processes p
where p.report_due_at is not null
  and not exists (
    select 1 from public.process_deadlines pd
    where pd.process_id = p.id
      and pd.category = 'report'
      and pd.due_at::date = p.report_due_at
  )
on conflict (organization_id, source_key) where source_key is not null do nothing;

-- Atualiza a situação financeira de todos os processos que já possuem honorários.
do $$
declare
  rec record;
begin
  for rec in select distinct process_id from public.process_fees loop
    perform public.refresh_process_financial_status(rec.process_id);
  end loop;
end;
$$;

-- =========================================================
-- 13. COMENTÁRIOS DE ESQUEMA
-- =========================================================

comment on table public.process_fees is 'Honorários periciais por processo, separando valor arbitrado, proposto, homologado e saldos de abertura.';
comment on table public.fee_transactions is 'Depósitos, levantamentos, restituições e ajustes de honorários, com efeito separado no saldo judicial e no valor recebido.';
comment on table public.process_trips is 'Planejamento e cálculo de deslocamentos, combustível, veículo, pedágios, hospedagem e tempo técnico.';
comment on table public.process_expenses is 'Despesas previstas e realizadas vinculadas aos processos judiciais.';
comment on table public.calendar_events is 'Agenda pericial integrada a diligências, prazos, audiências, reuniões e vencimentos financeiros.';
comment on table public.event_participants is 'Participantes e presença nos compromissos da agenda pericial.';
comment on table public.financial_documents is 'Documentos financeiros vinculados a honorários, despesas, deslocamentos e petições geradas.';
comment on table public.financial_attachments is 'Comprovantes e arquivos financeiros armazenados em bucket privado.';
comment on table public.notification_preferences is 'Preferências individuais de alertas e resumos por organização.';
comment on view public.process_financial_summary is 'Resumo financeiro por processo, distinguindo previsão, depósito, recebimento, despesas e resultado.';
comment on view public.organization_financial_dashboard is 'Indicadores financeiros consolidados por organização.';
comment on view public.calendar_event_alerts is 'Eventos da agenda classificados por urgência temporal.';
