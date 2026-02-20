-- Fase 7 (H1/H2/H3) - Sell-ready v1
-- Multi-tenant base + GDPR operativo + observabilidad negocio por tenant.

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  status text not null default 'active' check (status in ('active', 'suspended')),
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tenants_slug_len check (char_length(slug) >= 3),
  constraint tenants_name_len check (char_length(name) >= 2)
);

create table if not exists public.tenant_members (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'agent' check (role in ('owner', 'admin', 'agent', 'viewer')),
  status text not null default 'active' check (status in ('active', 'invited', 'suspended')),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_tenant_members unique (tenant_id, user_id)
);

create index if not exists idx_tenant_members_user_status_default
  on public.tenant_members(user_id, status, is_default desc, created_at desc);

create index if not exists idx_tenant_members_tenant_status
  on public.tenant_members(tenant_id, status, role);

with default_tenant as (
  insert into public.tenants (slug, name)
  values ('finhub-default', 'FinHub Default Tenant')
  on conflict (slug) do update set name = excluded.name, updated_at = now()
  returning id
)
insert into public.tenant_members (tenant_id, user_id, role, status, is_default)
select
  dt.id,
  p.id,
  case when p.role = 'admin' then 'admin' else 'agent' end,
  'active',
  true
from public.profiles p
cross join default_tenant dt
on conflict (tenant_id, user_id) do update
set
  status = excluded.status,
  is_default = true,
  updated_at = now();

create or replace function public.is_tenant_member(target_tenant uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.tenant_members tm
    where tm.tenant_id = target_tenant
      and tm.user_id = auth.uid()
      and tm.status = 'active'
  );
$$;

create or replace function public.is_tenant_admin(target_tenant uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.tenant_members tm
    where tm.tenant_id = target_tenant
      and tm.user_id = auth.uid()
      and tm.status = 'active'
      and tm.role in ('owner', 'admin')
  );
$$;

alter table if exists public.cases
  add column if not exists tenant_id uuid references public.tenants(id) on delete set null;

alter table if exists public.product_events
  add column if not exists tenant_id uuid references public.tenants(id) on delete set null;

alter table if exists public.lifecycle_events
  add column if not exists tenant_id uuid references public.tenants(id) on delete set null;

alter table if exists public.lifecycle_deliveries
  add column if not exists tenant_id uuid references public.tenants(id) on delete set null;

create index if not exists idx_cases_tenant_updated
  on public.cases(tenant_id, updated_at desc);

create index if not exists idx_product_events_tenant_occurred
  on public.product_events(tenant_id, occurred_at desc);

create index if not exists idx_lifecycle_events_tenant_emitted
  on public.lifecycle_events(tenant_id, emitted_at desc);

create index if not exists idx_lifecycle_deliveries_tenant_created
  on public.lifecycle_deliveries(tenant_id, created_at desc);

update public.cases c
set tenant_id = tm.tenant_id
from public.tenant_members tm
where c.tenant_id is null
  and tm.user_id = c.user_id
  and tm.status = 'active'
  and tm.is_default = true;

update public.product_events e
set tenant_id = c.tenant_id
from public.cases c
where e.tenant_id is null
  and e.case_id = c.id;

update public.product_events e
set tenant_id = tm.tenant_id
from public.tenant_members tm
where e.tenant_id is null
  and e.user_id = tm.user_id
  and tm.status = 'active'
  and tm.is_default = true;

update public.lifecycle_events e
set tenant_id = c.tenant_id
from public.cases c
where e.tenant_id is null
  and e.case_id = c.id;

update public.lifecycle_events e
set tenant_id = tm.tenant_id
from public.tenant_members tm
where e.tenant_id is null
  and e.user_id = tm.user_id
  and tm.status = 'active'
  and tm.is_default = true;

update public.lifecycle_deliveries d
set tenant_id = c.tenant_id
from public.cases c
where d.tenant_id is null
  and d.case_id = c.id;

update public.lifecycle_deliveries d
set tenant_id = tm.tenant_id
from public.tenant_members tm
where d.tenant_id is null
  and d.user_id = tm.user_id
  and tm.status = 'active'
  and tm.is_default = true;

create or replace function public.assign_case_tenant_from_member()
returns trigger
language plpgsql
as $$
begin
  if new.tenant_id is null and new.user_id is not null then
    select tm.tenant_id
      into new.tenant_id
    from public.tenant_members tm
    where tm.user_id = new.user_id
      and tm.status = 'active'
    order by tm.is_default desc, tm.created_at asc
    limit 1;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_assign_case_tenant on public.cases;
create trigger trg_assign_case_tenant
before insert or update of user_id, tenant_id
on public.cases
for each row
execute function public.assign_case_tenant_from_member();

