# Subsidies applications DB setup

This fixes the `public.subsidies_applications` table missing error and enables the Subsidies checkout flow.

## Migrations
- `supabase/migrations/20260113101000_subsidies_v1.sql`
  - Creates `subsidies_applications`, `subsidies_documents`, `subsidies_admin_notes`, and `subsidies_policy`.
  - Enables RLS and adds policies for user ownership + admin access.
- `supabase/migrations/20260113102000_storage_subsidies_bucket.sql`
  - Creates the `subsidies` storage bucket and owner-only policies.

## Apply locally
1. `supabase db reset`
   - or `supabase migration up` if you want to preserve data.
2. Restart the local Supabase stack to refresh the schema cache.
3. (Optional) Regenerate types if you use them: `supabase gen types typescript --local > src/types/supabase.ts`.

## Apply in hosted Supabase
1. Apply the new migrations using your CI/CLI flow.
2. Refresh the PostgREST schema cache:
   - Supabase Dashboard → Settings → API → Reload schema cache, or
   - `supabase db remote commit` (if your workflow already reloads the cache).
3. Verify RLS policies by inserting/reading a test `subsidies_applications` row with a user session.
