-- Auto-generated migration: allow 'machtigingsregistratie' in public.documents.type
-- Original constraint:
-- CHECK ((type = ANY (ARRAY['id'::text, 'income'::text, 'bank'::text, 'rental'::text, 'tax'::text, 'other'::text])))
ALTER TABLE public.documents DROP CONSTRAINT IF EXISTS documents_type_check;
ALTER TABLE public.documents ADD CONSTRAINT documents_type_check CHECK ((type = ANY (ARRAY['id'::text, 'income'::text, 'bank'::text, 'rental'::text, 'tax'::text, 'other'::text, 'machtigingsregistratie'::text])));
