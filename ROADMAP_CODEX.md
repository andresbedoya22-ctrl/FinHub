# ROADMAP_CODEX â€” Plan de ejecuciÃ³n FinHub (Codex)

> Documento operativo para ejecutar el roadmap de producto/tecnologÃ­a en iteraciones pequeÃ±as y seguras.

## 0) Reglas de ejecuciÃ³n (Codex + VS Code)

### 0.1 Convenciones del repo (no romper)
- Sin lÃ³gica de negocio en `src/app`: solo pÃ¡ginas/composiciÃ³n.
- Dominio en `src/features/*`.
- i18n en `src/i18n/messages/{en,es,pl,ro}.json`.
- DB en `supabase/migrations/*` + RLS obligatorio para tablas nuevas.
- Stripe: extender flows/webhook existentes, no reinventar.

### 0.2 Definition of Done global (DoD)
Un item se considera DONE si cumple:
1. UI (ruta) + API (si aplica).
2. MigraciÃ³n + RLS + pruebas mÃ­nimas.
3. i18n en EN/ES/PL/RO para textos visibles.
4. Error handling consistente (UI + API).
5. `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` pasan.

### 0.3 Plantilla de â€œCodex Promptâ€

```text
PROMPT BASE
Contexto: â€œFinHub repo, Next.js App Router, dominios en src/features, Supabase, Stripe, Azure OCR. No lÃ³gica en src/app.â€
Objetivo: (1 frase)
Alcance: lista explÃ­cita (UI routes, API routes, DB, i18n, tests)
Restricciones:
- â€œEntrega archivos completos, no parches.â€
- â€œNo uses credenciales DigiD ni las solicites.â€
- â€œRespeta RLS.â€
DoD: (pegar 0.2)
Output esperado:
- Lista de archivos creados/modificados
- Migraciones aÃ±adidas
- Tests aÃ±adidos
- Comandos para validar
```

## 1) Estructura objetivo del producto (B2B2C vendible)

### 1.1 Principio operativo
- FinHub = portal inteligente (intake, validaciÃ³n, UX, automatizaciÃ³n).
- Elements = sistema operativo del backoffice (dossiers/tareas/documentos).
- Todo servicio produce un Case (dentro de FinHub) y se sincroniza con Elements.

### 1.2 Entidades nÃºcleo (mÃ­nimas)
- `cases` (tipo: toeslagen | taxes | mortgage | credit | insurance)
- `case_tasks` (sub-tareas: docs, autorizaciÃ³n, revisiÃ³n, envÃ­o)
- `case_documents` (estado: uploaded â†’ validated â†’ synced)
- `consents` (quÃ© autorizÃ³, cuÃ¡ndo, para quÃ©)
- `product_events` (telemetrÃ­a para lifecycle + Finny)

## 2) Estado actual del repo vs roadmap

### Ya implementado o avanzado
- A1 Case Engine v1 (DB, API y UI base de cases): **DONE**.
- A2 Document Pipeline v2 (upload + validate + attach por case): **DONE**.
- F11 Finanzas personales: **PARTIAL/DONE operativo**.
- F12 Subsidies/Toeslagen premium: **PARTIAL**.

### Parcial o pendiente
- A3 Consent + Authorization ledger: **DONE** (consent ledger por case, authorization_status y guard en transiciÃ³n a review).
- A4 Admin mÃ­nimo de operaciÃ³n (cola/filtros/SLA/notas): **DONE v1** (filtros, detalle por caso, tasks done/reopen, docs validados y notas internas).
- B1 IntegraciÃ³n Elements Connector v1: **DONE** (mÃ³dulo `src/features/integrations/elements/*` con OAuth2 client credentials, retries/backoff, env runtime validation y tests).
- B2 Sync con Elements (FinHubâ†’Elements): **DONE v1** (tabla `external_refs`, servicio idempotente de sync case/task/document y trigger en status de revisiÃ³n).
- B3 Sync inverso (Elementsâ†’FinHub): **DONE v1** (webhook receiver con actualizaciÃ³n de estado de cases y emisiÃ³n de `product_events`).
- C2/C3 contrataciÃ³n toeslagen + machtiging robusta: **parcial**.
- D1/D2 Taxes Pro: **pendiente**.
- E1/E2/E3 Mortgage/Credit/Insurance verticales: **pendiente**.
- F1/F2/F3 Lifecycle campaigns + events + admin: **pendiente**.
- G1/G2/G3 Finny premium gate + proactivity: **pendiente**.
- H1/H2/H3 Multi-tenant + compliance + observabilidad de negocio: **pendiente**.


