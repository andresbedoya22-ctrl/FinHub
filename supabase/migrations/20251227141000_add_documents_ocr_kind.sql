-- Adds explicit OCR intent on documents (separate from DocumentType)

alter table public.documents
  add column if not exists ocr_kind text null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'documents_ocr_kind_check'
  ) then
    alter table public.documents
      add constraint documents_ocr_kind_check
      check (ocr_kind is null or ocr_kind in ('machtigingsregistratie'));
  end if;
end $$;

create index if not exists documents_ocr_kind_idx on public.documents (ocr_kind);