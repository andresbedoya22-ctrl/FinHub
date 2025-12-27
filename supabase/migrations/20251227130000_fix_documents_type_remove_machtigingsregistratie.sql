-- Fix: revert documents.type to canon (no 'machtigingsregistratie' value)
begin;

-- If any rows were created with the non-canon type, normalize them.
update public.documents
set type = 'tax'
where type = 'machtigingsregistratie';

-- Recreate CHECK constraint (idempotent-ish)
alter table public.documents drop constraint if exists documents_type_check;

alter table public.documents
add constraint documents_type_check
check (type in ('id','income','bank','rental','tax','other'));

commit;