### ActualizaciÃ³n de avance (ejecutado)
- âœ… A3 implementado en branch `feat/a3-consent-authorization-v1` con migraciÃ³n y APIs de consent.
- âœ… A4 v1 implementado con rutas admin operativas y migraciÃ³n `case_notes`.
- âœ… B1 implementado en branch `feat/b1-elements-connector-v1` con tests unitarios de refresh/retries y sanitizaciÃ³n de errores.
- âœ… B2 v1 implementado en branch `feat/b2-elements-sync-v1` con `external_refs`, sync idempotente y pruebas unitarias.
- âœ… B3 v1 implementado en branch `feat/b3-elements-reverse-sync-v1` con webhook receiver y eventos de lifecycle en DB.
- ðŸ”œ PrÃ³ximo bloque recomendado: C1 Intake Ãºnico Toeslagen + motor de elegibilidad.

## 3) Plan de trabajo detallado (orden recomendado)

## Sprint 0 â€” Baseline y hardening (2â€“3 dÃ­as)
1. Congelar baseline tÃ©cnico (inventario de rutas, mÃ³dulos, migraciones).
2. Alinear `docs/canon/*` y este roadmap.
3. AÃ±adir tablero de tracking con estados por bloque (A1..H3).
4. Cerrar gaps de DoD global (errores, i18n faltante, tests rotos si existen).

**Resultado:** base estable para acelerar sin regresiones.

## Sprint 1 â€” A3 Consent + Authorization v1 (3â€“5 dÃ­as)
1. DB: tabla `consents` + Ã­ndices + RLS por owner/case.
2. Modelo de estado: `authorization_status` en `cases`.
3. UI reusable: `ConsentCheckbox` + links tÃ©rminos + auditorÃ­a visible.
4. Gate funcional: impedir avanzar a `ready_for_review` sin consentimiento.
5. API y tests (unit + integraciÃ³n de casos felices y bloqueados).
6. i18n EN/ES/PL/RO.

**Resultado:** base legal-operativa para Toeslagen y Taxes.

## Sprint 2 â€” A4 Admin mÃ­nimo de operaciÃ³n (4â€“6 dÃ­as)
1. Rutas admin `cases` y `case detail` con filtros por estado/tipo/SLA.
2. `case_notes` (DB+RLS) + UI notas internas.
3. Marcar tasks done/undone con trazabilidad.
4. Vista de documentos validados.
5. Tests API admin + smoke UI.

**Resultado:** operaciÃ³n diaria real sin cuello de botella.

## Sprint 3 â€” B1 Elements Connector v1 (4â€“5 dÃ­as) âœ… COMPLETADO
1. `src/features/integrations/elements/*`.
2. OAuth2 client credentials + refresh seguro.
3. Wrapper HTTP tipado con retries/backoff e idempotency-key.
4. ValidaciÃ³n runtime de env vars `ELEMENTS_*`.
5. Tests unitarios (token refresh, retries, no logging secretos).

**Resultado:** infraestructura de integraciÃ³n lista para producciÃ³n.

_Estado ejecutado:_ implementado con cliente tipado, proveedor de token OAuth2 con refresh automÃ¡tico, wrapper HTTP con retry/backoff e idempotency-key, validaciÃ³n runtime de env y tests unitarios.

