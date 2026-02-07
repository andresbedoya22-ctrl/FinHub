# A1: Apply Case Engine v1 migration in Supabase (manual)

This runbook applies the A1 Case Engine v1 migration without the Supabase CLI.

## Steps
1) Open Supabase Dashboard for the target project.
2) Navigate to SQL Editor.
3) Create a new query.
4) Paste the full SQL block below.
5) Run the query once and wait for success.
6) Run the validation queries in the section below.

Note: If anything fails, DO NOT re-run the full block blindly. Inspect the error, fix with a small incremental SQL change (A1.1), and re-run only the needed statements.

## Migration SQL (copy/paste as a single block)

```sql
-- case_engine_v1

-- 1) cases: add product_slug, normalize types/steps, and update constraints
alter table if exists public.cases
  add column if not exists product_slug text null;

-- Map legacy types to canonical + product_slug
update public.cases
set
  product_slug = case
    when type = 'toeslag_huur' then 'huurtoeslag'
    when type = 'toeslag_zorg' then 'zorgtoeslag'
    when type = 'toeslag_kinderopvang' then 'kinderopvangtoeslag'
    when type = 'toeslag_kgb' then 'kgb'
    when type = 'subsidy.huurtoeslag' then 'huurtoeslag'
    when type = 'subsidy.zorgtoeslag' then 'zorgtoeslag'
    when type = 'subsidy.kgb' then 'kgb'
    when type = 'subsidy.kot' then 'kot'
    when type = 'tax_ib' then 'ib'
    when type = 'tax_voorlopige_aanslag' then 'voorlopige_aanslag'
    else coalesce(product_slug, type)
  end,
  type = case
    when type like 'toeslag_%' then 'toeslagen'
    when type like 'subsidy.%' then 'toeslagen'
    when type like 'tax_%' then 'taxes'
    when type in ('finances_intake','document_review') then 'credit'
    when type in ('toeslagen','taxes','mortgage','credit','insurance') then type
    else 'credit'
  end
where type is not null;

-- Normalize legacy step keys to generic set
update public.cases
set step_key = case
  when step_key = 'start' then 'intake'
  when step_key = 'submission' then 'submitted'
  when step_key = 'subsidy_eligibility' then 'eligibility'
  when step_key = 'subsidy_result' then 'result'
  when step_key = 'subsidy_checkout' then 'checkout'
  when step_key = 'subsidy_authorization' then 'authorization'
  when step_key = 'subsidy_documents' then 'documents'
  when step_key = 'subsidy_review' then 'review'
  when step_key = 'subsidy_done' then 'done'
  else step_key
end
where step_key is not null;

alter table if exists public.cases
  drop constraint if exists cases_type_check;

alter table if exists public.cases
  add constraint cases_type_check
  check (type in ('toeslagen','taxes','mortgage','credit','insurance'));

alter table if exists public.cases
  drop constraint if exists cases_step_key_check;

alter table if exists public.cases
  add constraint cases_step_key_check
  check (step_key in (
    'intake','eligibility','result','checkout','authorization','documents','review','submitted','done'
  ));

create index if not exists idx_cases_type on public.cases(type);
create index if not exists idx_cases_product_slug on public.cases(product_slug);

-- 2) case_step_data: align step_key constraint to generic set
update public.case_step_data
set step_key = case
  when step_key = 'start' then 'intake'
  when step_key = 'submission' then 'submitted'
  when step_key = 'subsidy_eligibility' then 'eligibility'
  when step_key = 'subsidy_result' then 'result'
  when step_key = 'subsidy_checkout' then 'checkout'
  when step_key = 'subsidy_authorization' then 'authorization'
  when step_key = 'subsidy_documents' then 'documents'
  when step_key = 'subsidy_review' then 'review'
  when step_key = 'subsidy_done' then 'done'
  else step_key
end
where step_key is not null;

alter table if exists public.case_step_data
  drop constraint if exists case_step_data_step_key_check;

alter table if exists public.case_step_data
  add constraint case_step_data_step_key_check
  check (step_key in (
    'intake','eligibility','result','checkout','authorization','documents','review','submitted','done'
  ));

-- 3) case_tasks
create table if not exists public.case_tasks (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  title text not null,
  status text not null default 'open' check (status in ('open','in_progress','done')),
  due_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_case_tasks_case on public.case_tasks(case_id);

-- 4) case_documents (source of truth for linking documents to cases)
create table if not exists public.case_documents (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','uploaded','reviewed','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_case_documents_unique unique (case_id, document_id)
);

create index if not exists idx_case_documents_case on public.case_documents(case_id);
create index if not exists idx_case_documents_document on public.case_documents(document_id);

-- 5) RLS for case_tasks and case_documents
alter table if exists public.case_tasks enable row level security;
alter table if exists public.case_documents enable row level security;

-- case_tasks owner policies
drop policy if exists case_tasks_select_own on public.case_tasks;
create policy case_tasks_select_own on public.case_tasks
for select using (
  exists (
    select 1 from public.cases c
    where c.id = case_tasks.case_id
      and c.user_id = auth.uid()
  )
);

drop policy if exists case_tasks_insert_own on public.case_tasks;
create policy case_tasks_insert_own on public.case_tasks
for insert with check (
  exists (
    select 1 from public.cases c
    where c.id = case_tasks.case_id
      and c.user_id = auth.uid()
  )
);

drop policy if exists case_tasks_update_own on public.case_tasks;
create policy case_tasks_update_own on public.case_tasks
for update using (
  exists (
    select 1 from public.cases c
    where c.id = case_tasks.case_id
      and c.user_id = auth.uid()
  )
);

drop policy if exists case_tasks_delete_own on public.case_tasks;
create policy case_tasks_delete_own on public.case_tasks
for delete using (
  exists (
    select 1 from public.cases c
    where c.id = case_tasks.case_id
      and c.user_id = auth.uid()
  )
);

-- case_documents owner policies
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
);

drop policy if exists case_documents_update_own on public.case_documents;
create policy case_documents_update_own on public.case_documents
for update using (
  exists (
    select 1 from public.cases c
    where c.id = case_documents.case_id
      and c.user_id = auth.uid()
  )
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

-- admin read policies (align with existing pattern)
drop policy if exists case_tasks_admin_select_all on public.case_tasks;
create policy case_tasks_admin_select_all
on public.case_tasks
for select
to authenticated
using (public.is_admin());

drop policy if exists case_documents_admin_select_all on public.case_documents;
create policy case_documents_admin_select_all
on public.case_documents
for select
to authenticated
using (public.is_admin());

-- admin update policies

drop policy if exists case_tasks_admin_update on public.case_tasks;
create policy case_tasks_admin_update
on public.case_tasks
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists case_documents_admin_update on public.case_documents;
create policy case_documents_admin_update
on public.case_documents
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());
```

## Post-apply validation queries

```sql
select * from information_schema.columns where table_name='cases' and column_name='product_slug';
select to_regclass('public.case_tasks') as case_tasks_exists;
select to_regclass('public.case_documents') as case_documents_exists;
select schemaname, tablename, policyname from pg_policies where tablename in ('case_tasks','case_documents');
```
