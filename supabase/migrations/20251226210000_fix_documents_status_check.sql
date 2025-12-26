-- Fix: documents.status must match app contract (uploaded|under_review|approved|rejected)
-- Reason: previous migration accidentally removed "rejected" from the CHECK.
-- Idempotent: safe to re-run even if constraint already exists.

do $$
declare r record;
begin
  -- If table doesn't exist yet, no-op
  begin
    execute 'alter table public.documents drop constraint if exists documents_status_check';
  exception
    when undefined_table then
      return;
  end;

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

  -- Re-create canonical constraint name (ignore if already exists)
  begin
    execute $q$
      alter table public.documents
        add constraint documents_status_check
        check (status in ('uploaded','under_review','approved','rejected'))
    $q$;
  exception
    when duplicate_object then
      null;
  end;
end $$;

create index if not exists idx_documents_status on public.documents(status);