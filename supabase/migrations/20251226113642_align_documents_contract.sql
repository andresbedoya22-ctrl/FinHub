-- Align documents contract across DB: status/type constraints + legacy value normalization (idempotent)
-- SAFETY: idempotent re-run (local init may re-apply partially)
alter table public.documents drop constraint if exists documents_status_check;
alter table public.documents drop constraint if exists documents_type_check;
-- Canonical statuses: uploaded | under_review | approved | rejected
-- Canonical types: id | income | bank | rental | tax | other

-- 1) Normalize legacy values (safe no-op if not present)
update public.documents
set status = case
  when status = 'pending' then 'uploaded'
  when status = 'ready' then 'under_review'
  when status = 'reviewed' then 'approved'
  else status
end
where status in ('pending','ready','reviewed');

update public.documents
set type = 'other'
where type = 'unknown';

-- 2) Drop existing CHECK constraints for status/type (unknown names)
do $$
declare r record;
begin
  for r in
    select conname
    from pg_constraint
    where conrelid = 'public.documents'::regclass
      and contype = 'c'
      and (
        pg_get_constraintdef(oid) ilike '%status in (%'
        or pg_get_constraintdef(oid) ilike '%type in (%'
      )
  loop
    execute format('alter table public.documents drop constraint if exists %I', r.conname);
  end loop;
end $$;

-- 3) Defaults aligned to frontend
alter table public.documents
  alter column status set default 'uploaded',
  alter column type set default 'other';

-- 4) Re-create constraints (single source of truth)
alter table public.documents
  add constraint documents_status_check
    check (status in ('uploaded','under_review','approved','rejected'));

alter table public.documents
  add constraint documents_type_check
    check (type in ('id','income','bank','rental','tax','other'));

-- 5) Useful indexes (idempotent)
create index if not exists idx_documents_type on public.documents(type);
create index if not exists idx_documents_status on public.documents(status);
