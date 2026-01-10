-- finance_core_v1
-- Canon + runtime alignment: creates finance tables required by /api/finances/*
begin;

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

create index if not exists finance_categories_user_id_idx on public.finance_categories(user_id);
create index if not exists finance_categories_user_sort_idx on public.finance_categories(user_id, sort_order);

create table if not exists public.finance_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  occurred_on date not null,
  merchant_name text not null,
  merchant_norm text not null,
  category_id uuid null references public.finance_categories(id) on delete set null,
  amount_cents bigint not null,
  currency text not null default 'EUR',
  status text not null default 'pending',
  source text not null default 'manual',
  note text null,
  reviewed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint finance_transactions_currency_chk check (currency = 'EUR'),
  constraint finance_transactions_status_chk check (status in ('pending','approved','hidden')),
  constraint finance_transactions_source_chk check (source in ('manual','ocr'))
);

create index if not exists finance_transactions_user_date_idx on public.finance_transactions(user_id, occurred_on desc);
create index if not exists finance_transactions_user_status_idx on public.finance_transactions(user_id, status);

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

create index if not exists finance_splits_user_tx_idx on public.finance_transaction_splits(user_id, transaction_id);

create table if not exists public.finance_user_plans (
  user_id uuid primary key references auth.users(id) on delete cascade,
  projected_income_monthly_cents bigint null,
  currency text not null default 'EUR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint finance_user_plans_currency_chk check (currency = 'EUR')
);

create table if not exists public.finance_fixed_budgets (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  monthly_cents bigint null,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create index if not exists finance_fixed_budgets_user_sort_idx on public.finance_fixed_budgets(user_id, sort_order);

create table if not exists public.finance_rules_v1 (
  user_id uuid primary key references auth.users(id) on delete cascade,
  version int not null default 1,
  safe_to_spend_mode text not null default 'income-expense-fixedRemaining',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint finance_rules_v1_mode_chk check (safe_to_spend_mode in ('income-expense-fixedRemaining'))
);

create table if not exists public.finance_receipt_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  transaction_id uuid not null references public.finance_transactions(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint finance_receipt_links_unique unique (user_id, document_id, transaction_id)
);

create index if not exists finance_receipt_links_user_doc_idx on public.finance_receipt_links(user_id, document_id);
create index if not exists finance_receipt_links_user_tx_idx on public.finance_receipt_links(user_id, transaction_id);

commit;
