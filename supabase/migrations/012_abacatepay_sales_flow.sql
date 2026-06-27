-- OCTA Perito v0.8.5 - vendas, checkout Abacate Pay e provisionamento automatico

create table if not exists public.sales_checkout_sessions (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'pending',
  buyer_name text not null,
  buyer_email text not null,
  buyer_phone text,
  buyer_document text,
  organization_name text not null,
  organization_document text,
  plan_code text not null default 'octa-perito-mensal',
  amount_cents integer not null default 0,
  currency text not null default 'BRL',
  provider text not null default 'abacatepay',
  provider_customer_id text,
  provider_checkout_id text,
  provider_subscription_id text,
  checkout_url text,
  completion_url text,
  return_url text,
  organization_id uuid references public.organizations(id) on delete set null,
  owner_user_id uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  paid_at timestamptz,
  failed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'sales_checkout_sessions_status_check'
      and conrelid = 'public.sales_checkout_sessions'::regclass
  ) then
    alter table public.sales_checkout_sessions add constraint sales_checkout_sessions_status_check
      check (status in ('pending','checkout_created','paid','provisioned','failed','cancelled'));
  end if;
end $$;

alter table public.subscription_events alter column organization_id drop not null;

create unique index if not exists sales_checkout_sessions_provider_checkout_unique
  on public.sales_checkout_sessions(provider, provider_checkout_id)
  where provider_checkout_id is not null;

create unique index if not exists sales_checkout_sessions_provider_subscription_unique
  on public.sales_checkout_sessions(provider, provider_subscription_id)
  where provider_subscription_id is not null;

create index if not exists sales_checkout_sessions_email_idx
  on public.sales_checkout_sessions(lower(buyer_email), created_at desc);

create unique index if not exists billing_customers_provider_customer_unique
  on public.billing_customers(provider, provider_customer_id)
  where provider_customer_id is not null;

create unique index if not exists subscriptions_provider_subscription_unique
  on public.subscriptions(provider, provider_subscription_id)
  where provider_subscription_id is not null;

create unique index if not exists payments_provider_payment_unique
  on public.payments(provider, provider_payment_id)
  where provider_payment_id is not null;

create unique index if not exists subscription_events_provider_event_unique
  on public.subscription_events(provider, provider_event_id)
  where provider_event_id is not null;

alter table public.sales_checkout_sessions enable row level security;

drop policy if exists "sales_checkout_sessions_platform_admin_all" on public.sales_checkout_sessions;
create policy "sales_checkout_sessions_platform_admin_all" on public.sales_checkout_sessions
for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());
