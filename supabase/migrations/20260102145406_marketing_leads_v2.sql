-- marketing_leads v2 (F02 hardening)
-- - add operational fields
-- - add consent scope/version
-- - enforce RLS: insert allowed, select denied publicly

alter table if exists public.marketing_leads
  add column if not exists status text not null default 'new',
  add column if not exists notes text null,
  add column if not exists consent_scope text not null default 'marketing_email',
  add column if not exists consent_version integer not null default 1;

-- Ensure RLS enabled
alter table if exists public.marketing_leads enable row level security;

-- Drop overly-permissive policies if they exist (best-effort)
do $$
begin
  if exists (select 1 from pg_policies where schemaname='public' and tablename='marketing_leads' and policyname='marketing_leads_select_public') then
    execute 'drop policy marketing_leads_select_public on public.marketing_leads';
  end if;
exception when others then
  -- ignore
end $$;

-- Policy: allow INSERT for anon (landing capture). No SELECT policy -> no public reads.
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='marketing_leads' and policyname='marketing_leads_insert_anon') then
    execute $p$
      create policy marketing_leads_insert_anon
      on public.marketing_leads
      for insert
      to anon
      with check (true)
    $p$;
  end if;
exception when others then
  -- ignore
end $$;
