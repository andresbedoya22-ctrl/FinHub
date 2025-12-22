-- Expand allowed step_key values to match app routing
alter table if exists public.case_step_data
  drop constraint if exists case_step_data_step_key_check;

alter table public.case_step_data
  add constraint case_step_data_step_key_check
  check (step_key in (
    'start',
    'eligibility','result','checkout','authorization','documents','review',
    'intake','submission','done'
  ));