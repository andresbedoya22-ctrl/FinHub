-- Phase 7.1: OCR/Extraction/Review persistence (v1)

-- 0) Extend documents.type to support machtigingsregistratie (keep existing values)
do $$
declare r record;
begin
  -- If table doesn't exist yet, no-op
  begin
    execute 'alter table public.documents drop constraint if exists documents_type_check';
  exception
    when undefined_table then
      return;
  end;

  -- Drop any CHECK constraint on documents that looks like a type-in list (name may vary)
  for r in
    select conname
    from pg_constraint
    where conrelid = 'public.documents'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%type in (%'
  loop
    execute format('alter table public.documents drop constraint if exists %I', r.conname);
  end loop;

  -- Re-create canonical constraint name (ignore if already exists)
  begin
    execute $q$
      alter table public.documents
        add constraint documents_type_check
        check (type in ('id','income','bank','rental','tax','other','machtigingsregistratie'))
    $q$;
  exception
    when duplicate_object then
      null;
  end;
end $$;

create index if not exists idx_documents_type on public.documents(type);

-- 1) OCR Runs
create table if not exists public.document_ocr_runs (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,

  provider text not null default 'mock',
  status text not null check (status in ('created','processing','succeeded','failed')),

  raw_text text null,
  raw_json jsonb null,
  error text null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_document_ocr_runs_document on public.document_ocr_runs(document_id, created_at desc);
create index if not exists idx_document_ocr_runs_user on public.document_ocr_runs(user_id, created_at desc);
create index if not exists idx_document_ocr_runs_status on public.document_ocr_runs(status);

alter table public.document_ocr_runs enable row level security;

drop policy if exists document_ocr_runs_select_own on public.document_ocr_runs;
create policy document_ocr_runs_select_own
on public.document_ocr_runs
for select to authenticated
using (user_id = auth.uid());

drop policy if exists document_ocr_runs_insert_own on public.document_ocr_runs;
create policy document_ocr_runs_insert_own
on public.document_ocr_runs
for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.documents d
    where d.id = document_id and d.user_id = auth.uid()
  )
);

drop policy if exists document_ocr_runs_update_own on public.document_ocr_runs;
create policy document_ocr_runs_update_own
on public.document_ocr_runs
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists document_ocr_runs_delete_own on public.document_ocr_runs;
create policy document_ocr_runs_delete_own
on public.document_ocr_runs
for delete to authenticated
using (user_id = auth.uid());

drop policy if exists document_ocr_runs_admin_select_all on public.document_ocr_runs;
create policy document_ocr_runs_admin_select_all
on public.document_ocr_runs
for select to authenticated
using (public.is_admin());

-- 2) Extractions
create table if not exists public.document_extractions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  run_id uuid null references public.document_ocr_runs(id) on delete set null,
  user_id uuid not null references public.profiles(id) on delete cascade,

  extraction_type text not null default 'machtigingsregistratie',
  schema_version integer not null default 1,

  fields jsonb not null default '{}'::jsonb,
  needs_review boolean not null default true,
  confidence numeric null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_document_extractions_document on public.document_extractions(document_id, created_at desc);
create index if not exists idx_document_extractions_user on public.document_extractions(user_id, created_at desc);
create index if not exists idx_document_extractions_type on public.document_extractions(extraction_type);

alter table public.document_extractions enable row level security;

drop policy if exists document_extractions_select_own on public.document_extractions;
create policy document_extractions_select_own
on public.document_extractions
for select to authenticated
using (user_id = auth.uid());

drop policy if exists document_extractions_insert_own on public.document_extractions;
create policy document_extractions_insert_own
on public.document_extractions
for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.documents d
    where d.id = document_id and d.user_id = auth.uid()
  )
);

drop policy if exists document_extractions_update_own on public.document_extractions;
create policy document_extractions_update_own
on public.document_extractions
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists document_extractions_delete_own on public.document_extractions;
create policy document_extractions_delete_own
on public.document_extractions
for delete to authenticated
using (user_id = auth.uid());

drop policy if exists document_extractions_admin_select_all on public.document_extractions;
create policy document_extractions_admin_select_all
on public.document_extractions
for select to authenticated
using (public.is_admin());

-- 3) Reviews (audit trail)
create table if not exists public.document_reviews (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,

  actor_id uuid not null references public.profiles(id) on delete cascade,
  actor_role text not null default 'user' check (actor_role in ('user','admin')),

  action text not null check (action in ('ocr_requested','ocr_failed','ocr_succeeded','user_verified','submitted','approved','rejected','edited')),
  payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index if not exists idx_document_reviews_document on public.document_reviews(document_id, created_at desc);
create index if not exists idx_document_reviews_user on public.document_reviews(user_id, created_at desc);

alter table public.document_reviews enable row level security;

drop policy if exists document_reviews_select_own on public.document_reviews;
create policy document_reviews_select_own
on public.document_reviews
for select to authenticated
using (user_id = auth.uid());

drop policy if exists document_reviews_insert_own on public.document_reviews;
create policy document_reviews_insert_own
on public.document_reviews
for insert to authenticated
with check (
  user_id = auth.uid()
  and actor_id = auth.uid()
  and actor_role = 'user'
  and exists (
    select 1 from public.documents d
    where d.id = document_id and d.user_id = auth.uid()
  )
);

drop policy if exists document_reviews_admin_select_all on public.document_reviews;
create policy document_reviews_admin_select_all
on public.document_reviews
for select to authenticated
using (public.is_admin());

drop policy if exists document_reviews_admin_insert on public.document_reviews;
create policy document_reviews_admin_insert
on public.document_reviews
for insert to authenticated
with check (public.is_admin());