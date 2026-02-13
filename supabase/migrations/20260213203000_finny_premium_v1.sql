-- Finny Premium v1 (Fase 6 G1/G2/G3)
-- Gate Lite/Premium + guardrails anti-spam + quiet hours + context tracking.

create table if not exists public.finny_user_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  tier_override text null check (tier_override in ('lite', 'premium')),
  quiet_hours_enabled boolean not null default false,
  quiet_start_hour smallint not null default 22 check (quiet_start_hour >= 0 and quiet_start_hour <= 23),
  quiet_end_hour smallint not null default 7 check (quiet_end_hour >= 0 and quiet_end_hour <= 23),
  timezone text not null default 'Europe/Amsterdam',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.finny_chat_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  case_id uuid null references public.cases(id) on delete set null,
  tier text not null check (tier in ('lite', 'premium')),
  mode text not null check (mode in ('faq', 'llm', 'blocked', 'error')),
  blocked_reason text null check (blocked_reason in ('rate_limit', 'repeat_spam', 'quiet_hours')),
  input_hash text not null,
  input_length integer not null default 0,
  output_length integer not null default 0,
  estimated_tokens integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_finny_chat_events_user_created
  on public.finny_chat_events(user_id, created_at desc);

create index if not exists idx_finny_chat_events_user_hash_created
  on public.finny_chat_events(user_id, input_hash, created_at desc);

alter table if exists public.finny_user_settings enable row level security;
alter table if exists public.finny_chat_events enable row level security;

drop policy if exists finny_user_settings_select_own on public.finny_user_settings;
create policy finny_user_settings_select_own
on public.finny_user_settings
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists finny_user_settings_upsert_own on public.finny_user_settings;
create policy finny_user_settings_upsert_own
on public.finny_user_settings
for all
to authenticated
using (user_id = auth.uid() or auth.role() = 'service_role')
with check (user_id = auth.uid() or auth.role() = 'service_role');

drop policy if exists finny_chat_events_select_own on public.finny_chat_events;
create policy finny_chat_events_select_own
on public.finny_chat_events
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists finny_chat_events_insert_own on public.finny_chat_events;
create policy finny_chat_events_insert_own
on public.finny_chat_events
for insert
to authenticated
with check (user_id = auth.uid() or auth.role() = 'service_role');

drop policy if exists finny_chat_events_service_write on public.finny_chat_events;
create policy finny_chat_events_service_write
on public.finny_chat_events
for all
to authenticated
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
