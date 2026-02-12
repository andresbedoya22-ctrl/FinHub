-- B3 v1: reverse sync from Elements -> FinHub + lifecycle events table

create table if not exists public.product_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references public.profiles(id) on delete set null,
  case_id uuid null references public.cases(id) on delete cascade,
  event_name text not null,
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint product_events_event_name_len check (char_length(event_name) >= 3)
);

create index if not exists idx_product_events_case_occurred_at
  on public.product_events(case_id, occurred_at desc);

create index if not exists idx_product_events_event_name_occurred_at
  on public.product_events(event_name, occurred_at desc);

alter table if exists public.product_events enable row level security;

drop policy if exists product_events_select_own_or_admin on public.product_events;
create policy product_events_select_own_or_admin
on public.product_events
for select
to authenticated
using (
  public.is_admin()
  or user_id = auth.uid()
  or exists (
    select 1 from public.cases c
    where c.id = product_events.case_id
      and c.user_id = auth.uid()
  )
);

drop policy if exists product_events_write_service on public.product_events;
create policy product_events_write_service
on public.product_events
for all
to authenticated
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
