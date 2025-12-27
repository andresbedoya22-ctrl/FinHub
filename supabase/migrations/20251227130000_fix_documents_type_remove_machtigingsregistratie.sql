-- Fix: revert documents.type to canon (no 'machtigingsregistratie' value)

-- Safety: if any row still has the old type, normalize it.
update public.documents
set type = 'other'
where type = 'machtigingsregistratie';

-- Recreate constraint deterministically (idempotent)
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'documents_type_check'
  ) then
    alter table public.documents
      drop constraint documents_type_check;
  end if;
end $$;

alter table public.documents
  add constraint documents_type_check
  check (type in ('id','income','bank','rental','tax','other'));

create index if not exists idx_documents_type on public.documents (type);