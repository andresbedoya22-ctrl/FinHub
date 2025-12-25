alter table public.documents
  add column if not exists status text not null default 'uploaded'
  check (status in ('uploaded','under_review','approved','rejected'));

create index if not exists idx_documents_status on public.documents(status);