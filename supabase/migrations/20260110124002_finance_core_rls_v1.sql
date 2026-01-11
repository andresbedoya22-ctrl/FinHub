-- finance_core_rls_v1
-- Strict owner-only RLS for finance tables.
begin;

alter table public.finance_categories enable row level security;
alter table public.finance_transactions enable row level security;
alter table public.finance_transaction_splits enable row level security;
alter table public.finance_user_plans enable row level security;
alter table public.finance_fixed_budgets enable row level security;
alter table public.finance_rules_v1 enable row level security;
alter table public.finance_receipt_links enable row level security;

-- Categories
drop policy if exists "finance_categories_select_own" on public.finance_categories;
drop policy if exists "finance_categories_insert_own" on public.finance_categories;
drop policy if exists "finance_categories_update_own" on public.finance_categories;
drop policy if exists "finance_categories_delete_own" on public.finance_categories;

create policy "finance_categories_select_own" on public.finance_categories
for select using (user_id = auth.uid());

create policy "finance_categories_insert_own" on public.finance_categories
for insert with check (user_id = auth.uid());

create policy "finance_categories_update_own" on public.finance_categories
for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "finance_categories_delete_own" on public.finance_categories
for delete using (user_id = auth.uid());

-- Transactions
drop policy if exists "finance_transactions_select_own" on public.finance_transactions;
drop policy if exists "finance_transactions_insert_own" on public.finance_transactions;
drop policy if exists "finance_transactions_update_own" on public.finance_transactions;
drop policy if exists "finance_transactions_delete_own" on public.finance_transactions;

create policy "finance_transactions_select_own" on public.finance_transactions
for select using (user_id = auth.uid());

create policy "finance_transactions_insert_own" on public.finance_transactions
for insert with check (user_id = auth.uid());

create policy "finance_transactions_update_own" on public.finance_transactions
for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "finance_transactions_delete_own" on public.finance_transactions
for delete using (user_id = auth.uid());

-- Splits
drop policy if exists "finance_splits_select_own" on public.finance_transaction_splits;
drop policy if exists "finance_splits_insert_own" on public.finance_transaction_splits;
drop policy if exists "finance_splits_update_own" on public.finance_transaction_splits;
drop policy if exists "finance_splits_delete_own" on public.finance_transaction_splits;

create policy "finance_splits_select_own" on public.finance_transaction_splits
for select using (user_id = auth.uid());

create policy "finance_splits_insert_own" on public.finance_transaction_splits
for insert with check (user_id = auth.uid());

create policy "finance_splits_update_own" on public.finance_transaction_splits
for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "finance_splits_delete_own" on public.finance_transaction_splits
for delete using (user_id = auth.uid());

-- User plans
drop policy if exists "finance_user_plans_select_own" on public.finance_user_plans;
drop policy if exists "finance_user_plans_upsert_own" on public.finance_user_plans;

create policy "finance_user_plans_select_own" on public.finance_user_plans
for select using (user_id = auth.uid());

create policy "finance_user_plans_upsert_own" on public.finance_user_plans
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Fixed budgets
drop policy if exists "finance_fixed_budgets_select_own" on public.finance_fixed_budgets;
drop policy if exists "finance_fixed_budgets_crud_own" on public.finance_fixed_budgets;

create policy "finance_fixed_budgets_select_own" on public.finance_fixed_budgets
for select using (user_id = auth.uid());

create policy "finance_fixed_budgets_crud_own" on public.finance_fixed_budgets
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Rules v1
drop policy if exists "finance_rules_v1_select_own" on public.finance_rules_v1;
drop policy if exists "finance_rules_v1_crud_own" on public.finance_rules_v1;

create policy "finance_rules_v1_select_own" on public.finance_rules_v1
for select using (user_id = auth.uid());

create policy "finance_rules_v1_crud_own" on public.finance_rules_v1
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Receipt links
drop policy if exists "finance_receipt_links_select_own" on public.finance_receipt_links;
drop policy if exists "finance_receipt_links_crud_own" on public.finance_receipt_links;

create policy "finance_receipt_links_select_own" on public.finance_receipt_links
for select using (user_id = auth.uid());

create policy "finance_receipt_links_crud_own" on public.finance_receipt_links
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

commit;
