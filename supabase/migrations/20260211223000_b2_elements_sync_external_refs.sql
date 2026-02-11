-- B2: external references for idempotent sync FinHub -> Elements

create table if not exists public.external_refs (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  provider text not null,
  entity_type text not null,
  local_id uuid not null,
  external_id text not null,
  payload_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_synced_at timestamptz not null default now(),
  constraint external_refs_provider_check check (provider in ('elements')),
  constraint external_refs_entity_type_check check (entity_type in ('case', 'task', 'document')),
  constraint external_refs_payload_hash_len check (char_length(payload_hash) >= 32)
);

create unique index if not exists uq_external_refs_provider_entity_local
  on public.external_refs(provider, entity_type, local_id);

create index if not exists idx_external_refs_case_provider
  on public.external_refs(case_id, provider, entity_type);

alter table if exists public.external_refs enable row level security;

drop policy if exists external_refs_select_own_or_admin on public.external_refs;
create policy external_refs_select_own_or_admin
on public.external_refs
for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1 from public.cases c
    where c.id = external_refs.case_id
      and c.user_id = auth.uid()
  )
);

drop policy if exists external_refs_write_service on public.external_refs;
create policy external_refs_write_service
on public.external_refs
for all
to authenticated
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
