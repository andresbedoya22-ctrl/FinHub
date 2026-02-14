# Lifecycle v1 Smoke Runbook

Phase: Fase 5 (F1/F2/F3)

## Scope
- Central lifecycle emitter in DB.
- Minimal campaigns:
  - `welcome`
  - `docs_missing`
  - `authorization_pending`
  - `case_update`
- Admin lifecycle panel with toggles, throttling, and basic metrics.

## Preconditions
1. Apply migration `supabase/migrations/20260213183000_lifecycle_v1.sql`.
2. Start app and login as admin.

## Happy Path
1. Open `/app/admin/lifecycle`.
2. Verify campaigns are listed.
3. Toggle one campaign off and on.
4. Change throttle value and blur input to save.
5. Register a new user (emits `welcome`).
6. Update a case status in app (emits `case_update`; may emit `authorization_pending` and `docs_missing`).
7. Return to `/app/admin/lifecycle` and refresh.
8. Verify metrics:
   - sent
   - throttled
   - disabled
   - activeUsers30

## Resilience
- If lifecycle tables are missing in DB/schema cache, app flow must not break:
  - register still works
  - case update still works
  - taxes intake still works
