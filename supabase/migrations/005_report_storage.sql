-- OCTA Perito v0.4 — armazenamento privado de anexos dos laudos
-- Estrutura: report-files/{organization_id}/{report_id}/{arquivo}

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'report-files',
  'report-files',
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

-- O primeiro segmento da chave deve corresponder a uma organização da qual o usuário participa.
drop policy if exists "report_files_select_member" on storage.objects;
create policy "report_files_select_member" on storage.objects
for select to authenticated using (
  bucket_id = 'report-files'
  and exists (
    select 1
    from public.organization_members om
    where om.user_id = auth.uid()
      and om.organization_id::text = (storage.foldername(name))[1]
  )
);

drop policy if exists "report_files_insert_member" on storage.objects;
create policy "report_files_insert_member" on storage.objects
for insert to authenticated with check (
  bucket_id = 'report-files'
  and owner_id = auth.uid()::text
  and exists (
    select 1
    from public.organization_members om
    where om.user_id = auth.uid()
      and om.organization_id::text = (storage.foldername(name))[1]
  )
);

drop policy if exists "report_files_update_member" on storage.objects;
create policy "report_files_update_member" on storage.objects
for update to authenticated using (
  bucket_id = 'report-files'
  and exists (
    select 1
    from public.organization_members om
    where om.user_id = auth.uid()
      and om.organization_id::text = (storage.foldername(name))[1]
  )
) with check (
  bucket_id = 'report-files'
  and exists (
    select 1
    from public.organization_members om
    where om.user_id = auth.uid()
      and om.organization_id::text = (storage.foldername(name))[1]
  )
);

drop policy if exists "report_files_delete_member" on storage.objects;
create policy "report_files_delete_member" on storage.objects
for delete to authenticated using (
  bucket_id = 'report-files'
  and exists (
    select 1
    from public.organization_members om
    where om.user_id = auth.uid()
      and om.organization_id::text = (storage.foldername(name))[1]
  )
);
