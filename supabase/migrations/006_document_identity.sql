-- OCTA Perito v0.5 — identidade profissional e padrões de exportação
-- Migração idempotente. Não remove documentos, processos ou laudos existentes.

create extension if not exists pgcrypto;

create table if not exists public.organization_document_settings (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  office_name text,
  professional_name text,
  professional_titles text,
  council_registration text,
  contact_line text,
  city_state text,
  header_text text,
  footer_text text,
  primary_color text not null default '1F7A6D'
    check (primary_color ~ '^[0-9A-Fa-f]{6}$'),
  secondary_color text not null default '0B1C2D'
    check (secondary_color ~ '^[0-9A-Fa-f]{6}$'),
  show_cover boolean not null default true,
  show_table_of_contents boolean not null default true,
  show_page_numbers boolean not null default true,
  include_logo boolean not null default true,
  include_signature boolean not null default true,
  logo_bucket text,
  logo_path text,
  logo_name text,
  logo_mime_type text,
  signature_bucket text,
  signature_path text,
  signature_name text,
  signature_mime_type text,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.organization_document_settings enable row level security;

drop policy if exists "document_settings_select_member" on public.organization_document_settings;
create policy "document_settings_select_member" on public.organization_document_settings
for select to authenticated using (public.is_org_member(organization_id));

drop policy if exists "document_settings_insert_admin" on public.organization_document_settings;
create policy "document_settings_insert_admin" on public.organization_document_settings
for insert to authenticated with check (
  public.is_org_admin(organization_id)
  and updated_by = auth.uid()
);

drop policy if exists "document_settings_update_admin" on public.organization_document_settings;
create policy "document_settings_update_admin" on public.organization_document_settings
for update to authenticated using (public.is_org_admin(organization_id))
with check (public.is_org_admin(organization_id));

drop trigger if exists set_organization_document_settings_updated_at on public.organization_document_settings;
create trigger set_organization_document_settings_updated_at
before update on public.organization_document_settings
for each row execute function public.set_updated_at();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'branding-files',
  'branding-files',
  false,
  5242880,
  array['image/jpeg','image/png']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "branding_files_select_member" on storage.objects;
create policy "branding_files_select_member" on storage.objects
for select to authenticated using (
  bucket_id = 'branding-files'
  and exists (
    select 1 from public.organization_members om
    where om.user_id = auth.uid()
      and om.organization_id::text = (storage.foldername(name))[1]
  )
);

drop policy if exists "branding_files_insert_admin" on storage.objects;
create policy "branding_files_insert_admin" on storage.objects
for insert to authenticated with check (
  bucket_id = 'branding-files'
  and owner_id = auth.uid()::text
  and exists (
    select 1 from public.organization_members om
    where om.user_id = auth.uid()
      and om.role in ('owner','admin')
      and om.organization_id::text = (storage.foldername(name))[1]
  )
);

drop policy if exists "branding_files_update_admin" on storage.objects;
create policy "branding_files_update_admin" on storage.objects
for update to authenticated using (
  bucket_id = 'branding-files'
  and exists (
    select 1 from public.organization_members om
    where om.user_id = auth.uid()
      and om.role in ('owner','admin')
      and om.organization_id::text = (storage.foldername(name))[1]
  )
) with check (
  bucket_id = 'branding-files'
  and exists (
    select 1 from public.organization_members om
    where om.user_id = auth.uid()
      and om.role in ('owner','admin')
      and om.organization_id::text = (storage.foldername(name))[1]
  )
);

drop policy if exists "branding_files_delete_admin" on storage.objects;
create policy "branding_files_delete_admin" on storage.objects
for delete to authenticated using (
  bucket_id = 'branding-files'
  and exists (
    select 1 from public.organization_members om
    where om.user_id = auth.uid()
      and om.role in ('owner','admin')
      and om.organization_id::text = (storage.foldername(name))[1]
  )
);
