-- Auto-generated migration: drop documents_admin_select_all to avoid potential RLS recursion
-- NOTE: This removes admin-wide SELECT; ownership policies remain unchanged.

alter table public.documents enable row level security;

drop policy if exists documents_admin_select_all on public.documents;

-- Show policies (informational when applying manually; harmless in migrations)
-- select policyname, cmd, roles, qual, with_check
-- from pg_policies
-- where schemaname='public' and tablename='documents'
-- order by policyname;
