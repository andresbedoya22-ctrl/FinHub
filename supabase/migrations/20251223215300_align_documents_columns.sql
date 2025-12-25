-- Align documents table with frontend expectations (idempotent)

alter table public.documents
  add column if not exists type text not null default 'unknown';

-- si aún no existen, las dejamos listas también
alter table public.documents
  add column if not exists status text not null default 'uploaded'
  check (status in ('uploaded','under_review','approved','rejected'));

alter table public.documents
  add column if not exists notes text;

create index if not exists idx_documents_type on public.documents(type);
create index if not exists idx_documents_status on public.documents(status);