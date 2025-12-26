-- RLS OCR isolation test (documents + document_ocr_runs + document_extractions + document_reviews)
-- Goal:
-- - User A can see own OCR data
-- - User B cannot see A OCR data (0 rows)
-- - Admin policy is not used here (profiles.role defaults to 'user')

begin;

-- Helpers: set authenticated context by JWT claims
create or replace function public.__test_set_auth(uid uuid)
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid::text, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end $$;

do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  doc_a uuid;
  run_a uuid;
  ext_a uuid;
  rev_a uuid;
  cnt int;
begin
  -- Create profiles for A/B if not present (safe)
  insert into public.profiles (id, preferred_language, created_at, updated_at)
  values (a, 'ES', now(), now())
  on conflict (id) do nothing;

  insert into public.profiles (id, preferred_language, created_at, updated_at)
  values (b, 'ES', now(), now())
  on conflict (id) do nothing;

  -- Act as A
  perform public.__test_set_auth(a);

  -- Create a document for A (type must be allowed; status must be allowed)
  insert into public.documents (user_id, case_id, file_name, type, status, notes, storage_path, created_at, updated_at)
  values (a, null, 'machtigingsregistratie_test.pdf', 'machtigingsregistratie', 'uploaded', 'rls-ocr-test', a::text || '/test.pdf', now(), now())
  returning id into doc_a;

  -- Create OCR run
  insert into public.document_ocr_runs (document_id, user_id, provider, status, raw_text, raw_json, error, created_at, updated_at)
  values (doc_a, a, 'mock', 'succeeded', '', '{}'::jsonb, null, now(), now())
  returning id into run_a;

  -- Create extraction
  insert into public.document_extractions (document_id, run_id, user_id, extraction_type, schema_version, fields, needs_review, confidence, created_at, updated_at)
  values (doc_a, run_a, a, 'machtigingsregistratie', 1, jsonb_build_object('example', true), true, null, now(), now())
  returning id into ext_a;

  -- Create review event
  insert into public.document_reviews (document_id, user_id, actor_id, actor_role, action, payload, created_at)
  values (doc_a, a, a, 'user', 'ocr_requested', jsonb_build_object('provider','mock'), now())
  returning id into rev_a;

  -- A can see own rows
  select count(*) into cnt from public.document_ocr_runs where document_id = doc_a;
  if cnt <> 1 then raise exception 'Expected A to see 1 ocr_run, saw %', cnt; end if;

  select count(*) into cnt from public.document_extractions where document_id = doc_a;
  if cnt <> 1 then raise exception 'Expected A to see 1 extraction, saw %', cnt; end if;

  select count(*) into cnt from public.document_reviews where document_id = doc_a;
  if cnt <> 1 then raise exception 'Expected A to see 1 review, saw %', cnt; end if;

  raise notice 'OK: A sees own OCR rows';

  -- Act as B
  perform public.__test_set_auth(b);

  select count(*) into cnt from public.documents where id = doc_a;
  if cnt <> 0 then raise exception 'Expected B to see 0 documents of A, saw %', cnt; end if;

  select count(*) into cnt from public.document_ocr_runs where document_id = doc_a;
  if cnt <> 0 then raise exception 'Expected B to see 0 ocr_runs of A, saw %', cnt; end if;

  select count(*) into cnt from public.document_extractions where document_id = doc_a;
  if cnt <> 0 then raise exception 'Expected B to see 0 extractions of A, saw %', cnt; end if;

  select count(*) into cnt from public.document_reviews where document_id = doc_a;
  if cnt <> 0 then raise exception 'Expected B to see 0 reviews of A, saw %', cnt; end if;

  raise notice 'OK: B sees 0 OCR rows for A';

end $$;

rollback;