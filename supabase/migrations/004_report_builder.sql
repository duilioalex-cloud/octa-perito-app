-- OCTA Perito v0.4 — Construtor de Laudos
-- Estrutura modular para laudos, quesitos, fontes, equipamentos, anexos e versões.
-- Migração idempotente: pode ser executada novamente sem apagar dados existentes.

create extension if not exists pgcrypto;

-- Mantém compatibilidade caso a função ainda não exista no ambiente.
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
-- 1. TIPOS DE LAUDO E ESTRUTURAS-PADRÃO
-- =========================================================

create table if not exists public.report_types (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  slug text not null,
  name text not null check (char_length(name) between 3 and 180),
  specialty text not null,
  description text,
  is_octa_model boolean not null default false,
  status text not null default 'draft' check (status in ('draft','active','archived')),
  version integer not null default 1 check (version >= 1),
  source_label text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists report_types_octa_slug_unique
  on public.report_types (slug)
  where organization_id is null;

create unique index if not exists report_types_org_slug_unique
  on public.report_types (organization_id, slug)
  where organization_id is not null;

create index if not exists report_types_library_idx
  on public.report_types (is_octa_model, status, specialty, name);

create table if not exists public.report_section_templates (
  id uuid primary key default gen_random_uuid(),
  report_type_id uuid not null references public.report_types(id) on delete cascade,
  section_key text not null,
  title text not null check (char_length(title) between 2 and 180),
  description text,
  content_kind text not null default 'rich_text'
    check (content_kind in ('rich_text','questions','photos','attachments','sources','equipment','conclusion')),
  default_content text not null default '',
  variables text[] not null default '{}'::text[],
  review_warnings text[] not null default '{}'::text[],
  sort_order integer not null default 0,
  is_required boolean not null default false,
  is_enabled_default boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (report_type_id, section_key)
);

create index if not exists report_section_templates_type_order_idx
  on public.report_section_templates (report_type_id, sort_order);

create table if not exists public.technical_blocks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  slug text not null,
  title text not null check (char_length(title) between 3 and 180),
  specialty text not null,
  category text not null default 'methodology'
    check (category in ('methodology','analysis','limitation','conclusion','answer','equipment','legal_note','other')),
  description text,
  content text not null,
  variables text[] not null default '{}'::text[],
  review_warnings text[] not null default '{}'::text[],
  is_octa_model boolean not null default false,
  status text not null default 'draft' check (status in ('draft','active','archived')),
  version integer not null default 1 check (version >= 1),
  source_label text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists technical_blocks_octa_slug_unique
  on public.technical_blocks (slug)
  where organization_id is null;

create unique index if not exists technical_blocks_org_slug_unique
  on public.technical_blocks (organization_id, slug)
  where organization_id is not null;

create index if not exists technical_blocks_library_idx
  on public.technical_blocks (is_octa_model, status, specialty, category, title);

-- =========================================================
-- 2. LAUDOS GERADOS
-- =========================================================

create table if not exists public.expert_reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  process_id uuid not null references public.processes(id) on delete cascade,
  report_type_id uuid not null references public.report_types(id) on delete restrict,
  title text not null check (char_length(title) between 3 and 220),
  status text not null default 'draft'
    check (status in ('draft','in_review','final','filed','archived')),
  report_date date,
  current_version integer not null default 0 check (current_version >= 0),
  variables jsonb not null default '{}'::jsonb,
  generation_settings jsonb not null default '{}'::jsonb,
  notes text,
  created_by uuid not null references auth.users(id) on delete restrict,
  reviewed_by uuid references auth.users(id) on delete set null,
  finalized_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  finalized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists expert_reports_process_idx
  on public.expert_reports (process_id, updated_at desc);

create index if not exists expert_reports_org_status_idx
  on public.expert_reports (organization_id, status, updated_at desc);

create table if not exists public.expert_report_sections (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.expert_reports(id) on delete cascade,
  section_template_id uuid references public.report_section_templates(id) on delete set null,
  section_key text not null,
  title text not null check (char_length(title) between 2 and 180),
  content_kind text not null default 'rich_text'
    check (content_kind in ('rich_text','questions','photos','attachments','sources','equipment','conclusion')),
  content text not null default '',
  sort_order integer not null default 0,
  is_enabled boolean not null default true,
  is_required boolean not null default false,
  review_status text not null default 'draft'
    check (review_status in ('draft','reviewed','final')),
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (report_id, section_key)
);

create index if not exists expert_report_sections_report_order_idx
  on public.expert_report_sections (report_id, sort_order);

create table if not exists public.expert_report_questions (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.expert_reports(id) on delete cascade,
  origin text not null default 'other'
    check (origin in ('court','plaintiff','defendant','prosecutor','assistant','other')),
  origin_label text,
  question_number text,
  question text not null check (char_length(question) >= 3),
  answer text not null default '',
  answer_status text not null default 'pending'
    check (answer_status in ('pending','answered','reviewed','not_applicable')),
  sort_order integer not null default 0,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists expert_report_questions_report_origin_idx
  on public.expert_report_questions (report_id, origin, sort_order);

create table if not exists public.expert_report_sources (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.expert_reports(id) on delete cascade,
  source_type text not null default 'case_document'
    check (source_type in ('case_document','external_document','measurement','image','testimony','inspection','other')),
  title text not null check (char_length(title) between 2 and 220),
  reference_label text,
  description text,
  source_date date,
  was_analyzed boolean not null default true,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists expert_report_sources_report_idx
  on public.expert_report_sources (report_id, sort_order);

create table if not exists public.expert_report_equipment (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.expert_reports(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 180),
  brand text,
  model text,
  serial_number text,
  calibration_certificate text,
  calibration_date date,
  calibration_due_date date,
  usage_description text,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (calibration_due_date is null or calibration_date is null or calibration_due_date >= calibration_date)
);

create index if not exists expert_report_equipment_report_idx
  on public.expert_report_equipment (report_id, sort_order);

create table if not exists public.expert_report_attachments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  report_id uuid not null references public.expert_reports(id) on delete cascade,
  section_id uuid references public.expert_report_sections(id) on delete set null,
  file_type text not null default 'other'
    check (file_type in ('photo','document','map','certificate','spreadsheet','drawing','other')),
  storage_bucket text not null default 'report-files',
  storage_path text not null,
  original_name text not null,
  mime_type text,
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  caption text,
  description text,
  captured_at timestamptz,
  location_text text,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (storage_bucket, storage_path)
);

create index if not exists expert_report_attachments_report_idx
  on public.expert_report_attachments (report_id, file_type, sort_order);

create table if not exists public.expert_report_versions (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.expert_reports(id) on delete cascade,
  version integer not null check (version >= 1),
  snapshot jsonb not null,
  change_summary text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (report_id, version)
);

create index if not exists expert_report_versions_report_idx
  on public.expert_report_versions (report_id, version desc);

-- =========================================================
-- 3. GATILHOS E FUNÇÕES
-- =========================================================

create or replace function public.validate_expert_report_links()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.processes p
    where p.id = new.process_id
      and p.organization_id = new.organization_id
  ) then
    raise exception 'O processo informado não pertence à organização do laudo.';
  end if;

  if not exists (
    select 1
    from public.report_types rt
    where rt.id = new.report_type_id
      and (rt.is_octa_model = true or rt.organization_id = new.organization_id)
  ) then
    raise exception 'O tipo de laudo não está disponível para esta organização.';
  end if;

  return new;
end;
$$;

drop trigger if exists expert_reports_validate_links on public.expert_reports;
create trigger expert_reports_validate_links
before insert or update of organization_id, process_id, report_type_id on public.expert_reports
for each row execute procedure public.validate_expert_report_links();

create or replace function public.validate_report_section_template()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_report_type_id uuid;
begin
  if new.section_template_id is null then
    return new;
  end if;

  select r.report_type_id
    into v_report_type_id
  from public.expert_reports r
  where r.id = new.report_id;

  if v_report_type_id is null or not exists (
    select 1
    from public.report_section_templates rst
    where rst.id = new.section_template_id
      and rst.report_type_id = v_report_type_id
  ) then
    raise exception 'A seção selecionada não pertence ao tipo deste laudo.';
  end if;

  return new;
end;
$$;

drop trigger if exists expert_report_sections_validate_template on public.expert_report_sections;
create trigger expert_report_sections_validate_template
before insert or update of report_id, section_template_id on public.expert_report_sections
for each row execute procedure public.validate_report_section_template();

create or replace function public.validate_report_attachment_links()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_organization_id uuid;
begin
  select r.organization_id
    into v_organization_id
  from public.expert_reports r
  where r.id = new.report_id;

  if v_organization_id is null or v_organization_id <> new.organization_id then
    raise exception 'O anexo não pertence à organização do laudo.';
  end if;

  if new.section_id is not null and not exists (
    select 1
    from public.expert_report_sections s
    where s.id = new.section_id
      and s.report_id = new.report_id
  ) then
    raise exception 'A seção informada não pertence ao laudo.';
  end if;

  return new;
end;
$$;

drop trigger if exists expert_report_attachments_validate_links on public.expert_report_attachments;
create trigger expert_report_attachments_validate_links
before insert or update of organization_id, report_id, section_id on public.expert_report_attachments
for each row execute procedure public.validate_report_attachment_links();

create or replace function public.instantiate_report_sections()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.expert_report_sections (
    report_id,
    section_template_id,
    section_key,
    title,
    content_kind,
    content,
    sort_order,
    is_enabled,
    is_required,
    metadata,
    created_by
  )
  select
    new.id,
    rst.id,
    rst.section_key,
    rst.title,
    rst.content_kind,
    rst.default_content,
    rst.sort_order,
    rst.is_enabled_default,
    rst.is_required,
    jsonb_build_object(
      'variables', rst.variables,
      'review_warnings', rst.review_warnings,
      'template_metadata', rst.metadata
    ),
    new.created_by
  from public.report_section_templates rst
  where rst.report_type_id = new.report_type_id
  order by rst.sort_order
  on conflict (report_id, section_key) do nothing;

  return new;
end;
$$;

drop trigger if exists expert_reports_instantiate_sections on public.expert_reports;
create trigger expert_reports_instantiate_sections
after insert on public.expert_reports
for each row execute procedure public.instantiate_report_sections();

create or replace function public.snapshot_expert_report(
  target_report uuid,
  summary text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_report public.expert_reports%rowtype;
  v_version integer;
  v_snapshot jsonb;
begin
  select *
    into v_report
  from public.expert_reports
  where id = target_report
  for update;

  if not found then
    raise exception 'Laudo não encontrado.';
  end if;

  if not public.is_org_member(v_report.organization_id) then
    raise exception 'Acesso negado ao laudo.';
  end if;

  select coalesce(max(version), 0) + 1
    into v_version
  from public.expert_report_versions
  where report_id = target_report;

  v_snapshot := jsonb_build_object(
    'report', to_jsonb(v_report),
    'sections', coalesce((
      select jsonb_agg(to_jsonb(s) order by s.sort_order, s.created_at)
      from public.expert_report_sections s
      where s.report_id = target_report
    ), '[]'::jsonb),
    'questions', coalesce((
      select jsonb_agg(to_jsonb(q) order by q.origin, q.sort_order, q.created_at)
      from public.expert_report_questions q
      where q.report_id = target_report
    ), '[]'::jsonb),
    'sources', coalesce((
      select jsonb_agg(to_jsonb(src) order by src.sort_order, src.created_at)
      from public.expert_report_sources src
      where src.report_id = target_report
    ), '[]'::jsonb),
    'equipment', coalesce((
      select jsonb_agg(to_jsonb(eq) order by eq.sort_order, eq.created_at)
      from public.expert_report_equipment eq
      where eq.report_id = target_report
    ), '[]'::jsonb),
    'attachments', coalesce((
      select jsonb_agg(to_jsonb(att) order by att.file_type, att.sort_order, att.created_at)
      from public.expert_report_attachments att
      where att.report_id = target_report
    ), '[]'::jsonb)
  );

  insert into public.expert_report_versions (
    report_id,
    version,
    snapshot,
    change_summary,
    created_by
  ) values (
    target_report,
    v_version,
    v_snapshot,
    summary,
    auth.uid()
  );

  update public.expert_reports
  set current_version = v_version,
      updated_at = now()
  where id = target_report;

  return v_version;
end;
$$;

grant execute on function public.snapshot_expert_report(uuid, text) to authenticated;

-- Atualização automática de updated_at.
drop trigger if exists report_types_set_updated_at on public.report_types;
create trigger report_types_set_updated_at
before update on public.report_types
for each row execute procedure public.set_updated_at();

drop trigger if exists report_section_templates_set_updated_at on public.report_section_templates;
create trigger report_section_templates_set_updated_at
before update on public.report_section_templates
for each row execute procedure public.set_updated_at();

drop trigger if exists technical_blocks_set_updated_at on public.technical_blocks;
create trigger technical_blocks_set_updated_at
before update on public.technical_blocks
for each row execute procedure public.set_updated_at();

drop trigger if exists expert_reports_set_updated_at on public.expert_reports;
create trigger expert_reports_set_updated_at
before update on public.expert_reports
for each row execute procedure public.set_updated_at();

drop trigger if exists expert_report_sections_set_updated_at on public.expert_report_sections;
create trigger expert_report_sections_set_updated_at
before update on public.expert_report_sections
for each row execute procedure public.set_updated_at();

drop trigger if exists expert_report_questions_set_updated_at on public.expert_report_questions;
create trigger expert_report_questions_set_updated_at
before update on public.expert_report_questions
for each row execute procedure public.set_updated_at();

drop trigger if exists expert_report_sources_set_updated_at on public.expert_report_sources;
create trigger expert_report_sources_set_updated_at
before update on public.expert_report_sources
for each row execute procedure public.set_updated_at();

drop trigger if exists expert_report_equipment_set_updated_at on public.expert_report_equipment;
create trigger expert_report_equipment_set_updated_at
before update on public.expert_report_equipment
for each row execute procedure public.set_updated_at();

drop trigger if exists expert_report_attachments_set_updated_at on public.expert_report_attachments;
create trigger expert_report_attachments_set_updated_at
before update on public.expert_report_attachments
for each row execute procedure public.set_updated_at();

-- =========================================================
-- 4. ROW LEVEL SECURITY
-- =========================================================

alter table public.report_types enable row level security;
alter table public.report_section_templates enable row level security;
alter table public.technical_blocks enable row level security;
alter table public.expert_reports enable row level security;
alter table public.expert_report_sections enable row level security;
alter table public.expert_report_questions enable row level security;
alter table public.expert_report_sources enable row level security;
alter table public.expert_report_equipment enable row level security;
alter table public.expert_report_attachments enable row level security;
alter table public.expert_report_versions enable row level security;

-- Tipos de laudo.
drop policy if exists "report_types_select_available" on public.report_types;
create policy "report_types_select_available" on public.report_types
for select to authenticated using (
  is_octa_model = true
  or (organization_id is not null and public.is_org_member(organization_id))
);

drop policy if exists "report_types_insert_member" on public.report_types;
create policy "report_types_insert_member" on public.report_types
for insert to authenticated with check (
  organization_id is not null
  and public.is_org_member(organization_id)
  and created_by = auth.uid()
  and is_octa_model = false
);

drop policy if exists "report_types_update_member" on public.report_types;
create policy "report_types_update_member" on public.report_types
for update to authenticated using (
  organization_id is not null
  and public.is_org_member(organization_id)
  and is_octa_model = false
) with check (
  organization_id is not null
  and public.is_org_member(organization_id)
  and is_octa_model = false
);

drop policy if exists "report_types_delete_admin" on public.report_types;
create policy "report_types_delete_admin" on public.report_types
for delete to authenticated using (
  organization_id is not null
  and public.is_org_admin(organization_id)
  and is_octa_model = false
);

-- Estruturas de seção.
drop policy if exists "report_section_templates_select_available" on public.report_section_templates;
create policy "report_section_templates_select_available" on public.report_section_templates
for select to authenticated using (
  exists (
    select 1
    from public.report_types rt
    where rt.id = report_type_id
      and (
        rt.is_octa_model = true
        or (rt.organization_id is not null and public.is_org_member(rt.organization_id))
      )
  )
);

drop policy if exists "report_section_templates_insert_member" on public.report_section_templates;
create policy "report_section_templates_insert_member" on public.report_section_templates
for insert to authenticated with check (
  created_by = auth.uid()
  and exists (
    select 1
    from public.report_types rt
    where rt.id = report_type_id
      and rt.organization_id is not null
      and public.is_org_member(rt.organization_id)
      and rt.is_octa_model = false
  )
);

drop policy if exists "report_section_templates_update_member" on public.report_section_templates;
create policy "report_section_templates_update_member" on public.report_section_templates
for update to authenticated using (
  exists (
    select 1
    from public.report_types rt
    where rt.id = report_type_id
      and rt.organization_id is not null
      and public.is_org_member(rt.organization_id)
      and rt.is_octa_model = false
  )
) with check (
  exists (
    select 1
    from public.report_types rt
    where rt.id = report_type_id
      and rt.organization_id is not null
      and public.is_org_member(rt.organization_id)
      and rt.is_octa_model = false
  )
);

drop policy if exists "report_section_templates_delete_admin" on public.report_section_templates;
create policy "report_section_templates_delete_admin" on public.report_section_templates
for delete to authenticated using (
  exists (
    select 1
    from public.report_types rt
    where rt.id = report_type_id
      and rt.organization_id is not null
      and public.is_org_admin(rt.organization_id)
      and rt.is_octa_model = false
  )
);

-- Blocos técnicos.
drop policy if exists "technical_blocks_select_available" on public.technical_blocks;
create policy "technical_blocks_select_available" on public.technical_blocks
for select to authenticated using (
  is_octa_model = true
  or (organization_id is not null and public.is_org_member(organization_id))
);

drop policy if exists "technical_blocks_insert_member" on public.technical_blocks;
create policy "technical_blocks_insert_member" on public.technical_blocks
for insert to authenticated with check (
  organization_id is not null
  and public.is_org_member(organization_id)
  and created_by = auth.uid()
  and is_octa_model = false
);

drop policy if exists "technical_blocks_update_member" on public.technical_blocks;
create policy "technical_blocks_update_member" on public.technical_blocks
for update to authenticated using (
  organization_id is not null
  and public.is_org_member(organization_id)
  and is_octa_model = false
) with check (
  organization_id is not null
  and public.is_org_member(organization_id)
  and is_octa_model = false
);

drop policy if exists "technical_blocks_delete_admin" on public.technical_blocks;
create policy "technical_blocks_delete_admin" on public.technical_blocks
for delete to authenticated using (
  organization_id is not null
  and public.is_org_admin(organization_id)
  and is_octa_model = false
);

-- Laudos.
drop policy if exists "expert_reports_select_member" on public.expert_reports;
create policy "expert_reports_select_member" on public.expert_reports
for select to authenticated using (public.is_org_member(organization_id));

drop policy if exists "expert_reports_insert_member" on public.expert_reports;
create policy "expert_reports_insert_member" on public.expert_reports
for insert to authenticated with check (
  public.is_org_member(organization_id)
  and created_by = auth.uid()
  and exists (
    select 1
    from public.processes p
    where p.id = process_id
      and p.organization_id = organization_id
  )
  and exists (
    select 1
    from public.report_types rt
    where rt.id = report_type_id
      and (
        rt.is_octa_model = true
        or (rt.organization_id = organization_id and public.is_org_member(rt.organization_id))
      )
  )
);

drop policy if exists "expert_reports_update_member" on public.expert_reports;
create policy "expert_reports_update_member" on public.expert_reports
for update to authenticated using (public.is_org_member(organization_id))
with check (public.is_org_member(organization_id));

drop policy if exists "expert_reports_delete_admin" on public.expert_reports;
create policy "expert_reports_delete_admin" on public.expert_reports
for delete to authenticated using (public.is_org_admin(organization_id));

-- Seções.
drop policy if exists "expert_report_sections_select_member" on public.expert_report_sections;
create policy "expert_report_sections_select_member" on public.expert_report_sections
for select to authenticated using (
  exists (
    select 1 from public.expert_reports r
    where r.id = report_id and public.is_org_member(r.organization_id)
  )
);

drop policy if exists "expert_report_sections_insert_member" on public.expert_report_sections;
create policy "expert_report_sections_insert_member" on public.expert_report_sections
for insert to authenticated with check (
  (created_by = auth.uid() or created_by is null)
  and exists (
    select 1 from public.expert_reports r
    where r.id = report_id and public.is_org_member(r.organization_id)
  )
);

drop policy if exists "expert_report_sections_update_member" on public.expert_report_sections;
create policy "expert_report_sections_update_member" on public.expert_report_sections
for update to authenticated using (
  exists (
    select 1 from public.expert_reports r
    where r.id = report_id and public.is_org_member(r.organization_id)
  )
) with check (
  exists (
    select 1 from public.expert_reports r
    where r.id = report_id and public.is_org_member(r.organization_id)
  )
);

drop policy if exists "expert_report_sections_delete_member" on public.expert_report_sections;
create policy "expert_report_sections_delete_member" on public.expert_report_sections
for delete to authenticated using (
  exists (
    select 1 from public.expert_reports r
    where r.id = report_id and public.is_org_member(r.organization_id)
  )
);

-- Quesitos, fontes e equipamentos.
drop policy if exists "expert_report_questions_select_member" on public.expert_report_questions;
create policy "expert_report_questions_select_member" on public.expert_report_questions
for select to authenticated using (
  exists (select 1 from public.expert_reports r where r.id = report_id and public.is_org_member(r.organization_id))
);

drop policy if exists "expert_report_questions_insert_member" on public.expert_report_questions;
create policy "expert_report_questions_insert_member" on public.expert_report_questions
for insert to authenticated with check (
  (created_by = auth.uid() or created_by is null)
  and exists (select 1 from public.expert_reports r where r.id = report_id and public.is_org_member(r.organization_id))
);

drop policy if exists "expert_report_questions_update_member" on public.expert_report_questions;
create policy "expert_report_questions_update_member" on public.expert_report_questions
for update to authenticated using (
  exists (select 1 from public.expert_reports r where r.id = report_id and public.is_org_member(r.organization_id))
) with check (
  exists (select 1 from public.expert_reports r where r.id = report_id and public.is_org_member(r.organization_id))
);

drop policy if exists "expert_report_questions_delete_member" on public.expert_report_questions;
create policy "expert_report_questions_delete_member" on public.expert_report_questions
for delete to authenticated using (
  exists (select 1 from public.expert_reports r where r.id = report_id and public.is_org_member(r.organization_id))
);

drop policy if exists "expert_report_sources_select_member" on public.expert_report_sources;
create policy "expert_report_sources_select_member" on public.expert_report_sources
for select to authenticated using (
  exists (select 1 from public.expert_reports r where r.id = report_id and public.is_org_member(r.organization_id))
);

drop policy if exists "expert_report_sources_insert_member" on public.expert_report_sources;
create policy "expert_report_sources_insert_member" on public.expert_report_sources
for insert to authenticated with check (
  (created_by = auth.uid() or created_by is null)
  and exists (select 1 from public.expert_reports r where r.id = report_id and public.is_org_member(r.organization_id))
);

drop policy if exists "expert_report_sources_update_member" on public.expert_report_sources;
create policy "expert_report_sources_update_member" on public.expert_report_sources
for update to authenticated using (
  exists (select 1 from public.expert_reports r where r.id = report_id and public.is_org_member(r.organization_id))
) with check (
  exists (select 1 from public.expert_reports r where r.id = report_id and public.is_org_member(r.organization_id))
);

drop policy if exists "expert_report_sources_delete_member" on public.expert_report_sources;
create policy "expert_report_sources_delete_member" on public.expert_report_sources
for delete to authenticated using (
  exists (select 1 from public.expert_reports r where r.id = report_id and public.is_org_member(r.organization_id))
);

drop policy if exists "expert_report_equipment_select_member" on public.expert_report_equipment;
create policy "expert_report_equipment_select_member" on public.expert_report_equipment
for select to authenticated using (
  exists (select 1 from public.expert_reports r where r.id = report_id and public.is_org_member(r.organization_id))
);

drop policy if exists "expert_report_equipment_insert_member" on public.expert_report_equipment;
create policy "expert_report_equipment_insert_member" on public.expert_report_equipment
for insert to authenticated with check (
  (created_by = auth.uid() or created_by is null)
  and exists (select 1 from public.expert_reports r where r.id = report_id and public.is_org_member(r.organization_id))
);

drop policy if exists "expert_report_equipment_update_member" on public.expert_report_equipment;
create policy "expert_report_equipment_update_member" on public.expert_report_equipment
for update to authenticated using (
  exists (select 1 from public.expert_reports r where r.id = report_id and public.is_org_member(r.organization_id))
) with check (
  exists (select 1 from public.expert_reports r where r.id = report_id and public.is_org_member(r.organization_id))
);

drop policy if exists "expert_report_equipment_delete_member" on public.expert_report_equipment;
create policy "expert_report_equipment_delete_member" on public.expert_report_equipment
for delete to authenticated using (
  exists (select 1 from public.expert_reports r where r.id = report_id and public.is_org_member(r.organization_id))
);

-- Anexos.
drop policy if exists "expert_report_attachments_select_member" on public.expert_report_attachments;
create policy "expert_report_attachments_select_member" on public.expert_report_attachments
for select to authenticated using (public.is_org_member(organization_id));

drop policy if exists "expert_report_attachments_insert_member" on public.expert_report_attachments;
create policy "expert_report_attachments_insert_member" on public.expert_report_attachments
for insert to authenticated with check (
  public.is_org_member(organization_id)
  and created_by = auth.uid()
  and exists (
    select 1 from public.expert_reports r
    where r.id = report_id and r.organization_id = organization_id
  )
  and (
    section_id is null
    or exists (
      select 1 from public.expert_report_sections s
      where s.id = section_id and s.report_id = report_id
    )
  )
);

drop policy if exists "expert_report_attachments_update_member" on public.expert_report_attachments;
create policy "expert_report_attachments_update_member" on public.expert_report_attachments
for update to authenticated using (public.is_org_member(organization_id))
with check (public.is_org_member(organization_id));

drop policy if exists "expert_report_attachments_delete_member" on public.expert_report_attachments;
create policy "expert_report_attachments_delete_member" on public.expert_report_attachments
for delete to authenticated using (public.is_org_member(organization_id));

-- Versões.
drop policy if exists "expert_report_versions_select_member" on public.expert_report_versions;
create policy "expert_report_versions_select_member" on public.expert_report_versions
for select to authenticated using (
  exists (select 1 from public.expert_reports r where r.id = report_id and public.is_org_member(r.organization_id))
);

drop policy if exists "expert_report_versions_insert_member" on public.expert_report_versions;
create policy "expert_report_versions_insert_member" on public.expert_report_versions
for insert to authenticated with check (
  (created_by = auth.uid() or created_by is null)
  and exists (select 1 from public.expert_reports r where r.id = report_id and public.is_org_member(r.organization_id))
);

-- =========================================================
-- 5. MODELOS-PILOTO OCTA
-- =========================================================

insert into public.report_types as rt_target (
  organization_id, slug, name, specialty, description,
  is_octa_model, status, version, source_label, created_by
) values (
  null,
  'laudo_ambiental',
  'Laudo Técnico Pericial Ambiental',
  'Engenharia Ambiental',
  'Estrutura modular para perícias ambientais com vistoria, georreferenciamento, análise documental, imagens, APP, quesitos e conclusão técnica.',
  true,
  'active',
  1,
  'Biblioteca Técnica OCTA Perito — modelo-piloto ambiental',
  null
)
on conflict (slug) where organization_id is null do update set
  name = excluded.name,
  specialty = excluded.specialty,
  description = excluded.description,
  is_octa_model = true,
  status = 'active',
  version = greatest(rt_target.version, excluded.version),
  source_label = excluded.source_label;

insert into public.report_types as rt_target (
  organization_id, slug, name, specialty, description,
  is_octa_model, status, version, source_label, created_by
) values (
  null,
  'laudo_sst_previdenciario',
  'Laudo Técnico Pericial de Segurança do Trabalho — Previdenciário',
  'Engenharia de Segurança do Trabalho',
  'Estrutura modular para análise previdenciária de exposição ocupacional, PPP, agentes nocivos, eletricidade, ruído, EPI/EPC, quesitos e conclusão técnica.',
  true,
  'active',
  1,
  'Biblioteca Técnica OCTA Perito — modelo-piloto SST/previdenciário',
  null
)
on conflict (slug) where organization_id is null do update set
  name = excluded.name,
  specialty = excluded.specialty,
  description = excluded.description,
  is_octa_model = true,
  status = 'active',
  version = greatest(rt_target.version, excluded.version),
  source_label = excluded.source_label;

-- Seções do modelo ambiental.
with rt as (
  select id from public.report_types where slug = 'laudo_ambiental' and organization_id is null
), seed(section_key, title, description, content_kind, default_content, variables, warnings, sort_order, required, enabled, metadata) as (
  values
    ('identificacao', 'Identificação do processo', 'Juízo, processo, partes, perito e data.', 'rich_text',
      'PROCESSO Nº {{numero_processo}}\nJUÍZO: {{vara}} — {{comarca}}\nAUTOR(A): {{autor}}\nRÉU(RÉ): {{reu}}\nPERITO: {{nome_perito}} — {{registro_profissional}}',
      array['numero_processo','vara','comarca','autor','reu','nome_perito','registro_profissional']::text[],
      array['Confirmar a denominação exata do Juízo e das partes.']::text[], 10, true, true, '{}'::jsonb),
    ('objeto', 'Objeto da perícia', 'Delimitação objetiva da matéria técnica submetida ao perito.', 'rich_text',
      '{{objeto_pericia}}', array['objeto_pericia']::text[],
      array['Não ampliar o objeto além da decisão judicial e dos quesitos admitidos.']::text[], 20, true, true, '{}'::jsonb),
    ('dados_imovel', 'Dados do imóvel e da área examinada', 'Identificação, localização, uso e características relevantes.', 'rich_text',
      '{{identificacao_imovel}}\n\n{{localizacao_area}}\n\n{{uso_ocupacao}}',
      array['identificacao_imovel','localizacao_area','uso_ocupacao']::text[],
      array['Distinguir informações documentais de constatações de campo.']::text[], 30, false, true, '{}'::jsonb),
    ('documentos', 'Documentos e elementos analisados', 'Relação das fontes utilizadas na perícia.', 'sources', '', '{}'::text[],
      array['Registrar origem, data e pertinência de cada documento.']::text[], 40, true, true, '{}'::jsonb),
    ('diligencia', 'Diligência pericial', 'Data, local, participantes, condições de acesso e procedimentos.', 'rich_text',
      'A diligência foi realizada em {{data_diligencia}}, às {{horario_diligencia}}, no local {{local_diligencia}}.\n\nParticipantes: {{participantes_diligencia}}.\n\nProcedimentos executados: {{procedimentos_diligencia}}.',
      array['data_diligencia','horario_diligencia','local_diligencia','participantes_diligencia','procedimentos_diligencia']::text[],
      array['Não registrar como presente quem não acompanhou efetivamente a diligência.']::text[], 50, true, true, '{}'::jsonb),
    ('equipamentos', 'Equipamentos e recursos utilizados', 'Instrumentos, softwares, calibração e rastreabilidade.', 'equipment', '', '{}'::text[],
      array['Informar certificado e validade de calibração quando tecnicamente aplicável.']::text[], 60, false, true, '{}'::jsonb),
    ('metodologia', 'Metodologia', 'Métodos de campo, processamento e critérios técnicos.', 'rich_text',
      '{{metodologia_pericial}}', array['metodologia_pericial']::text[],
      array['Relacionar método, finalidade, precisão e limitações.']::text[], 70, true, true, '{}'::jsonb),
    ('vistoria_diagnostico', 'Vistoria e diagnóstico ambiental', 'Descrição técnica das condições observadas.', 'rich_text',
      '{{constatacoes_campo}}', array['constatacoes_campo']::text[],
      array['Separar fato observado, informação de terceiro e inferência técnica.']::text[], 80, true, true, '{}'::jsonb),
    ('analise_cartografica', 'Análise cartográfica e de imagens', 'Ortomosaico, SIG, imagens históricas e produtos cartográficos.', 'rich_text',
      '{{analise_cartografica}}', array['analise_cartografica']::text[],
      array['Indicar fonte, data, resolução, sistema de referência e limitações.']::text[], 90, false, true, '{}'::jsonb),
    ('analise_ambiental', 'Análise técnica ambiental', 'APP, cobertura vegetal, uso consolidado, degradação e recuperação.', 'rich_text',
      '{{analise_ambiental}}', array['analise_ambiental']::text[],
      array['Não converter automaticamente constatação técnica em conclusão jurídica.','Não inferir inexistência histórica de dano apenas pela condição atual.']::text[], 100, true, true, '{}'::jsonb),
    ('registro_fotografico', 'Registro fotográfico e cartográfico', 'Figuras, mapas, fotografias e legendas.', 'photos', '', '{}'::text[],
      array['Toda imagem deve possuir número, legenda, data, fonte e relação com a análise.']::text[], 110, false, true, '{}'::jsonb),
    ('quesitos', 'Respostas aos quesitos', 'Quesitos organizados por origem e respondidos individualmente.', 'questions', '', '{}'::text[],
      array['Não deixar quesito sem resposta; usar “prejudicado” ou “não aplicável” somente com justificativa.']::text[], 120, true, true, '{}'::jsonb),
    ('limitacoes', 'Limitações e ressalvas técnicas', 'Limitações temporais, documentais, instrumentais e de acesso.', 'rich_text',
      '{{limitacoes_pericia}}', array['limitacoes_pericia']::text[],
      array['Registrar limitações que possam afetar o alcance da conclusão.']::text[], 130, false, true, '{}'::jsonb),
    ('conclusao', 'Conclusão', 'Síntese objetiva das constatações e respostas técnicas.', 'conclusion',
      '{{conclusao_tecnica}}', array['conclusao_tecnica']::text[],
      array['A conclusão deve decorrer dos dados apresentados e permanecer dentro do objeto pericial.','Reservar ao Juízo as conclusões estritamente jurídicas.']::text[], 140, true, true, '{}'::jsonb),
    ('encerramento', 'Encerramento', 'Fecho, assinatura e referência aos anexos.', 'rich_text',
      'Nada mais havendo a acrescentar, encerra-se o presente Laudo Técnico Pericial.\n\n{{cidade_assinatura}}, {{data_assinatura}}.\n\n{{nome_perito}}\n{{qualificacao_profissional}}\n{{registro_profissional}}',
      array['cidade_assinatura','data_assinatura','nome_perito','qualificacao_profissional','registro_profissional']::text[],
      array['A quantidade de páginas deve ser calculada somente na exportação final.']::text[], 150, true, true, '{}'::jsonb),
    ('anexos', 'Anexos', 'Documentos, mapas, certificados, memoriais e arquivos complementares.', 'attachments', '', '{}'::text[],
      array['Conferir se todos os anexos citados no texto foram efetivamente incluídos.']::text[], 160, false, true, '{}'::jsonb)
)
insert into public.report_section_templates (
  report_type_id, section_key, title, description, content_kind, default_content,
  variables, review_warnings, sort_order, is_required, is_enabled_default, metadata, created_by
)
select rt.id, seed.section_key, seed.title, seed.description, seed.content_kind,
       replace(seed.default_content, E'\\n', E'\n'), seed.variables, seed.warnings, seed.sort_order,
       seed.required, seed.enabled, seed.metadata, null
from rt cross join seed
on conflict (report_type_id, section_key) do update set
  title = excluded.title,
  description = excluded.description,
  content_kind = excluded.content_kind,
  default_content = excluded.default_content,
  variables = excluded.variables,
  review_warnings = excluded.review_warnings,
  sort_order = excluded.sort_order,
  is_required = excluded.is_required,
  is_enabled_default = excluded.is_enabled_default,
  metadata = excluded.metadata;

-- Seções do modelo SST/previdenciário.
with rt as (
  select id from public.report_types where slug = 'laudo_sst_previdenciario' and organization_id is null
), seed(section_key, title, description, content_kind, default_content, variables, warnings, sort_order, required, enabled, metadata) as (
  values
    ('identificacao', 'Identificação do processo', 'Juízo, processo, partes, perito e data.', 'rich_text',
      'PROCESSO Nº {{numero_processo}}\nJUÍZO: {{vara}} — {{comarca}}\nAUTOR(A): {{autor}}\nRÉU(RÉ): {{reu}}\nPERITO: {{nome_perito}} — {{registro_profissional}}',
      array['numero_processo','vara','comarca','autor','reu','nome_perito','registro_profissional']::text[],
      array['Em matéria previdenciária, evitar a terminologia trabalhista “reclamante/reclamada” quando inadequada.']::text[], 10, true, true, '{}'::jsonb),
    ('objetivo', 'Objetivo e objeto da perícia', 'Delimitação da questão técnica previdenciária.', 'rich_text',
      '{{objeto_pericia}}', array['objeto_pericia']::text[],
      array['Distinguir reconhecimento de tempo especial de pedido de adicional trabalhista.']::text[], 20, true, true, '{}'::jsonb),
    ('sintese_demanda', 'Síntese da demanda', 'Resumo técnico da controvérsia e dos períodos questionados.', 'rich_text',
      '{{sintese_demanda}}', array['sintese_demanda']::text[],
      array['Não substituir a narrativa processual por conclusão antecipada.']::text[], 30, false, true, '{}'::jsonb),
    ('periodos_laborais', 'Períodos, funções e atividades', 'Empresas, vínculos, setores, cargos e tarefas.', 'rich_text',
      '{{periodos_funcoes_atividades}}', array['periodos_funcoes_atividades']::text[],
      array['Vincular cada constatação ao período e à respectiva fonte documental.']::text[], 40, true, true, '{}'::jsonb),
    ('documentos', 'Documentos e elementos analisados', 'PPP, LTCAT, laudos, fichas de EPI e demais fontes.', 'sources', '', '{}'::text[],
      array['Não presumir existência ou atualização de documento não juntado.']::text[], 50, true, true, '{}'::jsonb),
    ('diligencia', 'Diligência pericial', 'Data, locais, participantes e procedimentos.', 'rich_text',
      'A diligência foi realizada em {{data_diligencia}}, às {{horario_diligencia}}, nos locais {{locais_inspecionados}}.\n\nParticipantes: {{participantes_diligencia}}.\n\nProcedimentos: {{procedimentos_diligencia}}.',
      array['data_diligencia','horario_diligencia','locais_inspecionados','participantes_diligencia','procedimentos_diligencia']::text[],
      array['Explicitar quando a inspeção atual é utilizada para reconstrução retrospectiva.']::text[], 60, true, true, '{}'::jsonb),
    ('equipamentos', 'Equipamentos e rastreabilidade', 'Instrumentos, números de série, calibração e método.', 'equipment', '', '{}'::text[],
      array['Não afirmar medição válida sem identificação do instrumento e certificado aplicável.']::text[], 70, false, true, '{}'::jsonb),
    ('metodologia', 'Metodologia pericial', 'Critérios qualitativos, quantitativos e retrospectivos.', 'rich_text',
      '{{metodologia_pericial}}', array['metodologia_pericial']::text[],
      array['Informar norma, procedimento, duração, condição operacional e limitações da avaliação.']::text[], 80, true, true, '{}'::jsonb),
    ('agentes_nocivos', 'Análise dos agentes nocivos', 'Avaliação individualizada por agente, período e fonte.', 'rich_text',
      '{{analise_agentes_nocivos}}', array['analise_agentes_nocivos']::text[],
      array['Não transportar automaticamente uma medição atual para todo o período histórico sem justificativa técnica.']::text[], 90, true, true, '{}'::jsonb),
    ('ruido', 'Análise de ruído ocupacional', 'Níveis, dose, NEN, metodologia, limites e representatividade.', 'rich_text',
      '{{analise_ruido}}', array['analise_ruido']::text[],
      array['Não confundir nível pontual, dose e NEN.','Apresentar memória de cálculo ou indicar claramente a fonte do valor.']::text[], 100, false, true, '{}'::jsonb),
    ('eletricidade', 'Análise de eletricidade', 'Atividades, sistemas, tensões, frequência e risco.', 'rich_text',
      '{{analise_eletricidade}}', array['analise_eletricidade']::text[],
      array['Descrever as tarefas concretas e evitar conclusão baseada apenas no cargo.']::text[], 110, false, true, '{}'::jsonb),
    ('epi_epc', 'EPI, EPC e medidas de controle', 'Fornecimento, uso, treinamento, eficácia e registros.', 'rich_text',
      '{{analise_epi_epc}}', array['analise_epi_epc']::text[],
      array['Distinguir fornecimento, uso efetivo, adequação, validade e capacidade de neutralização.']::text[], 120, false, true, '{}'::jsonb),
    ('quesitos', 'Respostas aos quesitos', 'Quesitos do Juízo e das partes.', 'questions', '', '{}'::text[],
      array['Responder cada quesito com base técnica, fonte e ressalvas necessárias.']::text[], 130, true, true, '{}'::jsonb),
    ('limitacoes', 'Limitações e ressalvas técnicas', 'Restrições documentais, temporais e metodológicas.', 'rich_text',
      '{{limitacoes_pericia}}', array['limitacoes_pericia']::text[],
      array['Identificar períodos ou agentes que não puderam ser avaliados de forma conclusiva.']::text[], 140, false, true, '{}'::jsonb),
    ('conclusao', 'Conclusão', 'Conclusão por período, agente e critério técnico.', 'conclusion',
      '{{conclusao_tecnica}}', array['conclusao_tecnica']::text[],
      array['Não declarar direito ao benefício; limitar-se à conclusão técnica sobre exposição e enquadramento fático.','Não inserir percentual de adicional trabalhista quando o objeto for exclusivamente previdenciário.']::text[], 150, true, true, '{}'::jsonb),
    ('anexos', 'Anexos e referências', 'Relatórios, certificados, memoriais, fotografias e referências.', 'attachments', '', '{}'::text[],
      array['Conferir correspondência entre anexos citados e arquivos efetivamente incluídos.']::text[], 160, false, true, '{}'::jsonb),
    ('encerramento', 'Encerramento', 'Fecho e assinatura profissional.', 'rich_text',
      'Nada mais havendo a acrescentar, encerra-se o presente Laudo Técnico Pericial.\n\n{{cidade_assinatura}}, {{data_assinatura}}.\n\n{{nome_perito}}\n{{qualificacao_profissional}}\n{{registro_profissional}}',
      array['cidade_assinatura','data_assinatura','nome_perito','qualificacao_profissional','registro_profissional']::text[],
      array['Pedido de arbitramento ou levantamento de honorários deve, preferencialmente, constar em manifestação própria.']::text[], 170, true, true, '{}'::jsonb)
)
insert into public.report_section_templates (
  report_type_id, section_key, title, description, content_kind, default_content,
  variables, review_warnings, sort_order, is_required, is_enabled_default, metadata, created_by
)
select rt.id, seed.section_key, seed.title, seed.description, seed.content_kind,
       replace(seed.default_content, E'\\n', E'\n'), seed.variables, seed.warnings, seed.sort_order,
       seed.required, seed.enabled, seed.metadata, null
from rt cross join seed
on conflict (report_type_id, section_key) do update set
  title = excluded.title,
  description = excluded.description,
  content_kind = excluded.content_kind,
  default_content = excluded.default_content,
  variables = excluded.variables,
  review_warnings = excluded.review_warnings,
  sort_order = excluded.sort_order,
  is_required = excluded.is_required,
  is_enabled_default = excluded.is_enabled_default,
  metadata = excluded.metadata;

-- =========================================================
-- 6. BLOCOS TÉCNICOS INICIAIS
-- =========================================================

insert into public.technical_blocks as tb_target (
  organization_id, slug, title, specialty, category, description, content,
  variables, review_warnings, is_octa_model, status, version, source_label, created_by
) values
  (null, 'ambiental_gnss_rtk', 'Metodologia — levantamento GNSS RTK', 'Engenharia Ambiental', 'methodology',
   'Bloco para descrição de levantamento geodésico com correção em tempo real.',
   'O levantamento georreferenciado foi executado com receptor GNSS geodésico {{equipamento_gnss}}, utilizando correção {{tipo_correcao}} e referencial geodésico {{referencial_geodesico}}. Os dados foram processados e verificados quanto à consistência posicional, observadas as limitações inerentes às condições de campo e ao método empregado.',
   array['equipamento_gnss','tipo_correcao','referencial_geodesico']::text[],
   array['Informar precisão efetivamente obtida; não prometer precisão centimétrica sem evidência.']::text[], true, 'active', 1, 'OCTA Perito — bloco ambiental', null),
  (null, 'ambiental_drone', 'Metodologia — levantamento por drone', 'Engenharia Ambiental', 'methodology',
   'Bloco para levantamento aerofotogramétrico.',
   'Foi realizado levantamento por aeronave remotamente pilotada {{modelo_drone}}, destinado à obtenção de imagens aéreas e à produção de {{produtos_aerofotogrametricos}}. O voo ocorreu em {{data_voo}}, sob condições {{condicoes_voo}}, sendo os produtos processados em {{software_processamento}}.',
   array['modelo_drone','produtos_aerofotogrametricos','data_voo','condicoes_voo','software_processamento']::text[],
   array['Registrar altura, resolução/GSD, pontos de controle e limitações quando relevantes.']::text[], true, 'active', 1, 'OCTA Perito — bloco ambiental', null),
  (null, 'ambiental_sig', 'Metodologia — processamento em SIG', 'Engenharia Ambiental', 'methodology',
   'Bloco para análise espacial e produtos cartográficos.',
   'A análise espacial foi desenvolvida em ambiente de Sistema de Informação Geográfica, utilizando {{software_sig}} e o sistema de referência {{referencial_geodesico}}. Foram integrados dados de campo, imagens, vetores e documentos técnicos, mantendo-se registro das fontes e das etapas de processamento.',
   array['software_sig','referencial_geodesico']::text[],
   array['Conferir versão do software e sistema de coordenadas efetivamente utilizados.']::text[], true, 'active', 1, 'OCTA Perito — bloco ambiental', null),
  (null, 'ambiental_imagens_historicas', 'Análise temporal por imagens históricas', 'Engenharia Ambiental', 'analysis',
   'Bloco para análise multitemporal cautelosa.',
   'Foram analisadas imagens referentes às datas {{datas_imagens}}, provenientes de {{fontes_imagens}}. A interpretação considerou resolução, qualidade visual, sazonalidade e possíveis deslocamentos posicionais. As conclusões temporais foram limitadas aos elementos distinguíveis nas imagens e confrontadas com os demais documentos disponíveis.',
   array['datas_imagens','fontes_imagens']::text[],
   array['Não atribuir data exata a intervenção não claramente distinguível.']::text[], true, 'active', 1, 'OCTA Perito — bloco ambiental', null),
  (null, 'ambiental_app_lagoas', 'Análise técnica de APP no entorno de lagoas', 'Engenharia Ambiental', 'analysis',
   'Bloco para caracterização técnica de lagoas e respectivas faixas.',
   'A caracterização do corpo hídrico considerou sua origem {{origem_corpo_hidrico}}, superfície aproximada de {{area_lagoa}} e elementos observados em campo e em imagens. A definição da faixa ambiental aplicável deverá observar a classificação técnica confirmada, o nível máximo normal e a legislação vigente pertinente ao caso concreto.',
   array['origem_corpo_hidrico','area_lagoa']::text[],
   array['Não preencher automaticamente a faixa sem confirmar origem, área, localização e regime jurídico aplicável.']::text[], true, 'active', 1, 'OCTA Perito — bloco ambiental', null),
  (null, 'ambiental_area_consolidada', 'Análise de ocupação antrópica consolidada', 'Engenharia Ambiental', 'analysis',
   'Bloco para registro de evidências anteriores ao marco temporal.',
   'A análise dos elementos temporais identificou {{evidencias_ocupacao}} em período {{periodo_evidencias}}. Sob o enfoque técnico, tais elementos {{grau_compatibilidade}} com hipótese de ocupação antrópica preexistente ao marco temporal considerado, permanecendo o enquadramento jurídico definitivo sujeito à apreciação do Juízo.',
   array['evidencias_ocupacao','periodo_evidencias','grau_compatibilidade']::text[],
   array['Exigir imagem ou documento datado e descrever objetivamente a evidência.']::text[], true, 'active', 1, 'OCTA Perito — bloco ambiental', null),
  (null, 'ambiental_limitacao_temporal', 'Limitação temporal da vistoria', 'Engenharia Ambiental', 'limitation',
   'Ressalva sobre diferença entre condição atual e fatos pretéritos.',
   'As constatações de campo refletem as condições observadas na data da diligência. A reprodução de situações pretéritas depende de imagens históricas, documentos, registros e outros elementos técnicos contemporâneos aos fatos, não podendo ser inferida exclusivamente a partir da vistoria atual.',
   '{}'::text[], '{}'::text[], true, 'active', 1, 'OCTA Perito — bloco ambiental', null),
  (null, 'ambiental_ausencia_degradacao_ativa', 'Ausência de degradação ativa na vistoria', 'Engenharia Ambiental', 'analysis',
   'Bloco para constatação atual sem extrapolação histórica.',
   'Na data da vistoria, não foram observados indícios de degradação ambiental ativa caracterizados por {{indicadores_avaliados}}. Esta constatação restringe-se ao momento pericial e não afasta, por si só, a possibilidade de eventos pretéritos documentados nos autos.',
   array['indicadores_avaliados']::text[],
   array['Não converter ausência atual em inexistência histórica de dano.']::text[], true, 'active', 1, 'OCTA Perito — bloco ambiental', null),
  (null, 'sst_analise_ppp', 'Análise de PPP', 'Engenharia de Segurança do Trabalho', 'analysis',
   'Bloco para exame crítico do Perfil Profissiográfico Previdenciário.',
   'O PPP referente ao período {{periodo_laboral}} informa o cargo {{cargo}}, o setor {{setor}}, as atividades {{atividades_ppp}} e os agentes {{agentes_ppp}}. A consistência dessas informações foi confrontada com {{fontes_confronto}}, considerando a identificação dos responsáveis técnicos e a metodologia declarada.',
   array['periodo_laboral','cargo','setor','atividades_ppp','agentes_ppp','fontes_confronto']::text[],
   array['Não presumir validade material do PPP apenas por sua existência formal.']::text[], true, 'active', 1, 'OCTA Perito — bloco SST', null),
  (null, 'sst_ruido', 'Análise de ruído ocupacional', 'Engenharia de Segurança do Trabalho', 'analysis',
   'Bloco para avaliação quantitativa de ruído.',
   'A avaliação de ruído considerou {{metodologia_ruido}}, com instrumento {{instrumento_ruido}}, período de medição {{duracao_medicao}} e condições operacionais {{condicoes_operacionais}}. O resultado apurado foi {{resultado_ruido}}, devendo sua comparação observar o critério e o limite aplicáveis ao período analisado.',
   array['metodologia_ruido','instrumento_ruido','duracao_medicao','condicoes_operacionais','resultado_ruido']::text[],
   array['Apresentar dose, NEN ou nível equivalente conforme o método efetivamente adotado.','Conferir certificado de calibração.']::text[], true, 'active', 1, 'OCTA Perito — bloco SST', null),
  (null, 'sst_eletricidade', 'Análise de exposição à eletricidade', 'Engenharia de Segurança do Trabalho', 'analysis',
   'Bloco para análise qualitativa de atividades com energia elétrica.',
   'As atividades examinadas compreendiam {{atividades_eletricidade}}, executadas em {{instalacoes_eletricas}}, com tensões informadas de {{tensoes}}. A frequência, a forma de intervenção, a possibilidade de energização e as medidas de controle foram avaliadas a partir de {{fontes_eletricidade}}.',
   array['atividades_eletricidade','instalacoes_eletricas','tensoes','fontes_eletricidade']::text[],
   array['Não concluir apenas pelo cargo; descrever tarefas, instalações e condições reais.']::text[], true, 'active', 1, 'OCTA Perito — bloco SST', null),
  (null, 'sst_epi_epc', 'Análise de EPI e EPC', 'Engenharia de Segurança do Trabalho', 'analysis',
   'Bloco para avaliação de medidas de controle.',
   'Foram identificadas as seguintes medidas de controle: {{epc_identificados}} e {{epi_identificados}}. A análise de eficácia considerou adequação ao risco, certificado aplicável, entrega, treinamento, periodicidade de substituição, conservação, uso efetivo e capacidade técnica de redução ou neutralização.',
   array['epc_identificados','epi_identificados']::text[],
   array['Não equiparar fornecimento formal a uso eficaz.']::text[], true, 'active', 1, 'OCTA Perito — bloco SST', null),
  (null, 'sst_habitualidade_permanencia', 'Habitualidade e permanência', 'Engenharia de Segurança do Trabalho', 'analysis',
   'Bloco para caracterização da frequência de exposição.',
   'A exposição ao agente {{agente_nocivo}} ocorria durante {{descricao_frequencia}}, nas atividades {{atividades_expostas}}. A análise de habitualidade e permanência foi realizada em relação à rotina efetiva e à indissociabilidade da exposição das tarefas, sem se limitar à presença contínua durante todos os minutos da jornada.',
   array['agente_nocivo','descricao_frequencia','atividades_expostas']::text[],
   array['Fundamentar a frequência com documentos, entrevistas e observações verificáveis.']::text[], true, 'active', 1, 'OCTA Perito — bloco SST', null),
  (null, 'sst_limitacao_reconstrucao', 'Limitação da reconstrução retrospectiva', 'Engenharia de Segurança do Trabalho', 'limitation',
   'Ressalva para perícia realizada após os vínculos.',
   'A avaliação foi realizada em momento posterior ao período laboral discutido. A reconstrução das condições pretéritas baseou-se nos documentos contemporâneos disponíveis, nas características técnicas dos processos, nas informações verificáveis e na inspeção atual, observadas as mudanças de layout, equipamentos, produção e medidas de controle eventualmente ocorridas.',
   '{}'::text[], '{}'::text[], true, 'active', 1, 'OCTA Perito — bloco SST', null)
on conflict (slug) where organization_id is null do update set
  title = excluded.title,
  specialty = excluded.specialty,
  category = excluded.category,
  description = excluded.description,
  content = excluded.content,
  variables = excluded.variables,
  review_warnings = excluded.review_warnings,
  is_octa_model = true,
  status = 'active',
  version = greatest(tb_target.version, excluded.version),
  source_label = excluded.source_label;

-- =========================================================
-- 7. COMENTÁRIOS DE ESQUEMA
-- =========================================================

comment on table public.report_types is 'Tipos de laudo OCTA ou personalizados por organização.';
comment on table public.report_section_templates is 'Estrutura padrão de capítulos de cada tipo de laudo.';
comment on table public.technical_blocks is 'Blocos técnicos reutilizáveis com variáveis e alertas de revisão.';
comment on table public.expert_reports is 'Laudos vinculados a processos judiciais.';
comment on table public.expert_report_sections is 'Capítulos editáveis, ordenáveis e ativáveis de cada laudo.';
comment on table public.expert_report_questions is 'Quesitos e respostas organizados por origem.';
comment on table public.expert_report_sources is 'Documentos, inspeções, medições e demais fontes analisadas.';
comment on table public.expert_report_equipment is 'Equipamentos, calibração e rastreabilidade utilizados na perícia.';
comment on table public.expert_report_attachments is 'Metadados de fotos, mapas, certificados e demais anexos do laudo.';
comment on table public.expert_report_versions is 'Snapshots completos e imutáveis das versões do laudo.';
