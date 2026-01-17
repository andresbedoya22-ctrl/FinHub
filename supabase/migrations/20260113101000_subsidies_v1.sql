-- Subsidies (toeslagen) core tables + policies

do $$
declare r record;
begin
  begin
    execute 'alter table public.cases drop constraint if exists cases_type_check';
  exception
    when undefined_table then
      null;
  end;

  for r in
    select conname
    from pg_constraint
    where conrelid = 'public.cases'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%type in (%'
  loop
    execute format('alter table public.cases drop constraint if exists %I', r.conname);
  end loop;

  begin
    execute $q$
      alter table public.cases
        add constraint cases_type_check
        check (type in (
          'toeslag_huur','toeslag_zorg','toeslag_kinderopvang','toeslag_kgb',
          'subsidy.huurtoeslag','subsidy.zorgtoeslag','subsidy.kgb','subsidy.kot',
          'tax_ib','tax_voorlopige_aanslag',
          'finances_intake','document_review'
        ))
    $q$;
  exception
    when duplicate_object then
      null;
  end;
end $$;

create table if not exists public.subsidies_policy (
  year integer primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.subsidies_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  slug text not null check (slug in ('huurtoeslag','zorgtoeslag','kgb','kot')),
  status text not null check (status in (
    'draft','eligible_checked','paid','waiting_user','under_review','submitted','decision','done','cancelled'
  )),
  eligibility_snapshot jsonb null,
  intake_data jsonb null,
  stripe_checkout_session_id text null,
  stripe_payment_intent_id text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz null
);

create index if not exists idx_subsidies_applications_user_created on public.subsidies_applications(user_id, created_at desc);
create index if not exists idx_subsidies_applications_status on public.subsidies_applications(status);
create unique index if not exists uq_subsidies_checkout_session on public.subsidies_applications(stripe_checkout_session_id);
create unique index if not exists uq_subsidies_payment_intent on public.subsidies_applications(stripe_payment_intent_id);

create table if not exists public.subsidies_documents (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.subsidies_applications(id) on delete cascade,
  doc_key text not null,
  file_path text null,
  status text not null check (status in ('missing','uploaded','approved','rejected')),
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_subsidies_documents unique (application_id, doc_key)
);

create index if not exists idx_subsidies_documents_application on public.subsidies_documents(application_id, created_at desc);

create table if not exists public.subsidies_admin_notes (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.subsidies_applications(id) on delete cascade,
  author_user_id uuid not null references public.profiles(id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_subsidies_admin_notes_application on public.subsidies_admin_notes(application_id, created_at desc);

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references public.profiles(id) on delete cascade,
  action text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_log_actor on public.audit_log(actor_user_id, created_at desc);

alter table public.subsidies_policy enable row level security;
alter table public.subsidies_applications enable row level security;
alter table public.subsidies_documents enable row level security;
alter table public.subsidies_admin_notes enable row level security;
alter table public.audit_log enable row level security;

drop policy if exists subsidies_policy_select_all on public.subsidies_policy;
create policy subsidies_policy_select_all
on public.subsidies_policy
for select
to authenticated
using (true);

drop policy if exists subsidies_policy_admin_upsert on public.subsidies_policy;
create policy subsidies_policy_admin_upsert
on public.subsidies_policy
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists subsidies_applications_select_own on public.subsidies_applications;
create policy subsidies_applications_select_own
on public.subsidies_applications
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists subsidies_applications_insert_own on public.subsidies_applications;
create policy subsidies_applications_insert_own
on public.subsidies_applications
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists subsidies_applications_update_own on public.subsidies_applications;
create policy subsidies_applications_update_own
on public.subsidies_applications
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists subsidies_applications_admin_select_all on public.subsidies_applications;
create policy subsidies_applications_admin_select_all
on public.subsidies_applications
for select
to authenticated
using (public.is_admin());

drop policy if exists subsidies_documents_select_own on public.subsidies_documents;
create policy subsidies_documents_select_own
on public.subsidies_documents
for select
to authenticated
using (
  exists (
    select 1 from public.subsidies_applications a
    where a.id = application_id and a.user_id = auth.uid()
  )
);

drop policy if exists subsidies_documents_update_own on public.subsidies_documents;
create policy subsidies_documents_update_own
on public.subsidies_documents
for update
to authenticated
using (
  exists (
    select 1 from public.subsidies_applications a
    where a.id = application_id and a.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.subsidies_applications a
    where a.id = application_id and a.user_id = auth.uid()
  )
);

drop policy if exists subsidies_documents_admin_select_all on public.subsidies_documents;
create policy subsidies_documents_admin_select_all
on public.subsidies_documents
for select
to authenticated
using (public.is_admin());

drop policy if exists subsidies_admin_notes_select_own on public.subsidies_admin_notes;
create policy subsidies_admin_notes_select_own
on public.subsidies_admin_notes
for select
to authenticated
using (
  exists (
    select 1 from public.subsidies_applications a
    where a.id = application_id and a.user_id = auth.uid()
  )
);

drop policy if exists subsidies_admin_notes_admin_insert on public.subsidies_admin_notes;
create policy subsidies_admin_notes_admin_insert
on public.subsidies_admin_notes
for insert
to authenticated
with check (public.is_admin());

drop policy if exists audit_log_admin_select_all on public.audit_log;
create policy audit_log_admin_select_all
on public.audit_log
for select
to authenticated
using (public.is_admin());

drop policy if exists audit_log_admin_insert on public.audit_log;
create policy audit_log_admin_insert
on public.audit_log
for insert
to authenticated
with check (public.is_admin());
