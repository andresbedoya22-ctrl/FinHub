-- marketing_leads v1 (F02)
-- NOTE: privacy-first: store lead PII in DB, but do NOT emit PII to telemetry.

create extension if not exists pgcrypto;

create table if not exists public.marketing_leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  locale text not null,
  source text not null default 'landing',

  full_name text null,
  email text not null,
  phone text null,

  interested_in text[] not null default '{}'::text[],

  consent_marketing boolean not null default false,
  consent_ts timestamptz null,

  utm_source text null,
  utm_medium text null,
  utm_campaign text null,
  utm_term text null,
  utm_content text null,

  status text not null default 'new',
  notes text null,

  constraint marketing_leads_email_basic_chk check (position('@' in email) > 1),
  constraint marketing_leads_consent_ts_chk check ((consent_marketing = false) OR (consent_ts is not null))
);

create index if not exists marketing_leads_created_at_idx on public.marketing_leads (created_at desc);
create index if not exists marketing_leads_status_idx on public.marketing_leads (status);
create index if not exists marketing_leads_email_idx on public.marketing_leads (email);

alter table public.marketing_leads enable row level security;

-- Allow inserts for anon + authenticated ONLY when consent is true.
drop policy if exists marketing_leads_insert_anon on public.marketing_leads;
create policy marketing_leads_insert_anon
on public.marketing_leads
for insert
to anon, authenticated
with check (consent_marketing = true);

-- No select/update/delete policies by default (admin access can be added later).