## Sprint 4 â€” B2 Sync FinHubâ†’Elements (4â€“6 dÃ­as) âœ… COMPLETADO (v1)
1. `external_refs` (DB+RLS) para mapeo idempotente.
2. Sync al crear/actualizar case (ready/paid).
3. Sync tasks y docs validados.
4. Reintentos seguros sin duplicar.
5. Pruebas de idempotencia + fallos transitorios.

**Resultado:** backoffice recibe trabajo consistente.

_Estado ejecutado:_ implementado con `external_refs` para idempotencia, sync de case/tasks/docs validados y trigger de sync al mover casos a estados de revisiÃ³n/envÃ­o.

_B3 v1 ejecutado:_ webhook receiver (`/api/integrations/elements/webhook`) para sync inverso de estado + persistencia de `product_events`.

## Sprint 5 â€” C1/C2 Toeslagen v3 end-to-end (5â€“8 dÃ­as)
1. Wizard Ãºnico `/app/toeslagen` + motor de elegibilidad dedicado.
2. Resultado con subsidios potenciales + CTA contrataciÃ³n.
3. Checkout Stripe existente â†’ creaciÃ³n inmediata de case toeslagen.
4. Tasks + checklist docs + preparaciÃ³n de sync.
5. Tests de elegibilidad (mÃ­nimo 3 por subsidio) + i18n total.

**Resultado:** vertical estrella lista y vendible.

## Sprint 6 â€” C3 + D2 mÃ³dulo de autorizaciÃ³n reusable (4â€“6 dÃ­as)
1. Extraer mÃ³dulo `src/features/authorization/*` reutilizable.
2. Reusar en Toeslagen y Taxes.
3. OCR carta/QR si aplica + parser activeringscode.
4. Estados `received/verified`.
5. Tests multi-flujo.

**Resultado:** autorizaciÃ³n estandarizada y mantenible.

## Sprint 7 â€” D1 Taxes Pro v1 (5â€“8 dÃ­as)
1. `/app/taxes` wizard.
2. Tax pack export (resumen + artefacto).
3. Crear case `taxes` + checklist docs + pipeline IA.
4. IntegraciÃ³n con mÃ³dulo authorization.
5. QA completo (RLS + i18n + errores).

**Resultado:** segunda vertical productiva con mismo backbone.

## Sprint 8 â€” E1/E2/E3 Verticales LeadGen operables (8â€“12 dÃ­as)
1. Mortgage intake â†’ case mortgage.
2. Credit intake â†’ case credit.
3. Insurance intake â†’ case insurance.
4. Todos con tracking `start/submit/abandon`.
5. Todos con docs checklist + sync-ready.

**Resultado:** expansiÃ³n comercial sin rediseÃ±ar arquitectura.

## Sprint 9 â€” F1/F2/F3 Lifecycle & product_events (5â€“7 dÃ­as)
1. `product_events` + emitter central.
2. Campaigns bÃ¡sicas: welcome, docs missing, authorization pending, case updated.
3. Admin lifecycle: activar/desactivar + mÃ©tricas mÃ­nimas.
4. Throttling/cooldowns y plantillas i18n.

**Resultado:** mejora de conversiÃ³n y reducciÃ³n de carga operativa.

## Sprint 10 â€” G1/G2/G3 Finny Gate + Proactivity (5â€“8 dÃ­as)
1. Finny Lite vs Premium gate.
2. Contexto por case/docs/estado para Premium.
3. Guardrails anti-spam y acciones sugeridas.
4. Triggers proactivos por eventos + quiet hours.

**Resultado:** asistente diferenciador con control de coste/riesgo.

## Sprint 11 â€” H1/H2/H3 Sell-ready (7â€“10 dÃ­as)
1. Multi-tenant (`tenants`, `tenant_members`, branding/config por tenant).
2. GDPR operativo (retention, export/delete completo).
3. Observabilidad de negocio (eventos crÃ­ticos + Sentry).
4. Checklist de compliance y handoff comercial.

**Resultado:** plataforma vendible fuera de Domek.

