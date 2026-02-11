-- A4 admin operations for cases

-- admin access for cases table
alter table if exists public.cases enable row level security;

drop policy if exists cases_admin_select_all on public.cases;
create policy cases_admin_select_all
on public.cases
for select
to authenticated
using (public.is_admin());

drop policy if exists cases_admin_update on public.cases;
create policy cases_admin_update
on public.cases
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- case notes table for internal operator comments
create table if not exists public.case_notes (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  author_user_id uuid not null references public.profiles(id) on delete cascade,
  note text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_case_notes_case_created on public.case_notes(case_id, created_at desc);

alter table if exists public.case_notes enable row level security;

drop policy if exists case_notes_admin_select on public.case_notes;
create policy case_notes_admin_select
on public.case_notes
for select
to authenticated
using (public.is_admin());

drop policy if exists case_notes_admin_insert on public.case_notes;
create policy case_notes_admin_insert
on public.case_notes
for insert
to authenticated
with check (public.is_admin());

drop policy if exists case_notes_admin_update on public.case_notes;
create policy case_notes_admin_update
on public.case_notes
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists case_notes_admin_delete on public.case_notes;
create policy case_notes_admin_delete
on public.case_notes
for delete
to authenticated
using (public.is_admin());
