-- Align public.documents with frontend expectations (idempotent)

alter table public.documents
  add column if not exists filename text,
  add column if not exists type text not null default 'unknown',
  add column if not exists status text not null default 'uploaded',
  add column if not exists notes text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

-- Status constraint (safe if table is empty or values already compliant)
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'documents_status_check'
  ) then
    alter table public.documents
      add constraint documents_status_check
      check (status in ('uploaded','under_review','approved','rejected'));
  end if;
end $$;

-- updated_at auto-update
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_documents_updated_at on public.documents;
create trigger trg_documents_updated_at
before update on public.documents
for each row execute function public.set_updated_at();

create index if not exists idx_documents_type on public.documents(type);
create index if not exists idx_documents_status on public.documents(status);
create index if not exists idx_documents_created_at on public.documents(created_at);