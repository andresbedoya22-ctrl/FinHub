-- a2_1_fix_case_documents_rls_stack_depth

create or replace function public.case_owner_id(p_case_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select user_id from public.cases where id = p_case_id
$$;

revoke all on function public.case_owner_id(uuid) from public;
grant execute on function public.case_owner_id(uuid) to authenticated;

-- Recreate case_documents policies to avoid RLS recursion

drop policy if exists case_documents_select_own on public.case_documents;
create policy case_documents_select_own on public.case_documents
for select using (
  public.case_owner_id(case_documents.case_id) = auth.uid()
);

drop policy if exists case_documents_insert_own on public.case_documents;
create policy case_documents_insert_own on public.case_documents
for insert with check (
  public.case_owner_id(case_documents.case_id) = auth.uid()
  and exists (
    select 1 from public.documents d
    where d.id = case_documents.document_id
      and d.user_id = auth.uid()
  )
  and status in ('uploaded','validating','rejected','validated')
  and synced_at is null
);

drop policy if exists case_documents_update_own on public.case_documents;
create policy case_documents_update_own on public.case_documents
for update using (
  public.case_owner_id(case_documents.case_id) = auth.uid()
)
with check (
  public.case_owner_id(case_documents.case_id) = auth.uid()
  and status in ('uploaded','validating','rejected','validated')
  and synced_at is null
);

drop policy if exists case_documents_delete_own on public.case_documents;
create policy case_documents_delete_own on public.case_documents
for delete using (
  public.case_owner_id(case_documents.case_id) = auth.uid()
);
