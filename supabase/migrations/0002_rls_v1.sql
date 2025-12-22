-- 0002_rls_v1.sql
-- RLS v1: owner-only access. Admin policies se agregan en Fase 6.

-- PROFILES
alter table if exists profiles enable row level security;

drop policy if exists profiles_select_own on profiles;
create policy profiles_select_own on profiles
  for select
  using (id = auth.uid());

drop policy if exists profiles_insert_own on profiles;
create policy profiles_insert_own on profiles
  for insert
  with check (id = auth.uid());

drop policy if exists profiles_update_own on profiles;
create policy profiles_update_own on profiles
  for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- CASES
alter table if exists cases enable row level security;

drop policy if exists cases_select_own on cases;
create policy cases_select_own on cases
  for select
  using (user_id = auth.uid());

drop policy if exists cases_insert_own on cases;
create policy cases_insert_own on cases
  for insert
  with check (user_id = auth.uid());

drop policy if exists cases_update_own on cases;
create policy cases_update_own on cases
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists cases_delete_own on cases;
create policy cases_delete_own on cases
  for delete
  using (user_id = auth.uid());

-- CASE_STEP_DATA (drafts normalizados)
alter table if exists case_step_data enable row level security;

drop policy if exists case_step_data_select_own on case_step_data;
create policy case_step_data_select_own on case_step_data
  for select
  using (
    exists (
      select 1
      from cases c
      where c.id = case_step_data.case_id
        and c.user_id = auth.uid()
    )
  );

drop policy if exists case_step_data_insert_own on case_step_data;
create policy case_step_data_insert_own on case_step_data
  for insert
  with check (
    exists (
      select 1
      from cases c
      where c.id = case_step_data.case_id
        and c.user_id = auth.uid()
    )
  );

drop policy if exists case_step_data_update_own on case_step_data;
create policy case_step_data_update_own on case_step_data
  for update
  using (
    exists (
      select 1
      from cases c
      where c.id = case_step_data.case_id
        and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from cases c
      where c.id = case_step_data.case_id
        and c.user_id = auth.uid()
    )
  );

drop policy if exists case_step_data_delete_own on case_step_data;
create policy case_step_data_delete_own on case_step_data
  for delete
  using (
    exists (
      select 1
      from cases c
      where c.id = case_step_data.case_id
        and c.user_id = auth.uid()
    )
  );

-- DOCUMENTS (metadata)
alter table if exists documents enable row level security;

drop policy if exists documents_select_own on documents;
create policy documents_select_own on documents
  for select
  using (user_id = auth.uid());

drop policy if exists documents_insert_own on documents;
create policy documents_insert_own on documents
  for insert
  with check (user_id = auth.uid());

drop policy if exists documents_update_own on documents;
create policy documents_update_own on documents
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists documents_delete_own on documents;
create policy documents_delete_own on documents
  for delete
  using (user_id = auth.uid());

-- PAYMENTS
alter table if exists payments enable row level security;

drop policy if exists payments_select_own on payments;
create policy payments_select_own on payments
  for select
  using (user_id = auth.uid());

drop policy if exists payments_insert_own on payments;
create policy payments_insert_own on payments
  for insert
  with check (user_id = auth.uid());

drop policy if exists payments_update_own on payments;
create policy payments_update_own on payments
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists payments_delete_own on payments;
create policy payments_delete_own on payments
  for delete
  using (user_id = auth.uid());

-- CONSENTS
alter table if exists consents enable row level security;

drop policy if exists consents_select_own on consents;
create policy consents_select_own on consents
  for select
  using (user_id = auth.uid());

drop policy if exists consents_insert_own on consents;
create policy consents_insert_own on consents
  for insert
  with check (user_id = auth.uid());

drop policy if exists consents_update_own on consents;
create policy consents_update_own on consents
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists consents_delete_own on consents;
create policy consents_delete_own on consents
  for delete
  using (user_id = auth.uid());
