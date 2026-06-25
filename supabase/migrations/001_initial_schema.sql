-- OCTA Perito — estrutura inicial segura e multiusuário
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  professional_title text,
  council text,
  council_number text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 3 and 160),
  slug text not null unique,
  document text,
  owner_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','admin','expert','assistant','viewer')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table if not exists public.processes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  process_number text not null,
  court text,
  district text,
  division text,
  expertise_type text not null default 'judicial_expert' check (expertise_type in ('judicial_expert','technical_assistant','extrajudicial')),
  plaintiff text,
  defendant text,
  subject text,
  status text not null default 'appointment_received' check (status in ('appointment_received','analysis','fees_proposed','awaiting_decision','awaiting_deposit','scheduled','drafting','delivered','clarifications','closed')),
  appointed_at date,
  report_due_at date,
  notes text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, process_number)
);

create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  title text not null,
  category text not null check (category in ('petition','report','opinion','checklist','technical_block')),
  specialty text,
  content jsonb not null default '{}'::jsonb,
  is_octa_model boolean not null default false,
  version integer not null default 1,
  status text not null default 'draft' check (status in ('draft','active','archived')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists processes_org_status_idx on public.processes (organization_id, status);
create index if not exists processes_report_due_idx on public.processes (organization_id, report_due_at);
create index if not exists organization_members_user_idx on public.organization_members (user_id);
create index if not exists templates_org_category_idx on public.templates (organization_id, category);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.is_org_member(target_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.organization_members
    where organization_id = target_org and user_id = auth.uid()
  );
$$;

create or replace function public.is_org_admin(target_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.organization_members
    where organization_id = target_org
      and user_id = auth.uid()
      and role in ('owner','admin')
  );
$$;

grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.is_org_admin(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.processes enable row level security;
alter table public.templates enable row level security;

create policy "profiles_select_own" on public.profiles for select to authenticated using (id = auth.uid());
create policy "profiles_update_own" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "organizations_insert_owner" on public.organizations for insert to authenticated with check (owner_id = auth.uid());
create policy "organizations_select_member" on public.organizations for select to authenticated using (owner_id = auth.uid() or public.is_org_member(id));
create policy "organizations_update_admin" on public.organizations for update to authenticated using (owner_id = auth.uid() or public.is_org_admin(id)) with check (owner_id = auth.uid() or public.is_org_admin(id));

create policy "members_select_same_org" on public.organization_members for select to authenticated using (user_id = auth.uid() or public.is_org_member(organization_id));
create policy "members_insert_owner" on public.organization_members for insert to authenticated with check (
  user_id = auth.uid() and exists (select 1 from public.organizations o where o.id = organization_id and o.owner_id = auth.uid())
  or public.is_org_admin(organization_id)
);
create policy "members_update_admin" on public.organization_members for update to authenticated using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));
create policy "members_delete_admin" on public.organization_members for delete to authenticated using (public.is_org_admin(organization_id) and role <> 'owner');

create policy "processes_select_member" on public.processes for select to authenticated using (public.is_org_member(organization_id));
create policy "processes_insert_member" on public.processes for insert to authenticated with check (public.is_org_member(organization_id) and created_by = auth.uid());
create policy "processes_update_member" on public.processes for update to authenticated using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy "processes_delete_admin" on public.processes for delete to authenticated using (public.is_org_admin(organization_id));

create policy "templates_select_available" on public.templates for select to authenticated using (is_octa_model = true or (organization_id is not null and public.is_org_member(organization_id)));
create policy "templates_insert_member" on public.templates for insert to authenticated with check (organization_id is not null and public.is_org_member(organization_id) and created_by = auth.uid());
create policy "templates_update_member" on public.templates for update to authenticated using (organization_id is not null and public.is_org_member(organization_id) and is_octa_model = false) with check (organization_id is not null and public.is_org_member(organization_id) and is_octa_model = false);
create policy "templates_delete_admin" on public.templates for delete to authenticated using (organization_id is not null and public.is_org_admin(organization_id) and is_octa_model = false);
