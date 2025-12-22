-- FinHub schema v1 (Postgres / Supabase target)

create extension if not exists pgcrypto;

-- Si usas Supabase Auth: profiles.id = auth.users.id
create table if not exists profiles (
  id uuid primary key,
  preferred_language text not null check (preferred_language in ('ES','PL','RO','EN')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists cases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,

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

  -- En frontend existe y se persiste; en backend podrías derivarlo, pero aquí lo guardamos por compatibilidad.
  steps_json jsonb not null default '[]'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_cases_user_created on cases(user_id, created_at desc);
create index if not exists idx_cases_status on cases(status);

-- Normalización de drafts por stepKey (source of truth del draft en backend)
create table if not exists case_step_data (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  step_key text not null check (step_key in (
    'eligibility','result','checkout','authorization','documents','review','intake','submission','done'
  )),
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_case_step unique (case_id, step_key)
);

create index if not exists idx_case_step_case on case_step_data(case_id);

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  case_id uuid null references cases(id) on delete set null,

  file_name text not null,
  type text not null check (type in ('id','income','bank','rental','tax','other')),
  status text not null check (status in ('pending','ready','reviewed')),

  notes text null,

  -- Fase 6+: storage real
  storage_path text null,
  mime_type text null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_documents_user_created on documents(user_id, created_at desc);
create index if not exists idx_documents_case on documents(case_id);

-- Pagos (v1 backend)
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  case_id uuid null references cases(id) on delete set null,

  provider text not null, -- 'stripe'
  status text not null check (status in ('created','pending','paid','failed','refunded')),
  amount_cents integer not null,
  currency text not null default 'EUR',

  stripe_session_id text null,
  stripe_payment_intent_id text null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_payments_user_created on payments(user_id, created_at desc);
create index if not exists idx_payments_case on payments(case_id);

-- Consentimientos (v1 backend)
create table if not exists consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,

  type text not null check (type in ('marketing_emails','in_app_offers')),
  granted boolean not null,
  source text not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_consents_user_type on consents(user_id, type);
