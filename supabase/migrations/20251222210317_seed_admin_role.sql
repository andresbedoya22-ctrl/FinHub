-- Seed: make one user admin by email (idempotent)
-- NOTE: profiles.email may not exist. Use auth.users to resolve the id.

do $$
declare
  target_email text := 'andres.bedoya22@gmail.com';
  target_id uuid;
begin
  select u.id into target_id
  from auth.users u
  where lower(u.email) = lower(target_email)
  limit 1;

  if target_id is null then
    -- No user with that email in this environment. No-op (keeps migration safe for local dev).
    return;
  end if;

  update public.profiles
  set role = 'admin'
  where id = target_id;
end $$;