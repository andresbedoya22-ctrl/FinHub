-- Allow documents without storage upload yet (mock v1)
alter table public.documents
  alter column storage_path drop not null;

-- optional: keep the column but no default (null means "not uploaded yet")
alter table public.documents
  alter column storage_path drop default;