-- FinHub — F11.1 Finance core schema (EUR-only) + RLS
-- Conventions:
-- - amount_cents signed: expenses negative, income positive
-- - currency is EUR only
-- - transactions support inbox workflow (pending/approved/hidden)
-- - splits supported (one parent transaction -> many split lines)

begin;

-- 1) Types (idempotent)
do $$ begin
  create type public.finance_tx_status as enum ('pending','approved','hidden');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.finance_tx_source as enum ('manual','ocr');
exception
  when duplicate_object then null;
end $$;

-- 2) Categories (user-scoped; editable)
create table if not exists public.finance_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  label text not null,
  sort_order int not null default 0,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint finance_categories_user_key_unique unique (user_id, key)
);

-- 3) Transactions (inbox + pro dashboard)
create table if not exists public.finance_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  occurred_on date not null,
  merchant_name text not null,
  merchant_norm text not null,

  category_id uuid null references public.finance_categories(id) on delete set null,

  amount_cents bigint not null,
  currency text not null default 'EUR',
  status public.finance_tx_status not null default 'pending',
  source public.finance_tx_source not null default 'manual',

  note text null,

  reviewed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint finance_transactions_currency_eur check (currency = 'EUR')
);

-- 4) Splits (P0: divide transaction)
-- A split row is a logical "line item" tied to a parent transaction.
-- The sum of split_amount_cents should equal parent amount_cents (validated at app level for now).
create table if not exists public.finance_transaction_splits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  transaction_id uuid not null references public.finance_transactions(id) on delete cascade,

  category_id uuid null references public.finance_categories(id) on delete set null,
  split_amount_cents bigint not null,
  note text null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5) Receipt links (documents -> transaction)
create table if not exists public.finance_receipt_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_id uuid not null,
  transaction_id uuid not null references public.finance_transactions(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint finance_receipt_links_unique unique (user_id, document_id, transaction_id)
);

-- 6) Monthly snapshots (for 3M "normality" band + dashboard)
create table if not exists public.finance_monthly_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  month text not null, -- format YYYY-MM (validated at app layer)
  income_cents bigint not null default 0,
  expense_cents bigint not null default 0,
  net_cents bigint not null default 0,
  safe_to_spend_cents bigint not null default 0,

  -- JSON with breakdowns:
  -- { byCategory: { "<categoryKey>": cents }, topMerchants: [{name,norm,cents,count}], daily: [{day, spent_cents}] }
  breakdown_json jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint finance_monthly_snapshots_user_month_unique unique (user_id, month)
);

-- 7) Indexes (dashboard + inbox)
create index if not exists finance_transactions_user_occurred_idx
  on public.finance_transactions (user_id, occurred_on desc);

create index if not exists finance_transactions_user_status_idx
  on public.finance_transactions (user_id, status);

create index if not exists finance_transactions_user_category_idx
  on public.finance_transactions (user_id, category_id);

create index if not exists finance_transactions_user_merchant_norm_idx
  on public.finance_transactions (user_id, merchant_norm);

create index if not exists finance_splits_user_tx_idx
  on public.finance_transaction_splits (user_id, transaction_id);

create index if not exists finance_receipt_links_user_doc_idx
  on public.finance_receipt_links (user_id, document_id);

create index if not exists finance_snapshots_user_month_idx
  on public.finance_monthly_snapshots (user_id, month);

-- 8) RLS
alter table public.finance_categories enable row level security;
alter table public.finance_transactions enable row level security;
alter table public.finance_transaction_splits enable row level security;
alter table public.finance_receipt_links enable row level security;
alter table public.finance_monthly_snapshots enable row level security;

-- Categories policies
drop policy if exists "finance_categories_select_own" on public.finance_categories;
create policy "finance_categories_select_own"
on public.finance_categories
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "finance_categories_insert_own" on public.finance_categories;
create policy "finance_categories_insert_own"
on public.finance_categories
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "finance_categories_update_own" on public.finance_categories;
create policy "finance_categories_update_own"
on public.finance_categories
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "finance_categories_delete_own" on public.finance_categories;
create policy "finance_categories_delete_own"
on public.finance_categories
for delete
to authenticated
using (user_id = auth.uid());

-- Transactions policies
drop policy if exists "finance_transactions_select_own" on public.finance_transactions;
create policy "finance_transactions_select_own"
on public.finance_transactions
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "finance_transactions_insert_own" on public.finance_transactions;
create policy "finance_transactions_insert_own"
on public.finance_transactions
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "finance_transactions_update_own" on public.finance_transactions;
create policy "finance_transactions_update_own"
on public.finance_transactions
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "finance_transactions_delete_own" on public.finance_transactions;
create policy "finance_transactions_delete_own"
on public.finance_transactions
for delete
to authenticated
using (user_id = auth.uid());

-- Splits policies
drop policy if exists "finance_splits_select_own" on public.finance_transaction_splits;
create policy "finance_splits_select_own"
on public.finance_transaction_splits
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "finance_splits_insert_own" on public.finance_transaction_splits;
create policy "finance_splits_insert_own"
on public.finance_transaction_splits
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "finance_splits_update_own" on public.finance_transaction_splits;
create policy "finance_splits_update_own"
on public.finance_transaction_splits
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "finance_splits_delete_own" on public.finance_transaction_splits;
create policy "finance_splits_delete_own"
on public.finance_transaction_splits
for delete
to authenticated
using (user_id = auth.uid());

-- Receipt links policies
drop policy if exists "finance_receipt_links_select_own" on public.finance_receipt_links;
create policy "finance_receipt_links_select_own"
on public.finance_receipt_links
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "finance_receipt_links_insert_own" on public.finance_receipt_links;
create policy "finance_receipt_links_insert_own"
on public.finance_receipt_links
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "finance_receipt_links_delete_own" on public.finance_receipt_links;
create policy "finance_receipt_links_delete_own"
on public.finance_receipt_links
for delete
to authenticated
using (user_id = auth.uid());

-- Snapshots policies
drop policy if exists "finance_snapshots_select_own" on public.finance_monthly_snapshots;
create policy "finance_snapshots_select_own"
on public.finance_monthly_snapshots
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "finance_snapshots_insert_own" on public.finance_monthly_snapshots;
create policy "finance_snapshots_insert_own"
on public.finance_monthly_snapshots
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "finance_snapshots_update_own" on public.finance_monthly_snapshots;
create policy "finance_snapshots_update_own"
on public.finance_monthly_snapshots
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "finance_snapshots_delete_own" on public.finance_monthly_snapshots;
create policy "finance_snapshots_delete_own"
on public.finance_monthly_snapshots
for delete
to authenticated
using (user_id = auth.uid());

commit;
