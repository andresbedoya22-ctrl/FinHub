# A2: Document Pipeline v2 (hardening)

This runbook describes required env vars, how to run tests, how to apply the DB migration manually, and a minimal smoke test using API routes.

## Required env vars

Set these in your shell or `.env.local`:

- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY

Optional (recommended for deterministic tests and local smoke):

- FINHUB_OCR_PROVIDER=mock
- FINHUB_OCR_MIN_CONFIDENCE=0.45
- FINHUB_DOC_MAX_BYTES=10485760

## Run tests (Vitest)

```bash
pnpm test -- --runTestsByPath src/__tests__/caseDocuments.pipeline.test.ts
```

If the required Supabase env vars are missing, the test will skip with a clear message.

## Manual DB apply (Supabase SQL Editor)

If Supabase CLI is not available or the project is not linked, apply this single SQL block in Supabase Dashboard  SQL Editor.

```sql
begin;

-- Ensure the storage bucket exists
insert into storage.buckets (id, name, public)
values ('vault', 'vault', false)
on conflict (id) do nothing;

-- A2: case_documents pipeline columns + constraints
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

-- RLS: documents (owner-only)
alter table if exists public.documents enable row level security;

drop policy if exists documents_select_own on public.documents;
create policy documents_select_own on public.documents
for select using (user_id = auth.uid());

drop policy if exists documents_insert_own on public.documents;
create policy documents_insert_own on public.documents
for insert with check (user_id = auth.uid());

drop policy if exists documents_update_own on public.documents;
create policy documents_update_own on public.documents
for update using (user_id = auth.uid());

drop policy if exists documents_delete_own on public.documents;
create policy documents_delete_own on public.documents
for delete using (user_id = auth.uid());

-- RLS: case_documents pipeline transitions
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

commit;
```

If anything fails, do NOT re-run the full block blindly. Inspect the error, create a small incremental fix (A2.1), and apply only the needed statements.

## A2.1 Fix: stack depth limit exceeded (RLS recursion)

If you hit `stack depth limit exceeded` on case_documents RLS checks, apply migration
`20260208123000_a2_1_fix_case_documents_rls_stack_depth.sql`. It introduces a
`SECURITY DEFINER` helper `public.case_owner_id()` and rewrites the case_documents
policies to use that helper instead of subqueries to `public.cases`, avoiding
recursive policy evaluation.

## A2 DB applied proof

Validation queries:

```sql
select to_regclass('public.case_documents') as case_documents_exists;

select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'case_documents'
  and column_name in ('validation_reason','validation_meta','validated_at','rejected_at','synced_at')
order by column_name;

select conname
from pg_constraint
where conname = 'case_documents_status_check';

select tablename, count(*) as policy_count
from pg_policies
where tablename in ('documents','case_documents')
group by tablename
order by tablename;

select id, name, public
from storage.buckets
where id = 'vault';
```

Expected results:
- case_documents_exists: public.case_documents
- columns list: validation_meta, validation_reason, validated_at, rejected_at, synced_at
- conname: case_documents_status_check
- policy_count: documents=4, case_documents=6
- storage bucket: a row with id=name=vault

## Minimal local smoke test via API routes

Prerequisites:
- `pnpm dev`
- An existing user account (email + password)
- A local file `./tmp/a2-sample.pdf`

1) Login and capture session cookies:

```bash
curl -sS -c .cookies \
  -X POST http://localhost:3000/api/auth/login \
  -H "content-type: application/json" \
  -d '{"email":"you@example.com","password":"your-password"}'
```

2) Create a case:

```bash
curl -sS -b .cookies \
  -X POST http://localhost:3000/api/cases \
  -H "content-type: application/json" \
  -d '{"type":"toeslagen","productSlug":"huurtoeslag","title":"A2 pipeline smoke"}'
```

Capture `id` from the response as `CASE_ID`.

3) Prepare upload token:

```bash
curl -sS -b .cookies \
  -X POST http://localhost:3000/api/documents/upload \
  -H "content-type: application/json" \
  -d '{"fileName":"a2-sample.pdf","type":"other"}'
```

Capture `doc.id`, `bucket`, `path`, `token` as `DOC_ID`, `BUCKET`, `PATH`, `TOKEN`.

4) Upload the file to the signed URL (server-mediated):

```bash
curl -sS -b .cookies \
  -X POST http://localhost:3000/api/documents/upload-to-signed \
  -F file=@./tmp/a2-sample.pdf \
  -F bucket="$BUCKET" \
  -F path="$PATH" \
  -F token="$TOKEN"
```

5) Attach document to the case:

```bash
curl -sS -b .cookies \
  -X POST http://localhost:3000/api/cases/$CASE_ID/documents \
  -H "content-type: application/json" \
  -d '{"documentId":"'$DOC_ID'"}'
```

Capture `id` from the response as `CASE_DOC_ID`.

6) Mark the case document as validating:

```bash
curl -sS -b .cookies \
  -X PATCH http://localhost:3000/api/cases/$CASE_ID/documents/$CASE_DOC_ID \
  -H "content-type: application/json" \
  -d '{"status":"validating"}'
```

7) Validate the document (OCR + rules):

```bash
curl -sS -b .cookies \
  -X POST http://localhost:3000/api/documents/validate \
  -H "content-type: application/json" \
  -d '{"documentId":"'$DOC_ID'"}'
```

8) Persist validation outcome to the case document (use the response from step 7):

```bash
curl -sS -b .cookies \
  -X PATCH http://localhost:3000/api/cases/$CASE_ID/documents/$CASE_DOC_ID \
  -H "content-type: application/json" \
  -d '{"status":"validated","validationReason":null,"validationMeta":{}}'
```

Replace `status`, `validationReason`, and `validationMeta` with the actual values returned by step 7.

9) Confirm case detail includes the document:

```bash
curl -sS -b .cookies http://localhost:3000/api/cases/$CASE_ID
```

You should see the document entry with status and validation fields in `documents`.
