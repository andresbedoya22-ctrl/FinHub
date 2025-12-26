begin;

do $$
declare
  v_user_id uuid := gen_random_uuid();
  v_case_id uuid := gen_random_uuid();
  v_err text;

  v_lang text := null;

  cols text := '';
  vals text := '';
  sep  text := '';
  r record;
  v_enum text;
begin
  -- Detecta un valor permitido para preferred_language desde el CHECK constraint
  select (regexp_matches(pg_get_constraintdef(c.oid), '''([^'']+)''', 'g'))[1]
  into v_lang
  from pg_constraint c
  where c.conrelid='public.profiles'::regclass
    and c.conname = 'profiles_preferred_language_check'
  limit 1;

  if v_lang is null then
    v_lang := 'nl';
  end if;

  -- 1) Crear profile dummy (satisface FK)
  begin
    insert into public.profiles (id, preferred_language)
    values (v_user_id, v_lang)
    on conflict (id) do nothing;
  exception when others then
    cols := '';
    vals := '';
    sep := '';

    for r in
      select
        column_name, is_nullable, column_default, data_type, udt_schema, udt_name
      from information_schema.columns
      where table_schema='public' and table_name='profiles'
      order by ordinal_position
    loop
      if r.column_name = 'id' then
        cols := cols || sep || quote_ident(r.column_name);
        vals := vals || sep || quote_literal(v_user_id);
        sep := ',';
        continue;
      end if;

      if r.column_default is not null then
        continue;
      end if;

      if r.is_nullable = 'YES' then
        continue;
      end if;

      cols := cols || sep || quote_ident(r.column_name);

      v_enum := null;
      select e.enumlabel into v_enum
      from pg_type t
      join pg_namespace n on n.oid = t.typnamespace
      join pg_enum e on e.enumtypid = t.oid
      where n.nspname = r.udt_schema
        and t.typname = r.udt_name
      order by e.enumsortorder
      limit 1;

      if v_enum is not null then
        vals := vals || sep || quote_literal(v_enum);

      elsif r.udt_schema = 'pg_catalog' and r.udt_name = 'uuid' then
        vals := vals || sep || 'gen_random_uuid()';

      elsif r.data_type in ('text','character varying') or r.data_type = 'USER-DEFINED' then
        if r.column_name = 'role' then
          vals := vals || sep || quote_literal('user');
        elsif r.column_name in ('preferred_language','language','locale') then
          vals := vals || sep || quote_literal(v_lang);
        else
          vals := vals || sep || quote_literal('test');
        end if;

      elsif r.data_type = 'boolean' then
        vals := vals || sep || 'false';

      elsif r.data_type in ('smallint','integer','bigint','numeric','real','double precision') then
        vals := vals || sep || '0';

      elsif r.data_type = 'jsonb' then
        vals := vals || sep || '''{}''::jsonb';

      elsif r.data_type like 'timestamp%' then
        vals := vals || sep || 'now()';

      elsif r.data_type = 'date' then
        vals := vals || sep || 'current_date';

      else
        vals := vals || sep || quote_literal('test');
      end if;

      sep := ',';
    end loop;

    execute format('insert into public.profiles (%s) values (%s) on conflict (id) do nothing', cols, vals);
  end;

  -- 2) Crear caso en checkout (sin pago)
  insert into public.cases (id, user_id, type, title, status, step_key, steps_json)
  values (v_case_id, v_user_id, 'toeslag_zorg', 'TEST Paid Gate', 'created', 'checkout', '[]'::jsonb);

  -- 3) Intento de escribir data en step bloqueado (debe FALLAR)
  begin
    insert into public.case_step_data (case_id, step_key, data)
    values (v_case_id, 'documents', '{}'::jsonb);

    raise exception 'FAILED: case_step_data insert should have been blocked (not paid).';
  exception when others then
    v_err := sqlerrm;
    raise notice 'OK (expected): blocked case_step_data before paid. Error: %', v_err;
  end;

  -- 4) Intento de avanzar step_key a bloqueado (debe FALLAR)
  begin
    update public.cases set step_key = 'documents' where id = v_case_id;

    raise exception 'FAILED: cases.step_key update should have been blocked (not paid).';
  exception when others then
    v_err := sqlerrm;
    raise notice 'OK (expected): blocked cases.step_key before paid. Error: %', v_err;
  end;

  -- 5) Insertar pago PAID
  insert into public.payments (user_id, case_id, provider, status, amount_cents, currency)
  values (v_user_id, v_case_id, 'stripe', 'paid', 100, 'EUR');

  -- 6) Ahora sí debe permitir escribir data de step bloqueado
  insert into public.case_step_data (case_id, step_key, data)
  values (v_case_id, 'documents', '{"ok": true}'::jsonb);

  -- 7) Ahora sí debe permitir avanzar step_key
  update public.cases set step_key = 'documents' where id = v_case_id;

  raise notice 'PASS: Paid gate works. preferred_language=%, user_id=%, case_id=%', v_lang, v_user_id, v_case_id;
end $$;

rollback;