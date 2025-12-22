-- Seed: make one user admin by email (idempotent)
update public.profiles
set role = 'admin'
where email = 'andres.bedoya22@gmail.com';