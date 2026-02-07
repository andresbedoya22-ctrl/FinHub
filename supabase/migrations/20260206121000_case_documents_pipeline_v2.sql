-- case_documents_pipeline_v2

alter table if exists public.case_documents
  add column if not exists validation_reason text null,
  add column if not exists validation_meta jsonb null,
  add column if not exists validated_at timestamptz null,
  add column if not exists rejected_at timestamptz null,
  add column if not exists synced_at timestamptz null;

update public.case_documents
set status = case
  when status = 'pending' then 'uploaded'
  when status = 'reviewed' then 'validated'
  else status
end
where status in ('pending','reviewed');

alter table if exists public.case_documents
  alter column status set default 'uploaded';

alter table if exists public.case_documents
  drop constraint if exists case_documents_status_check;

alter table if exists public.case_documents
  add constraint case_documents_status_check
  check (status in ('uploaded','validating','rejected','validated','synced'));

create index if not exists idx_case_documents_case_status on public.case_documents(case_id, status);
create index if not exists idx_case_documents_document on public.case_documents(document_id);

-- RLS: update policies for pipeline transitions
alter table if exists public.case_documents enable row level security;

drop policy if exists case_documents_select_own on public.case_documents;
create policy case_documents_select_own on public.case_documents
for select using (
  exists (
    select 1 from public.cases c
    where c.id = case_documents.case_id
      and c.user_id = auth.uid()
  )
);

drop policy if exists case_documents_insert_own on public.case_documents;
create policy case_documents_insert_own on public.case_documents
for insert with check (
  exists (
    select 1 from public.cases c
    where c.id = case_documents.case_id
      and c.user_id = auth.uid()
  )
  and exists (
    select 1 from public.documents d
    where d.id = case_documents.document_id
      and d.user_id = auth.uid()
  )
  and status in ('uploaded','validating','rejected','validated')
  and synced_at is null
);

drop policy if exists case_documents_update_own on public.case_documents;
create policy case_documents_update_own on public.case_documents
for update using (
  exists (
    select 1 from public.cases c
    where c.id = case_documents.case_id
      and c.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.cases c
    where c.id = case_documents.case_id
      and c.user_id = auth.uid()
  )
  and status in ('uploaded','validating','rejected','validated')
  and synced_at is null
);

drop policy if exists case_documents_delete_own on public.case_documents;
create policy case_documents_delete_own on public.case_documents
for delete using (
  exists (
    select 1 from public.cases c
    where c.id = case_documents.case_id
      and c.user_id = auth.uid()
  )
);

-- admin policies

drop policy if exists case_documents_admin_select_all on public.case_documents;
create policy case_documents_admin_select_all
on public.case_documents
for select
to authenticated
using (public.is_admin());

drop policy if exists case_documents_admin_update on public.case_documents;
create policy case_documents_admin_update
on public.case_documents
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());