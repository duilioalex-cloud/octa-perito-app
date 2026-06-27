-- OCTA Perito v0.8.0 - gestao de usuarios e controle de acesso

-- Perfis e convites
alter table public.profiles add column if not exists email text;

update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id
  and (p.email is null or p.email <> u.email);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), new.email)
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(nullif(public.profiles.full_name, ''), excluded.full_name),
    updated_at = now();

  update public.organization_members
  set user_id = new.id,
      joined_at = coalesce(joined_at, now()),
      invitation_status = 'accepted'
  where user_id is null
    and lower(invited_email) = lower(new.email);

  return new;
end;
$$;

alter table public.organization_members add column if not exists id uuid default gen_random_uuid();
update public.organization_members set id = gen_random_uuid() where id is null;
alter table public.organization_members alter column id set not null;

alter table public.organization_members add column if not exists invited_email text;
alter table public.organization_members add column if not exists invited_name text;
alter table public.organization_members add column if not exists invitation_status text not null default 'accepted';
alter table public.organization_members add column if not exists invited_at timestamptz;
alter table public.organization_members add column if not exists joined_at timestamptz;
alter table public.organization_members add column if not exists last_seen_at timestamptz;

update public.organization_members
set joined_at = coalesce(joined_at, created_at),
    invitation_status = case when user_id is null then invitation_status else 'accepted' end;

alter table public.organization_members drop constraint if exists organization_members_pkey;
alter table public.organization_members add constraint organization_members_pkey primary key (id);
alter table public.organization_members alter column user_id drop not null;

drop index if exists organization_members_user_idx;
create index if not exists organization_members_user_idx on public.organization_members (user_id) where user_id is not null;
create unique index if not exists organization_members_org_user_unique
  on public.organization_members (organization_id, user_id)
  where user_id is not null;
create unique index if not exists organization_members_org_invited_email_unique
  on public.organization_members (organization_id, lower(invited_email))
  where user_id is null and invited_email is not null;

alter table public.organization_members drop constraint if exists organization_members_role_check;
alter table public.organization_members add constraint organization_members_role_check
  check (role in ('owner','admin','expert','financial','assistant','viewer'));

alter table public.organization_members drop constraint if exists organization_members_invitation_status_check;
alter table public.organization_members add constraint organization_members_invitation_status_check
  check (invitation_status in ('pending','sent','accepted','revoked'));

-- Helpers RBAC
create or replace function public.current_user_org_role(target_org uuid)
returns text language sql stable security definer set search_path = public as $$
  select om.role
  from public.organization_members om
  where om.organization_id = target_org
    and om.user_id = auth.uid()
  order by om.created_at asc
  limit 1;
$$;

create or replace function public.is_org_member(target_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.organization_members
    where organization_id = target_org
      and user_id = auth.uid()
  );
$$;

create or replace function public.has_org_role(target_org uuid, allowed_roles text[])
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.current_user_org_role(target_org) = any(allowed_roles), false);
$$;