create or replace function public.assign_event_tenant()
returns trigger
language plpgsql
as $$
begin
  if new.tenant_id is null and new.case_id is not null then
    select c.tenant_id into new.tenant_id
    from public.cases c
    where c.id = new.case_id
    limit 1;
  end if;

  if new.tenant_id is null and new.user_id is not null then
    select tm.tenant_id into new.tenant_id
    from public.tenant_members tm
    where tm.user_id = new.user_id
      and tm.status = 'active'
    order by tm.is_default desc, tm.created_at asc
    limit 1;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_assign_product_event_tenant on public.product_events;
create trigger trg_assign_product_event_tenant
before insert or update of user_id, case_id, tenant_id
on public.product_events
for each row
execute function public.assign_event_tenant();

drop trigger if exists trg_assign_lifecycle_event_tenant on public.lifecycle_events;
create trigger trg_assign_lifecycle_event_tenant
before insert or update of user_id, case_id, tenant_id
on public.lifecycle_events
for each row
execute function public.assign_event_tenant();

drop trigger if exists trg_assign_lifecycle_delivery_tenant on public.lifecycle_deliveries;
create trigger trg_assign_lifecycle_delivery_tenant
before insert or update of user_id, case_id, tenant_id
on public.lifecycle_deliveries
for each row
execute function public.assign_event_tenant();

alter table if exists public.tenants enable row level security;
alter table if exists public.tenant_members enable row level security;

drop policy if exists tenants_select_member_or_admin on public.tenants;
create policy tenants_select_member_or_admin
on public.tenants
for select
to authenticated
using (public.is_admin() or public.is_tenant_member(id));

drop policy if exists tenants_write_service on public.tenants;
create policy tenants_write_service
on public.tenants
for all
to authenticated
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists tenant_members_select_own_or_tenant_admin on public.tenant_members;
create policy tenant_members_select_own_or_tenant_admin
on public.tenant_members
for select
to authenticated
using (
  public.is_admin()
  or user_id = auth.uid()
  or public.is_tenant_admin(tenant_id)
);

drop policy if exists tenant_members_write_service on public.tenant_members;
create policy tenant_members_write_service
on public.tenant_members
for all
to authenticated
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists cases_select_tenant_member on public.cases;
create policy cases_select_tenant_member
on public.cases
for select
to authenticated
using (
  tenant_id is not null
  and public.is_tenant_member(tenant_id)
);

drop policy if exists cases_update_tenant_admin on public.cases;
create policy cases_update_tenant_admin
on public.cases
for update
to authenticated
using (
  tenant_id is not null
  and public.is_tenant_admin(tenant_id)
)
with check (
  tenant_id is not null
  and public.is_tenant_admin(tenant_id)
);

drop policy if exists product_events_select_tenant_member on public.product_events;
create policy product_events_select_tenant_member
on public.product_events
for select
to authenticated
using (
  tenant_id is not null
  and public.is_tenant_member(tenant_id)
);

create table if not exists public.gdpr_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  request_type text not null check (request_type in ('export', 'delete')),
  status text not null default 'requested' check (status in ('requested', 'processing', 'completed', 'failed')),
  correlation_id text not null,
  result_meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz null
);

create index if not exists idx_gdpr_requests_tenant_created
  on public.gdpr_requests(tenant_id, created_at desc);

create index if not exists idx_gdpr_requests_user_created
  on public.gdpr_requests(user_id, created_at desc);

create table if not exists public.gdpr_retention_policies (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  enabled boolean not null default true,
  retention_days integer not null default 365 check (retention_days between 30 and 3650),
  delete_grace_days integer not null default 30 check (delete_grace_days between 1 and 365),
  updated_at timestamptz not null default now()
);

insert into public.gdpr_retention_policies (tenant_id, enabled, retention_days, delete_grace_days)
select t.id, true, 365, 30
from public.tenants t
where t.slug = 'finhub-default'
on conflict (tenant_id) do update
set
  enabled = excluded.enabled,
  updated_at = now();

alter table if exists public.gdpr_requests enable row level security;
alter table if exists public.gdpr_retention_policies enable row level security;

drop policy if exists gdpr_requests_select_own_or_tenant_admin on public.gdpr_requests;
create policy gdpr_requests_select_own_or_tenant_admin
on public.gdpr_requests
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_admin()
  or public.is_tenant_admin(tenant_id)
);

drop policy if exists gdpr_requests_write_service on public.gdpr_requests;
create policy gdpr_requests_write_service
on public.gdpr_requests
for all
to authenticated
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists gdpr_retention_select_tenant_admin on public.gdpr_retention_policies;
create policy gdpr_retention_select_tenant_admin
on public.gdpr_retention_policies
for select
to authenticated
using (public.is_admin() or public.is_tenant_admin(tenant_id));

drop policy if exists gdpr_retention_write_service on public.gdpr_retention_policies;
create policy gdpr_retention_write_service
on public.gdpr_retention_policies
for all
to authenticated
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
