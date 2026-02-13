# Taxes Pro v1 Smoke Runbook

Scope: validate F13 baseline flow implemented in this repo.

## Preconditions
- App running (`pnpm dev`).
- Authenticated user session.
- Supabase env configured.

## Happy Path
1. Open `/app/taxes`.
2. Fill intake and save.
3. Verify case is created (button `Abrir caso` appears).
4. Verify checklist tasks are present.
5. Click `Autorizar servicio ahora`.
6. Click `Enviar caso a operación`.
7. Open case detail and verify status becomes `ready_for_review`.

## Resilience Checks
1. If `public.product_events` is missing from DB or schema cache, saving intake still succeeds.
2. If `public.external_refs` is missing, leadgen submit still succeeds.
3. i18n files pass UTF-8/mojibake check:
   - `pnpm i18n:check`

## Expected Result
- Taxes Pro flow is operable end-to-end without hard failure on optional observability tables.
