-- A3: consent ledger + authorization status for case engine

alter table if exists public.cases
  add column if not exists authorization_status text not null default 'not_started';

alter table if exists public.cases
  drop constraint if exists cases_authorization_status_check;

alter table if exists public.cases
  add constraint cases_authorization_status_check
  check (authorization_status in ('not_started','pending','received','verified'));

alter table if exists public.cases
  drop constraint if exists cases_status_check;

alter table if exists public.cases
  add constraint cases_status_check
  check (status in (
    'created','in_progress','waiting_user','ready_for_review','submitted','under_review','completed','cancelled'
  ));

alter table if exists public.consents
  add column if not exists case_id uuid null references public.cases(id) on delete cascade,
  add column if not exists consent_type text null,
  add column if not exists accepted_at timestamptz null,
  add column if not exists locale text null,
  add column if not exists version integer null;

update public.consents
set accepted_at = coalesce(accepted_at, created_at)
where granted = true;

update public.consents
set version = coalesce(version, 1);

alter table if exists public.consents
  alter column version set default 1;

alter table if exists public.consents
  drop constraint if exists consents_consent_type_check;

alter table if exists public.consents
  add constraint consents_consent_type_check
  check (
    consent_type is null
    or consent_type in ('service_authorization','data_processing','terms_acceptance')
  );

create index if not exists idx_consents_case_consent_type on public.consents(case_id, consent_type, created_at desc);

-- tighten RLS to ensure case-level records can only target own case
drop policy if exists consents_insert_own on public.consents;
create policy consents_insert_own on public.consents
for insert
with check (
  user_id = auth.uid()
  and (
    case_id is null
    or exists (
      select 1 from public.cases c
      where c.id = consents.case_id
        and c.user_id = auth.uid()
    )
  )
);

drop policy if exists consents_update_own on public.consents;
create policy consents_update_own on public.consents
for update
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and (
    case_id is null
    or exists (
      select 1 from public.cases c
      where c.id = consents.case_id
        and c.user_id = auth.uid()
    )
  )
);