create or replace function public.is_org_admin(target_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_org_role(target_org, array['owner','admin']);
$$;

create or replace function public.can_manage_users(target_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_org_role(target_org, array['owner','admin']);
$$;

create or replace function public.can_view_finance(target_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_org_role(target_org, array['owner','admin','expert','financial']);
$$;

create or replace function public.can_write_finance(target_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_org_role(target_org, array['owner','admin','expert','financial']);
$$;

create or replace function public.can_delete_finance(target_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_org_role(target_org, array['owner','admin']);
$$;

create or replace function public.can_write_processes(target_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_org_role(target_org, array['owner','admin','expert']);
$$;

create or replace function public.can_write_operational(target_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_org_role(target_org, array['owner','admin','expert','assistant']);
$$;

create or replace function public.can_write_templates(target_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_org_role(target_org, array['owner','admin','expert']);
$$;

create or replace function public.mark_current_member_joined()
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.organization_members
  set invitation_status = 'accepted',
      joined_at = coalesce(joined_at, now()),
      last_seen_at = now()
  where user_id = auth.uid();
end;
$$;

grant execute on function public.current_user_org_role(uuid) to authenticated;
grant execute on function public.has_org_role(uuid, text[]) to authenticated;
grant execute on function public.can_manage_users(uuid) to authenticated;
grant execute on function public.can_view_finance(uuid) to authenticated;
grant execute on function public.can_write_finance(uuid) to authenticated;
grant execute on function public.can_delete_finance(uuid) to authenticated;
grant execute on function public.can_write_processes(uuid) to authenticated;
grant execute on function public.can_write_operational(uuid) to authenticated;
grant execute on function public.can_write_templates(uuid) to authenticated;
grant execute on function public.mark_current_member_joined() to authenticated;

-- Politicas de membros
drop policy if exists "members_select_same_org" on public.organization_members;
create policy "members_select_same_org" on public.organization_members
for select to authenticated using (
  user_id = auth.uid()
  or public.is_org_member(organization_id)
);

drop policy if exists "members_insert_owner" on public.organization_members;
create policy "members_insert_owner" on public.organization_members
for insert to authenticated with check (
  (
    role = 'owner'
    and user_id = auth.uid()
    and exists (select 1 from public.organizations o where o.id = organization_id and o.owner_id = auth.uid())
  )
  or (
    role <> 'owner'
    and public.can_manage_users(organization_id)
  )
);

drop policy if exists "members_update_admin" on public.organization_members;
create policy "members_update_admin" on public.organization_members
for update to authenticated using (
  public.can_manage_users(organization_id)
  and role <> 'owner'
) with check (
  public.can_manage_users(organization_id)
  and role <> 'owner'
);

drop policy if exists "members_delete_admin" on public.organization_members;
create policy "members_delete_admin" on public.organization_members
for delete to authenticated using (
  public.can_manage_users(organization_id)
  and role <> 'owner'
);

drop policy if exists "profiles_select_same_org" on public.profiles;
create policy "profiles_select_same_org" on public.profiles
for select to authenticated using (
  id = auth.uid()
  or exists (
    select 1
    from public.organization_members mine
    join public.organization_members target on target.organization_id = mine.organization_id
    where mine.user_id = auth.uid()
      and target.user_id = profiles.id
  )
);

-- RLS operacional
drop policy if exists "processes_insert_member" on public.processes;
create policy "processes_insert_writer" on public.processes
for insert to authenticated with check (public.can_write_processes(organization_id) and created_by = auth.uid());

drop policy if exists "processes_update_member" on public.processes;
create policy "processes_update_writer" on public.processes
for update to authenticated using (public.can_write_processes(organization_id))
with check (public.can_write_processes(organization_id));

drop policy if exists "processes_delete_admin" on public.processes;
create policy "processes_delete_admin" on public.processes
for delete to authenticated using (public.is_org_admin(organization_id));

drop policy if exists "templates_insert_member" on public.templates;
create policy "templates_insert_writer" on public.templates
for insert to authenticated with check (
  organization_id is not null
  and public.can_write_templates(organization_id)
  and created_by = auth.uid()
);

drop policy if exists "templates_update_member" on public.templates;
create policy "templates_update_writer" on public.templates
for update to authenticated using (
  organization_id is not null
  and public.can_write_templates(organization_id)
  and is_octa_model = false
) with check (
  organization_id is not null
  and public.can_write_templates(organization_id)
  and is_octa_model = false
);

drop policy if exists "templates_delete_admin" on public.templates;
create policy "templates_delete_admin" on public.templates
for delete to authenticated using (
  organization_id is not null
  and public.is_org_admin(organization_id)
  and is_octa_model = false
);

drop policy if exists "deadlines_insert_member" on public.process_deadlines;
create policy "deadlines_insert_writer" on public.process_deadlines
for insert to authenticated with check (public.can_write_operational(organization_id) and created_by = auth.uid());

drop policy if exists "deadlines_update_member" on public.process_deadlines;
create policy "deadlines_update_writer" on public.process_deadlines
for update to authenticated using (public.can_write_operational(organization_id))
with check (public.can_write_operational(organization_id));

drop policy if exists "deadlines_delete_admin" on public.process_deadlines;
create policy "deadlines_delete_admin" on public.process_deadlines
for delete to authenticated using (public.is_org_admin(organization_id));

drop policy if exists "documents_insert_member" on public.generated_documents;
create policy "documents_insert_writer" on public.generated_documents
for insert to authenticated with check (public.can_write_operational(organization_id) and created_by = auth.uid());

drop policy if exists "documents_update_member" on public.generated_documents;
create policy "documents_update_writer" on public.generated_documents
for update to authenticated using (public.can_write_operational(organization_id))
with check (public.can_write_operational(organization_id));

drop policy if exists "documents_delete_admin" on public.generated_documents;
create policy "documents_delete_admin" on public.generated_documents
for delete to authenticated using (public.is_org_admin(organization_id));

drop policy if exists "expert_reports_insert_member" on public.expert_reports;
create policy "expert_reports_insert_writer" on public.expert_reports
for insert to authenticated with check (public.can_write_operational(organization_id) and created_by = auth.uid());

drop policy if exists "expert_reports_update_member" on public.expert_reports;
create policy "expert_reports_update_writer" on public.expert_reports
for update to authenticated using (public.can_write_operational(organization_id))
with check (public.can_write_operational(organization_id));

drop policy if exists "expert_reports_delete_admin" on public.expert_reports;
create policy "expert_reports_delete_admin" on public.expert_reports
for delete to authenticated using (public.is_org_admin(organization_id));

drop policy if exists "calendar_events_insert_member" on public.calendar_events;
create policy "calendar_events_insert_writer" on public.calendar_events
for insert to authenticated with check (public.can_write_operational(organization_id) and created_by = auth.uid());

drop policy if exists "calendar_events_update_member" on public.calendar_events;
create policy "calendar_events_update_writer" on public.calendar_events
for update to authenticated using (public.can_write_operational(organization_id))
with check (public.can_write_operational(organization_id));

drop policy if exists "calendar_events_delete_admin" on public.calendar_events;
create policy "calendar_events_delete_admin" on public.calendar_events
for delete to authenticated using (public.is_org_admin(organization_id));

drop policy if exists "event_participants_insert_member" on public.event_participants;
create policy "event_participants_insert_writer" on public.event_participants
for insert to authenticated with check (
  exists (
    select 1 from public.calendar_events ce
    where ce.id = event_id
      and public.can_write_operational(ce.organization_id)
  )
);

drop policy if exists "event_participants_update_member" on public.event_participants;
create policy "event_participants_update_writer" on public.event_participants
for update to authenticated using (
  exists (
    select 1 from public.calendar_events ce
    where ce.id = event_id
      and public.can_write_operational(ce.organization_id)
  )
) with check (
  exists (
    select 1 from public.calendar_events ce
    where ce.id = event_id
      and public.can_write_operational(ce.organization_id)
  )
);

drop policy if exists "event_participants_delete_admin" on public.event_participants;
create policy "event_participants_delete_admin" on public.event_participants
for delete to authenticated using (
  exists (
    select 1 from public.calendar_events ce
    where ce.id = event_id
      and public.is_org_admin(ce.organization_id)
  )
);

-- RLS financeiro: proprietario, administrador, perito e financeiro visualizam/lancam.
-- Assistente tecnico e consulta ficam bloqueados no banco.
drop policy if exists "process_fees_select_member" on public.process_fees;
create policy "process_fees_select_finance" on public.process_fees
for select to authenticated using (public.can_view_finance(organization_id));

drop policy if exists "process_fees_insert_member" on public.process_fees;
create policy "process_fees_insert_finance" on public.process_fees
for insert to authenticated with check (public.can_write_finance(organization_id) and created_by = auth.uid());

drop policy if exists "process_fees_update_member" on public.process_fees;
create policy "process_fees_update_finance" on public.process_fees
for update to authenticated using (public.can_write_finance(organization_id))
with check (public.can_write_finance(organization_id));

drop policy if exists "process_fees_delete_admin" on public.process_fees;
create policy "process_fees_delete_admin" on public.process_fees
for delete to authenticated using (public.can_delete_finance(organization_id));

drop policy if exists "fee_transactions_select_member" on public.fee_transactions;
create policy "fee_transactions_select_finance" on public.fee_transactions
for select to authenticated using (public.can_view_finance(organization_id));

drop policy if exists "fee_transactions_insert_member" on public.fee_transactions;
create policy "fee_transactions_insert_finance" on public.fee_transactions
for insert to authenticated with check (public.can_write_finance(organization_id) and created_by = auth.uid());

drop policy if exists "fee_transactions_update_member" on public.fee_transactions;
create policy "fee_transactions_update_finance" on public.fee_transactions
for update to authenticated using (public.can_write_finance(organization_id))
with check (public.can_write_finance(organization_id));

drop policy if exists "fee_transactions_delete_admin" on public.fee_transactions;
create policy "fee_transactions_delete_admin" on public.fee_transactions
for delete to authenticated using (public.can_delete_finance(organization_id));

drop policy if exists "process_trips_select_member" on public.process_trips;
create policy "process_trips_select_finance" on public.process_trips
for select to authenticated using (public.can_view_finance(organization_id));

drop policy if exists "process_trips_insert_member" on public.process_trips;
create policy "process_trips_insert_finance" on public.process_trips
for insert to authenticated with check (public.can_write_finance(organization_id) and created_by = auth.uid());

drop policy if exists "process_trips_update_member" on public.process_trips;
create policy "process_trips_update_finance" on public.process_trips
for update to authenticated using (public.can_write_finance(organization_id))
with check (public.can_write_finance(organization_id));

drop policy if exists "process_trips_delete_admin" on public.process_trips;
create policy "process_trips_delete_admin" on public.process_trips
for delete to authenticated using (public.can_delete_finance(organization_id));

drop policy if exists "process_expenses_select_member" on public.process_expenses;
create policy "process_expenses_select_finance" on public.process_expenses
for select to authenticated using (public.can_view_finance(organization_id));

drop policy if exists "process_expenses_insert_member" on public.process_expenses;
create policy "process_expenses_insert_finance" on public.process_expenses
for insert to authenticated with check (public.can_write_finance(organization_id) and created_by = auth.uid());

drop policy if exists "process_expenses_update_member" on public.process_expenses;
create policy "process_expenses_update_finance" on public.process_expenses
for update to authenticated using (public.can_write_finance(organization_id))
with check (public.can_write_finance(organization_id));

drop policy if exists "process_expenses_delete_admin" on public.process_expenses;
create policy "process_expenses_delete_admin" on public.process_expenses
for delete to authenticated using (public.can_delete_finance(organization_id));

drop policy if exists "financial_documents_select_member" on public.financial_documents;
create policy "financial_documents_select_finance" on public.financial_documents
for select to authenticated using (public.can_view_finance(organization_id));

drop policy if exists "financial_documents_insert_member" on public.financial_documents;
create policy "financial_documents_insert_finance" on public.financial_documents
for insert to authenticated with check (public.can_write_finance(organization_id) and created_by = auth.uid());

drop policy if exists "financial_documents_update_member" on public.financial_documents;
create policy "financial_documents_update_finance" on public.financial_documents
for update to authenticated using (public.can_write_finance(organization_id))
with check (public.can_write_finance(organization_id));

drop policy if exists "financial_documents_delete_admin" on public.financial_documents;
create policy "financial_documents_delete_admin" on public.financial_documents
for delete to authenticated using (public.can_delete_finance(organization_id));

drop policy if exists "financial_attachments_select_member" on public.financial_attachments;
create policy "financial_attachments_select_finance" on public.financial_attachments
for select to authenticated using (public.can_view_finance(organization_id));

drop policy if exists "financial_attachments_insert_member" on public.financial_attachments;
create policy "financial_attachments_insert_finance" on public.financial_attachments
for insert to authenticated with check (public.can_write_finance(organization_id) and created_by = auth.uid());

drop policy if exists "financial_attachments_update_member" on public.financial_attachments;
create policy "financial_attachments_update_finance" on public.financial_attachments
for update to authenticated using (public.can_write_finance(organization_id))
with check (public.can_write_finance(organization_id));

drop policy if exists "financial_attachments_delete_admin" on public.financial_attachments;
create policy "financial_attachments_delete_admin" on public.financial_attachments
for delete to authenticated using (public.can_delete_finance(organization_id));

-- Storage financeiro
drop policy if exists "financial_files_select_member" on storage.objects;
create policy "financial_files_select_finance" on storage.objects
for select to authenticated using (
  bucket_id = 'financial-files'
  and public.can_view_finance(((storage.foldername(name))[1])::uuid)
);

drop policy if exists "financial_files_insert_member" on storage.objects;
create policy "financial_files_insert_finance" on storage.objects
for insert to authenticated with check (
  bucket_id = 'financial-files'
  and owner_id = auth.uid()::text
  and public.can_write_finance(((storage.foldername(name))[1])::uuid)
);

drop policy if exists "financial_files_update_member" on storage.objects;
create policy "financial_files_update_finance" on storage.objects
for update to authenticated using (
  bucket_id = 'financial-files'
  and public.can_write_finance(((storage.foldername(name))[1])::uuid)
) with check (
  bucket_id = 'financial-files'
  and public.can_write_finance(((storage.foldername(name))[1])::uuid)
);

drop policy if exists "financial_files_delete_member" on storage.objects;
create policy "financial_files_delete_admin" on storage.objects
for delete to authenticated using (
  bucket_id = 'financial-files'
  and public.can_delete_finance(((storage.foldername(name))[1])::uuid)
);
