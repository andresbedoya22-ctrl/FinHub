-- Lifecycle v1 (Fase 5 F1/F2/F3)
-- Central emitter + campaigns + deliveries (mock send) + admin controls.

create table if not exists public.lifecycle_campaigns (
  key text primary key,
  name text not null,
  enabled boolean not null default true,
  throttle_minutes integer not null default 1440,
  channel text not null default 'in_app',
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lifecycle_campaigns_key_len check (char_length(key) >= 3),
  constraint lifecycle_campaigns_channel_chk check (channel in ('in_app', 'email'))
);

create table if not exists public.lifecycle_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  case_id uuid null references public.cases(id) on delete cascade,
  campaign_key text not null references public.lifecycle_campaigns(key) on delete restrict,
  event_name text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'accepted',
  error text null,
  emitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lifecycle_events_status_chk check (status in ('accepted', 'skipped_disabled', 'skipped_throttled', 'sent_mock', 'error')),
  constraint lifecycle_events_event_name_len check (char_length(event_name) >= 3)
);

create index if not exists idx_lifecycle_events_user_emitted_at
  on public.lifecycle_events(user_id, emitted_at desc);

create index if not exists idx_lifecycle_events_campaign_emitted_at
  on public.lifecycle_events(campaign_key, emitted_at desc);

create table if not exists public.lifecycle_deliveries (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.lifecycle_events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  case_id uuid null references public.cases(id) on delete cascade,
  campaign_key text not null references public.lifecycle_campaigns(key) on delete restrict,
  channel text not null default 'in_app',
  status text not null,
  reason text null,
  payload jsonb not null default '{}'::jsonb,
  delivered_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lifecycle_deliveries_status_chk check (status in ('sent_mock', 'throttled', 'disabled', 'error')),
  constraint lifecycle_deliveries_channel_chk check (channel in ('in_app', 'email'))
);

create index if not exists idx_lifecycle_deliveries_user_campaign_created
  on public.lifecycle_deliveries(user_id, campaign_key, created_at desc);

create index if not exists idx_lifecycle_deliveries_campaign_status_created
  on public.lifecycle_deliveries(campaign_key, status, created_at desc);

insert into public.lifecycle_campaigns (key, name, enabled, throttle_minutes, channel)
values
  ('welcome', 'Welcome', true, 10080, 'in_app'),
  ('docs_missing', 'Documents Missing', true, 720, 'in_app'),
  ('authorization_pending', 'Authorization Pending', true, 720, 'in_app'),
  ('case_update', 'Case Update', true, 120, 'in_app')
on conflict (key) do update
set
  name = excluded.name,
  updated_at = now();

alter table if exists public.lifecycle_campaigns enable row level security;
alter table if exists public.lifecycle_events enable row level security;
alter table if exists public.lifecycle_deliveries enable row level security;

drop policy if exists lifecycle_campaigns_select_admin on public.lifecycle_campaigns;
create policy lifecycle_campaigns_select_admin
on public.lifecycle_campaigns
for select
to authenticated
using (public.is_admin());

drop policy if exists lifecycle_events_select_admin on public.lifecycle_events;
create policy lifecycle_events_select_admin
on public.lifecycle_events
for select
to authenticated
using (public.is_admin());

drop policy if exists lifecycle_deliveries_select_admin on public.lifecycle_deliveries;
create policy lifecycle_deliveries_select_admin
on public.lifecycle_deliveries
for select
to authenticated
using (public.is_admin());

drop policy if exists lifecycle_campaigns_write_service on public.lifecycle_campaigns;
create policy lifecycle_campaigns_write_service
on public.lifecycle_campaigns
for all
to authenticated
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists lifecycle_events_write_service on public.lifecycle_events;
create policy lifecycle_events_write_service
on public.lifecycle_events
for all
to authenticated
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists lifecycle_deliveries_write_service on public.lifecycle_deliveries;
create policy lifecycle_deliveries_write_service
on public.lifecycle_deliveries
for all
to authenticated
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
