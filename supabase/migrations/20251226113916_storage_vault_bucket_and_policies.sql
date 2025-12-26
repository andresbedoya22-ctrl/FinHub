-- Create Storage bucket 'vault' and owner-only RLS policies (idempotent)
-- Assumption: object name format is "{userId}/...." where userId = auth.uid()

-- 1) Bucket (private)
insert into storage.buckets (id, name, public)
values ('vault', 'vault', false)
on conflict (id) do nothing;

-- 2) Policies on storage.objects for bucket 'vault'
-- NOTE: storage.objects already has RLS enabled in Supabase.

-- Read: owner OR admin
drop policy if exists vault_objects_select_own on storage.objects;
create policy vault_objects_select_own
on storage.objects
for select
to authenticated
using (
  bucket_id = 'vault'
  and (
    split_part(name, '/', 1) = auth.uid()::text
    or public.is_admin()
  )
);

-- Insert: owner-only (path must start with auth.uid())
drop policy if exists vault_objects_insert_own on storage.objects;
create policy vault_objects_insert_own
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'vault'
  and split_part(name, '/', 1) = auth.uid()::text
);

-- Update: owner-only
drop policy if exists vault_objects_update_own on storage.objects;
create policy vault_objects_update_own
on storage.objects
for update
to authenticated
using (
  bucket_id = 'vault'
  and split_part(name, '/', 1) = auth.uid()::text
)
with check (
  bucket_id = 'vault'
  and split_part(name, '/', 1) = auth.uid()::text
);

-- Delete: owner-only
drop policy if exists vault_objects_delete_own on storage.objects;
create policy vault_objects_delete_own
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'vault'
  and split_part(name, '/', 1) = auth.uid()::text
);
