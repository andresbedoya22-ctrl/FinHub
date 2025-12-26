-- Enforce: no avanzar a steps "post-checkout" sin pago (Stripe).
-- Aplica a: cases.step_key + case_step_data.step_key

create or replace function public.case_is_paid(p_case_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.payments p
    where p.case_id = p_case_id
      and p.status = 'paid'
  );
$$;

create or replace function public.enforce_case_paid_for_step()
returns trigger
language plpgsql
as $$
begin
  -- Solo nos importa cuando cambia step_key
  if tg_op = 'UPDATE' then
    if new.step_key is distinct from old.step_key then
      -- Steps bloqueados: todo lo que viene después de checkout
      if new.step_key in ('authorization','documents','review','intake','submission','done') then
        if not public.case_is_paid(new.id) then
          raise exception using
            errcode = 'P0001',
            message = 'case_not_paid: must be paid to proceed beyond checkout.';
        end if;
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_cases_require_payment_for_locked_steps on public.cases;
create trigger trg_cases_require_payment_for_locked_steps
before update of step_key on public.cases
for each row
execute function public.enforce_case_paid_for_step();

create or replace function public.enforce_case_step_data_paid()
returns trigger
language plpgsql
as $$
begin
  -- Evita escribir data de steps bloqueados si no está pagado
  if new.step_key in ('authorization','documents','review','intake','submission','done') then
    if not public.case_is_paid(new.case_id) then
      raise exception using
        errcode = 'P0001',
        message = 'case_not_paid: must be paid to write locked step data.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_case_step_data_require_payment_for_locked_steps on public.case_step_data;
create trigger trg_case_step_data_require_payment_for_locked_steps
before insert or update of step_key on public.case_step_data
for each row
execute function public.enforce_case_step_data_paid();
