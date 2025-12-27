-- FinHub schema v1 (reference) - aligned with current migrations
-- NOTE: Migrations in /supabase/migrations are the source of truth.
-- This file is a human-friendly reference snapshot.

create extension if not exists pgcrypto;

-- profiles (id = auth.users.id)
create table if not exists public.profiles (
  id uuid primary key,
  preferred_language text not null check (preferred_language in ('ES','PL','RO','EN')),
  role text not null default 'user' check (role in ('user','admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_role on public.profiles(role);

-- cases
create table if not exists public.cases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,

  type text not null check (type in (
    'toeslag_huur','toeslag_zorg','toeslag_kinderopvang',
    'tax_ib','tax_voorlopige_aanslag',
    'finances_intake','document_review'
  )),

  title text not null,
  status text not null check (status in (
    'created','in_progress','waiting_user','submitted','under_review','completed','cancelled'
  )),

  step_key text not null check (step_key in (
    'eligibility','result','checkout','authorization','documents','review','intake','submission','done'
  )),

  steps_json jsonb not null default '[]'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_cases_user_created on public.cases(user_id, created_at desc);
create index if not exists idx_cases_status on public.cases(status);

-- case_step_data
create table if not exists public.case_step_data (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  step_key text not null check (step_key in (
    'eligibility','result','checkout','authorization','documents','review','intake','submission','done'
  )),
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_case_step unique (case_id, step_key)
);

create index if not exists idx_case_step_case on public.case_step_data(case_id);

-- documents (canonical contract)
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  case_id uuid null references public.cases(id) on delete set null,

  file_name text not null,
  type text not null default 'other'
    check (type in ('id','income','bank','rental','tax','other')),
  status text not null default 'uploaded'
    check (status in ('uploaded','under_review','approved','rejected')),

  notes text null,
  storage_path text null,
  mime_type text null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_documents_user_created on public.documents(user_id, created_at desc);
create index if not exists idx_documents_case on public.documents(case_id);
create index if not exists idx_documents_type on public.documents(type);
create index if not exists idx_documents_status on public.documents(status);

-- OCR runs
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

-- Extractions
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

-- Reviews (audit trail)
create table if not exists public.document_reviews (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,

  actor_id uuid not null references public.profiles(id) on delete cascade,
  actor_role text not null default 'user' check (actor_role in ('user','admin')),

  action text not null check (action in (
    'ocr_requested','ocr_failed','ocr_succeeded',
    'user_verified','submitted','approved','rejected','edited'
  )),
  payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index if not exists idx_document_reviews_document on public.document_reviews(document_id, created_at desc);
create index if not exists idx_document_reviews_user on public.document_reviews(user_id, created_at desc);
