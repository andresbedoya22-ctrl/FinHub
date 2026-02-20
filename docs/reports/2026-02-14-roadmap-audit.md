# Auditoria Roadmap + Canon (2026-02-14)

## Resumen ejecutivo
- Fase 7 (H1/H2/H3) implementada en v1:
  - Multi-tenant base (`tenants`, `tenant_members`, `tenant_id` en casos/eventos/lifecycle).
  - GDPR operativo (`gdpr_requests`, `gdpr_retention_policies`, export/delete auditables, retention run admin).
  - Observabilidad negocio por tenant (API + UI admin).
- Roadmap previo estaba desactualizado respecto al código real de fases 0-6.

## Evidencia de implementación (esta iteración)
- Migración:
  - `supabase/migrations/20260214123000_h1_h2_h3_sell_ready_v1.sql`
- APIs:
  - `src/app/api/admin/tenants/route.ts`
  - `src/app/api/admin/observability/business/route.ts`
  - `src/app/api/admin/gdpr/retention/run/route.ts`
  - `src/app/api/profile/export/route.ts` (audit GDPR)
  - `src/app/api/profile/delete/route.ts` (audit GDPR)
- Servicios:
  - `src/features/tenant/tenantService.ts`
  - `src/features/observability/businessMetricsService.ts`
- UI admin:
  - `src/app/(dashboard)/app/admin/tenants/page.tsx`
  - `src/app/(dashboard)/app/admin/observability/page.tsx`
  - `src/app/(dashboard)/app/admin/gdpr/page.tsx`
  - `src/app/(dashboard)/app/admin/page.tsx` (tiles nuevas)
- Runbook:
  - `docs/runbooks/sell-ready-v1-smoke.md`

## Estado real por bloques del roadmap
- Cerrado: Fase 0, Fase 1, Fase 2, Fase 3, Fase 4, Fase 5, Fase 6, Fase 7 (v1).
- Pendientes para “sell-ready completo enterprise”:
  - SSO/SAML por tenant (no implementado).
  - Branding por tenant en frontend (solo campo `config`, sin theme runtime).
  - Facturación B2B por tenant (no implementado).
  - Data residency/region pinning (no implementado).
  - Jobs asíncronos de retención (actualmente trigger manual API admin).
  - DSAR export completo en formato firmado/portable (actualmente JSON best-effort).

## Revisión de docs/canon
- `ROADMAP_CODEX.md`: desalineado en varias fases marcadas como pendientes cuando ya existen en código.
- `docs/canon/*`: describe snapshot histórico (enero 2026), no el estado actual de febrero 2026.
- Recomendación:
  - Regenerar snapshot `docs/repo-snapshots/*` con estado actual.
  - Actualizar `docs/canon/00..03` usando el snapshot nuevo.
  - Mantener un “reality check” con fecha y commit SHA en cada fase cerrada.

## Riesgos actuales
- Algunas capacidades dependen de migraciones nuevas en Supabase; si no se aplican, hay degradación a modo legacy.
- GDPR delete sigue siendo best-effort por heterogeneidad de tablas históricas.
- Métricas negocio están agregadas en tiempo real sin job ETL (correcto para v1, no ideal para escala alta).
