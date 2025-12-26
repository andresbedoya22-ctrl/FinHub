-- Ensure documents.status check constraint matches app contract (idempotent-ish)
do $$
begin
  -- Drop common/expected constraint name if present
  alter table public.documents drop constraint if exists documents_status_check;

  -- Re-create with current allowed values
  alter table public.documents
    add constraint documents_status_check
    check (status in ('uploaded','under_review','approved'));
exception
  when undefined_table then
    -- If documents table doesn't exist yet (first migration order issues), ignore
    null;
end $$;
