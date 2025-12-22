-- Admin roles + policies

-- 1) Add role column to profiles (id = auth.users.id)
alter table if exists public.profiles
  add column if not exists role text not null default 'user'
  check (role in ('user','admin'));

create index if not exists idx_profiles_role on public.profiles(role);

-- 2) Helper: is_admin()
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$$;

-- 3) Admin can read everything (cases, documents, case_step_data, profiles)
-- PROFILES
drop policy if exists profiles_admin_select_all on public.profiles;
create policy profiles_admin_select_all
on public.profiles
for select
to authenticated
using (public.is_admin());

-- CASES
drop policy if exists cases_admin_select_all on public.cases;
create policy cases_admin_select_all
on public.cases
for select
to authenticated
using (public.is_admin());

-- DOCUMENTS
drop policy if exists documents_admin_select_all on public.documents;
create policy documents_admin_select_all
on public.documents
for select
to authenticated
using (public.is_admin());

-- CASE_STEP_DATA
drop policy if exists case_step_data_admin_select_all on public.case_step_data;
create policy case_step_data_admin_select_all
on public.case_step_data
for select
to authenticated
using (public.is_admin());