## 4) Backlog atÃ³mico de ejecuciÃ³n con Codex
Para cada bloque (A3, A4, B1...) usar secuencia fija:
1. Prompt de plan tÃ©cnico.
2. Prompt de implementaciÃ³n (archivos completos).
3. Prompt de pruebas.
4. Prompt de i18n.
5. Prompt de hardening (RLS/errores/edge cases).

## 5) Checklist de release por bloque
1. `pnpm lint`
2. `pnpm typecheck`
3. `pnpm test`
4. `pnpm build`
5. Revisar `supabase/migrations` ordenadas.
6. Revisar i18n EN/ES/PL/RO.
7. Smoke test manual del happy path.

## 6) PrÃ³ximo paso recomendado (ejecuciÃ³n)
Ejecutar **C1 (Toeslagen v3 intake Ãºnico + motor de elegibilidad)** para llevar el roadmap de integraciÃ³n a una vertical vendible end-to-end.

## 7) Reality Check (2026-02-12)

Semaforo de estado real (auditado contra codigo y checks):

- `DONE_REAL`: A1, A3, B1, B2(v1), B3(v1).
- `DONE_V1_CON_GAPS`: A2, A4.
- `PARTIAL_REAL`: F11, F12, C1.
- `PENDING_REAL`: C2, C3, D1, D2, E1, E2, E3, F1, F2, F3, G1, G2, G3, H1, H2, H3.

### Cierre Fase 0 (completado)

Objetivo: sincerar roadmap + cerrar gaps de A4 (i18n/tests).

Entregado:
- i18n de Admin Cases y Admin Case Detail en EN/ES/PL/RO.
- Pruebas de rutas admin (`/api/admin/cases` y `/api/admin/cases/[id]/tasks/[taskId]`).
- Verificacion de calidad: lint/typecheck/test/build.

### Cierre Fase 1 (completado)

Objetivo: C1 Toeslagen E2E vendible (intake -> case -> checkout).

Entregado:
- Endpoint `POST /api/toeslagen/contract-start`.
- Creacion de case `toeslagen` + checklist de tareas operativas.
- Persistencia de snapshot de intake/estimaciones en `case_step_data`.
- `src/app/toeslagen` conectado a contratacion real:
  - crea case,
  - inicia checkout (`/api/payments/checkout`),
  - redirige a Stripe.

Nota operativa:
- Si usuario no esta autenticado, el flujo redirige a login y luego permite reintentar desde `/toeslagen`.

## 8) Cierre Fase 7 (H1/H2/H3) - 2026-02-14

Entregado en v1:
- Multi-tenant base:
  - `tenants`, `tenant_members`.
  - `tenant_id` agregado a `cases`, `product_events`, `lifecycle_events`, `lifecycle_deliveries`.
  - Triggers de asignacion de `tenant_id` por `user_id`/`case_id`.
- GDPR operativo:
  - `gdpr_requests` y `gdpr_retention_policies`.
  - `GET /api/profile/export` y `POST /api/profile/delete` con auditoria (request/correlation ids).
  - `POST /api/admin/gdpr/retention/run` para ejecutar retencion.
- Observabilidad negocio:
  - `GET /api/admin/observability/business` (KPIs por tenant, ventana 30d).
  - Admin UI: `/app/admin/observability`, `/app/admin/tenants`, `/app/admin/gdpr`.

Evidencia:
- Migracion: `supabase/migrations/20260214123000_h1_h2_h3_sell_ready_v1.sql`.
- Runbook: `docs/runbooks/sell-ready-v1-smoke.md`.

## 9) Auditoria repo/docs (2026-02-14)

- Informe completo: `docs/reports/2026-02-14-roadmap-audit.md`.
- Hallazgo principal:
  - El roadmap/canon historico no reflejaba el estado real de fases 0-6 ya implementadas.
- Accion recomendada:
  - Regenerar `docs/repo-snapshots/*` y sincronizar `docs/canon/*` con el estado actual.
