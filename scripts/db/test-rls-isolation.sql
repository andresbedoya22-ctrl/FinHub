begin;

do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  a_case_id uuid;
  v_count int;
  v_err text;
begin
  -- Seed bajo postgres (bypass RLS): crea A/B y un case de A
  insert into public.profiles (id, preferred_language)
  values (a, 'ES'), (b, 'ES')
  on conflict (id) do nothing;

  insert into public.cases (user_id, type, title, status, step_key, steps_json)
  values (a, 'toeslag_zorg', 'A-case', 'created', 'checkout', '[]'::jsonb)
  returning id into a_case_id;

  -- Impersonar B como authenticated (simula JWT)
  perform set_config('request.jwt.claim.sub', a::text, true); -- limpia posibles residuos
  perform set_config('request.jwt.claim.sub', b::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;

  -- 1) B NO debe ver cases de A
  select count(*) into v_count from public.cases;
  if v_count <> 0 then
    raise exception 'RLS FAIL: B can see % case(s)', v_count;
  end if;
  raise notice 'OK: B sees 0 cases';

  -- 2) B NO debe poder actualizar el case de A (debe afectar 0 filas)
  update public.cases set title = 'HACKED_BY_B' where id = a_case_id;
  get diagnostics v_count = row_count;
  if v_count <> 0 then
    raise exception 'RLS FAIL: B updated A case (row_count=%)', v_count;
  end if;
  raise notice 'OK: B cannot update A case (0 rows)';

  -- 3) B NO debe poder borrar el case de A (0 filas)
  delete from public.cases where id = a_case_id;
  get diagnostics v_count = row_count;
  if v_count <> 0 then
    raise exception 'RLS FAIL: B deleted A case (row_count=%)', v_count;
  end if;
  raise notice 'OK: B cannot delete A case (0 rows)';

  -- 4) B NO debe poder insertar un case con user_id=A (debe dar error por WITH CHECK)
  begin
    insert into public.cases (user_id, type, title, status, step_key, steps_json)
    values (a, 'toeslag_zorg', 'ILLEGAL', 'created', 'checkout', '[]'::jsonb);

    raise exception 'RLS FAIL: B inserted case for A (should be blocked)';
  exception when others then
    v_err := sqlerrm;
    raise notice 'OK (expected): cannot insert case for A. Error: %', v_err;
  end;

  raise notice 'PASS: RLS isolation works. A=%, B=%', a, b;
end $$;

rollback;