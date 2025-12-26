-- Ensure step_key checks include 'start' for fresh DBs.
-- This runs AFTER schema_v1, so tables exist.

alter table if exists public.cases
  drop constraint if exists cases_step_key_check;

alter table if exists public.cases
  add constraint cases_step_key_check
  check (step_key in (
    'start',
    'eligibility','result','checkout','authorization','documents','review',
    'intake','submission','done'
  ));

alter table if exists public.case_step_data
  drop constraint if exists case_step_data_step_key_check;

alter table if exists public.case_step_data
  add constraint case_step_data_step_key_check
  check (step_key in (
    'start',
    'eligibility','result','checkout','authorization','documents','review',
    'intake','submission','done'
  ));
