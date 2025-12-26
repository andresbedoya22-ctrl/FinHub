-- Fix: documents.status must match app contract (uploaded|under_review|approved|rejected)
-- Reason: previous migration accidentally removed "rejected" from the CHECK.

do $$
declare r record;
begin
  -- Drop any CHECK constraint on documents that looks like a status-in list (name may vary)
  for r in
    select conname
    from pg_constraint
    where conrelid = 'public.documents'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%status in (%'
  loop
    execute format('alter table public.documents drop constraint if exists %I', r.conname);
  end loop;

  -- Re-create canonical constraint name
  alter table public.documents
    add constraint documents_status_check
    check (status in ('uploaded','under_review','approved','rejected'));
exception
  when undefined_table then
    null;
end $$;

create index if not exists idx_documents_status on public.documents(status);
