-- RLS v1

-- PROFILES
alter table if exists public.profiles enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
for select using (id = auth.uid());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
for update using (id = auth.uid());

-- CASES
alter table if exists public.cases enable row level security;

drop policy if exists cases_select_own on public.cases;
create policy cases_select_own on public.cases
for select using (user_id = auth.uid());

drop policy if exists cases_insert_own on public.cases;
create policy cases_insert_own on public.cases
for insert with check (user_id = auth.uid());

drop policy if exists cases_update_own on public.cases;
create policy cases_update_own on public.cases
for update using (user_id = auth.uid());

drop policy if exists cases_delete_own on public.cases;
create policy cases_delete_own on public.cases
for delete using (user_id = auth.uid());

-- CASE_STEP_DATA
alter table if exists public.case_step_data enable row level security;

drop policy if exists case_step_data_select_own on public.case_step_data;
create policy case_step_data_select_own on public.case_step_data
for select using (
  exists (
    select 1 from public.cases c
    where c.id = case_step_data.case_id
      and c.user_id = auth.uid()
  )
);

drop policy if exists case_step_data_insert_own on public.case_step_data;
create policy case_step_data_insert_own on public.case_step_data
for insert with check (
  exists (
    select 1 from public.cases c
    where c.id = case_step_data.case_id
      and c.user_id = auth.uid()
  )
);

drop policy if exists case_step_data_update_own on public.case_step_data;
create policy case_step_data_update_own on public.case_step_data
for update using (
  exists (
    select 1 from public.cases c
    where c.id = case_step_data.case_id
      and c.user_id = auth.uid()
  )
);

drop policy if exists case_step_data_delete_own on public.case_step_data;
create policy case_step_data_delete_own on public.case_step_data
for delete using (
  exists (
    select 1 from public.cases c
    where c.id = case_step_data.case_id
      and c.user_id = auth.uid()
  )
);

-- DOCUMENTS
alter table if exists public.documents enable row level security;

drop policy if exists documents_select_own on public.documents;
create policy documents_select_own on public.documents
for select using (user_id = auth.uid());

drop policy if exists documents_insert_own on public.documents;
create policy documents_insert_own on public.documents
for insert with check (user_id = auth.uid());

drop policy if exists documents_update_own on public.documents;
create policy documents_update_own on public.documents
for update using (user_id = auth.uid());

drop policy if exists documents_delete_own on public.documents;
create policy documents_delete_own on public.documents
for delete using (user_id = auth.uid());

-- PAYMENTS
alter table if exists public.payments enable row level security;

drop policy if exists payments_select_own on public.payments;
create policy payments_select_own on public.payments
for select using (user_id = auth.uid());

drop policy if exists payments_insert_own on public.payments;
create policy payments_insert_own on public.payments
for insert with check (user_id = auth.uid());

drop policy if exists payments_update_own on public.payments;
create policy payments_update_own on public.payments
for update using (user_id = auth.uid());

drop policy if exists payments_delete_own on public.payments;
create policy payments_delete_own on public.payments
for delete using (user_id = auth.uid());

-- CONSENTS
alter table if exists public.consents enable row level security;

drop policy if exists consents_select_own on public.consents;
create policy consents_select_own on public.consents
for select using (user_id = auth.uid());

drop policy if exists consents_insert_own on public.consents;
create policy consents_insert_own on public.consents
for insert with check (user_id = auth.uid());

drop policy if exists consents_update_own on public.consents;
create policy consents_update_own on public.consents
for update using (user_id = auth.uid());

drop policy if exists consents_delete_own on public.consents;
create policy consents_delete_own on public.consents
for delete using (user_id = auth.uid());