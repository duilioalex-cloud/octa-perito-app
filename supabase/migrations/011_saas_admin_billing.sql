-- OCTA Perito v0.8.4 - painel administrativo SaaS e controle de cobranca

create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

alter table public.organizations add column if not exists billing_status text not null default 'active';
alter table public.organizations add column if not exists billing_plan text not null default 'manual';
alter table public.organizations add column if not exists billing_customer_id uuid;
alter table public.organizations add column if not exists current_subscription_id uuid;
alter table public.organizations add column if not exists billing_blocked_at timestamptz;
alter table public.organizations add column if not exists billing_block_reason text;
alter table public.organizations add column if not exists billing_trial_ends_at timestamptz;
alter table public.organizations add column if not exists billing_current_period_ends_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'organizations_billing_status_check'
      and conrelid = 'public.organizations'::regclass
  ) then
    alter table public.organizations add constraint organizations_billing_status_check
      check (billing_status in ('trialing','active','past_due','blocked','cancelled'));
  end if;
end $$;

create table if not exists public.billing_customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  owner_id uuid references auth.users(id) on delete set null,
  name text,
  email text,
  document text,
  phone text,
  provider text not null default 'manual',
  provider_customer_id text,
  external_reference text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid references public.billing_customers(id) on delete set null,
  plan_code text not null default 'octa-perito',
  status text not null default 'active',
  amount_cents integer not null default 0,
  currency text not null default 'BRL',
  provider text not null default 'manual',
  provider_subscription_id text,
  current_period_started_at timestamptz,
  current_period_ends_at timestamptz,
  trial_ends_at timestamptz,
  cancelled_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  status text not null default 'pending',
  amount_cents integer not null default 0,
  currency text not null default 'BRL',
  provider text not null default 'manual',
  provider_payment_id text,
  checkout_url text,
  due_at timestamptz,
  paid_at timestamptz,
  failed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscription_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  event_type text not null,
  provider text not null default 'manual',
  provider_event_id text,
  payload jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'subscriptions_status_check'
      and conrelid = 'public.subscriptions'::regclass
  ) then
    alter table public.subscriptions add constraint subscriptions_status_check
      check (status in ('trialing','active','past_due','blocked','cancelled'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'payments_status_check'
      and conrelid = 'public.payments'::regclass
  ) then
    alter table public.payments add constraint payments_status_check
      check (status in ('pending','paid','failed','refunded','cancelled','expired'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'organizations_billing_customer_fk'
      and conrelid = 'public.organizations'::regclass
  ) then
    alter table public.organizations add constraint organizations_billing_customer_fk
      foreign key (billing_customer_id) references public.billing_customers(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'organizations_current_subscription_fk'
      and conrelid = 'public.organizations'::regclass
  ) then
    alter table public.organizations add constraint organizations_current_subscription_fk
      foreign key (current_subscription_id) references public.subscriptions(id) on delete set null;
  end if;
end $$;

create index if not exists platform_admins_user_idx on public.platform_admins(user_id);
create index if not exists billing_customers_org_idx on public.billing_customers(organization_id);
create index if not exists subscriptions_org_status_idx on public.subscriptions(organization_id, status);
create index if not exists payments_org_status_idx on public.payments(organization_id, status);
create index if not exists subscription_events_org_idx on public.subscription_events(organization_id, created_at desc);

create or replace function public.is_platform_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.platform_admins
    where user_id = auth.uid()
  );
$$;

grant execute on function public.is_platform_admin() to authenticated;

alter table public.platform_admins enable row level security;
alter table public.billing_customers enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;
alter table public.subscription_events enable row level security;

drop policy if exists "platform_admins_select_self" on public.platform_admins;
create policy "platform_admins_select_self" on public.platform_admins
for select to authenticated using (user_id = auth.uid());

drop policy if exists "billing_customers_platform_admin_all" on public.billing_customers;
create policy "billing_customers_platform_admin_all" on public.billing_customers
for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());

drop policy if exists "subscriptions_platform_admin_all" on public.subscriptions;
create policy "subscriptions_platform_admin_all" on public.subscriptions
for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());

drop policy if exists "payments_platform_admin_all" on public.payments;
create policy "payments_platform_admin_all" on public.payments
for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());

drop policy if exists "subscription_events_platform_admin_all" on public.subscription_events;
create policy "subscription_events_platform_admin_all" on public.subscription_events
for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());

drop policy if exists "organizations_select_platform_admin" on public.organizations;
create policy "organizations_select_platform_admin" on public.organizations
for select to authenticated using (public.is_platform_admin());

drop policy if exists "organizations_update_platform_admin" on public.organizations;
create policy "organizations_update_platform_admin" on public.organizations
for update to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());

drop policy if exists "profiles_select_platform_admin" on public.profiles;
create policy "profiles_select_platform_admin" on public.profiles
for select to authenticated using (public.is_platform_admin());

drop policy if exists "members_select_platform_admin" on public.organization_members;
create policy "members_select_platform_admin" on public.organization_members
for select to authenticated using (public.is_platform_admin());

insert into public.platform_admins (user_id, created_by)
select id, id
from auth.users
where lower(email) = lower('duilioalex@gmail.com')
on conflict (user_id) do nothing;
