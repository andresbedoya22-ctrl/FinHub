# Sell-ready v1 Smoke (Fase 7 H1/H2/H3)

## Objetivo
Validar que multi-tenant, GDPR operativo y observabilidad negocio están activos en el stack.

## Prerrequisitos
1. Aplicar migración: `supabase/migrations/20260214123000_h1_h2_h3_sell_ready_v1.sql`.
2. Tener usuario admin autenticado.
3. Variables Supabase configuradas en `.env.local`.

## Smoke test
1. Abrir `/app/admin/tenants`.
2. Verificar que existe al menos un tenant (`finhub-default`) y conteos de miembros.
3. Abrir `/app/admin/observability`.
4. Verificar tabla de KPIs por tenant (members/cases/events/GDPR).
5. Abrir `/app/admin/gdpr`.
6. Ejecutar `Run retention now`.
7. Verificar respuesta sin error y resumen con contadores.
8. Probar `GET /api/profile/export` autenticado:
   - Debe responder `ok: true`.
   - Debe incluir `requestId` y `correlationId` cuando `tenant_id` está disponible.
9. Probar `POST /api/profile/delete` con body `{ "confirm": true }` en entorno de pruebas:
   - Debe responder `ok: true`.
   - Debe incluir `requestId`/`correlationId` y resultados por tabla.

## Validación técnica
1. `pnpm lint`
2. `pnpm typecheck`
3. `pnpm test`
4. `pnpm build`

## Criterio de salida
- Multi-tenant: tablas `tenants`/`tenant_members` y `tenant_id` en entidades operativas.
- GDPR: requests auditados (`gdpr_requests`) + retención ejecutable.
- Observabilidad: endpoint admin y vista UI de negocio por tenant.
