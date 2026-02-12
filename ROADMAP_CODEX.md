# ROADMAP_CODEX — Plan de ejecución FinHub (Codex)

> Documento operativo para ejecutar el roadmap de producto/tecnología en iteraciones pequeñas y seguras.

## 0) Reglas de ejecución (Codex + VS Code)

### 0.1 Convenciones del repo (no romper)
- Sin lógica de negocio en `src/app`: solo páginas/composición.
- Dominio en `src/features/*`.
- i18n en `src/i18n/messages/{en,es,pl,ro}.json`.
- DB en `supabase/migrations/*` + RLS obligatorio para tablas nuevas.
- Stripe: extender flows/webhook existentes, no reinventar.

### 0.2 Definition of Done global (DoD)
Un item se considera DONE si cumple:
1. UI (ruta) + API (si aplica).
2. Migración + RLS + pruebas mínimas.
3. i18n en EN/ES/PL/RO para textos visibles.
4. Error handling consistente (UI + API).
5. `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` pasan.

### 0.3 Plantilla de “Codex Prompt”

```text
PROMPT BASE
Contexto: “FinHub repo, Next.js App Router, dominios en src/features, Supabase, Stripe, Azure OCR. No lógica en src/app.”
Objetivo: (1 frase)
Alcance: lista explícita (UI routes, API routes, DB, i18n, tests)
Restricciones:
- “Entrega archivos completos, no parches.”
- “No uses credenciales DigiD ni las solicites.”
- “Respeta RLS.”
DoD: (pegar 0.2)
Output esperado:
- Lista de archivos creados/modificados
- Migraciones añadidas
- Tests añadidos
- Comandos para validar
```

## 1) Estructura objetivo del producto (B2B2C vendible)

### 1.1 Principio operativo
- FinHub = portal inteligente (intake, validación, UX, automatización).
- Elements = sistema operativo del backoffice (dossiers/tareas/documentos).
- Todo servicio produce un Case (dentro de FinHub) y se sincroniza con Elements.

### 1.2 Entidades núcleo (mínimas)
- `cases` (tipo: toeslagen | taxes | mortgage | credit | insurance)
- `case_tasks` (sub-tareas: docs, autorización, revisión, envío)
- `case_documents` (estado: uploaded → validated → synced)
- `consents` (qué autorizó, cuándo, para qué)
- `product_events` (telemetría para lifecycle + Finny)

## 2) Estado actual del repo vs roadmap

### Ya implementado o avanzado
- A1 Case Engine v1 (DB, API y UI base de cases): **DONE**.
- A2 Document Pipeline v2 (upload + validate + attach por case): **DONE**.
- F11 Finanzas personales: **PARTIAL/DONE operativo**.
- F12 Subsidies/Toeslagen premium: **PARTIAL**.

### Parcial o pendiente
- A3 Consent + Authorization ledger: **DONE** (consent ledger por case, authorization_status y guard en transición a review).
- A4 Admin mínimo de operación (cola/filtros/SLA/notas): **DONE v1** (filtros, detalle por caso, tasks done/reopen, docs validados y notas internas).
- B1 Integración Elements Connector v1: **DONE** (módulo `src/features/integrations/elements/*` con OAuth2 client credentials, retries/backoff, env runtime validation y tests).
- B2 Sync con Elements (FinHub→Elements): **DONE v1** (tabla `external_refs`, servicio idempotente de sync case/task/document y trigger en status de revisión).
- B3 Sync inverso (Elements→FinHub): **DONE v1** (webhook receiver con actualización de estado de cases y emisión de `product_events`).
- C2/C3 contratación toeslagen + machtiging robusta: **parcial**.
- D1/D2 Taxes Pro: **pendiente**.
- E1/E2/E3 Mortgage/Credit/Insurance verticales: **pendiente**.
- F1/F2/F3 Lifecycle campaigns + events + admin: **pendiente**.
- G1/G2/G3 Finny premium gate + proactivity: **pendiente**.
- H1/H2/H3 Multi-tenant + compliance + observabilidad de negocio: **pendiente**.


### Actualización de avance (ejecutado)
- ✅ A3 implementado en branch `feat/a3-consent-authorization-v1` con migración y APIs de consent.
- ✅ A4 v1 implementado con rutas admin operativas y migración `case_notes`.
- ✅ B1 implementado en branch `feat/b1-elements-connector-v1` con tests unitarios de refresh/retries y sanitización de errores.
- ✅ B2 v1 implementado en branch `feat/b2-elements-sync-v1` con `external_refs`, sync idempotente y pruebas unitarias.
- ✅ B3 v1 implementado en branch `feat/b3-elements-reverse-sync-v1` con webhook receiver y eventos de lifecycle en DB.
- 🔜 Próximo bloque recomendado: C1 Intake único Toeslagen + motor de elegibilidad.

## 3) Plan de trabajo detallado (orden recomendado)

## Sprint 0 — Baseline y hardening (2–3 días)
1. Congelar baseline técnico (inventario de rutas, módulos, migraciones).
2. Alinear `docs/canon/*` y este roadmap.
3. Añadir tablero de tracking con estados por bloque (A1..H3).
4. Cerrar gaps de DoD global (errores, i18n faltante, tests rotos si existen).

**Resultado:** base estable para acelerar sin regresiones.

## Sprint 1 — A3 Consent + Authorization v1 (3–5 días)
1. DB: tabla `consents` + índices + RLS por owner/case.
2. Modelo de estado: `authorization_status` en `cases`.
3. UI reusable: `ConsentCheckbox` + links términos + auditoría visible.
4. Gate funcional: impedir avanzar a `ready_for_review` sin consentimiento.
5. API y tests (unit + integración de casos felices y bloqueados).
6. i18n EN/ES/PL/RO.

**Resultado:** base legal-operativa para Toeslagen y Taxes.

## Sprint 2 — A4 Admin mínimo de operación (4–6 días)
1. Rutas admin `cases` y `case detail` con filtros por estado/tipo/SLA.
2. `case_notes` (DB+RLS) + UI notas internas.
3. Marcar tasks done/undone con trazabilidad.
4. Vista de documentos validados.
5. Tests API admin + smoke UI.

**Resultado:** operación diaria real sin cuello de botella.

## Sprint 3 — B1 Elements Connector v1 (4–5 días) ✅ COMPLETADO
1. `src/features/integrations/elements/*`.
2. OAuth2 client credentials + refresh seguro.
3. Wrapper HTTP tipado con retries/backoff e idempotency-key.
4. Validación runtime de env vars `ELEMENTS_*`.
5. Tests unitarios (token refresh, retries, no logging secretos).

**Resultado:** infraestructura de integración lista para producción.

_Estado ejecutado:_ implementado con cliente tipado, proveedor de token OAuth2 con refresh automático, wrapper HTTP con retry/backoff e idempotency-key, validación runtime de env y tests unitarios.

## Sprint 4 — B2 Sync FinHub→Elements (4–6 días) ✅ COMPLETADO (v1)
1. `external_refs` (DB+RLS) para mapeo idempotente.
2. Sync al crear/actualizar case (ready/paid).
3. Sync tasks y docs validados.
4. Reintentos seguros sin duplicar.
5. Pruebas de idempotencia + fallos transitorios.

**Resultado:** backoffice recibe trabajo consistente.

_Estado ejecutado:_ implementado con `external_refs` para idempotencia, sync de case/tasks/docs validados y trigger de sync al mover casos a estados de revisión/envío.

_B3 v1 ejecutado:_ webhook receiver (`/api/integrations/elements/webhook`) para sync inverso de estado + persistencia de `product_events`.

## Sprint 5 — C1/C2 Toeslagen v3 end-to-end (5–8 días)
1. Wizard único `/app/toeslagen` + motor de elegibilidad dedicado.
2. Resultado con subsidios potenciales + CTA contratación.
3. Checkout Stripe existente → creación inmediata de case toeslagen.
4. Tasks + checklist docs + preparación de sync.
5. Tests de elegibilidad (mínimo 3 por subsidio) + i18n total.

**Resultado:** vertical estrella lista y vendible.

## Sprint 6 — C3 + D2 módulo de autorización reusable (4–6 días)
1. Extraer módulo `src/features/authorization/*` reutilizable.
2. Reusar en Toeslagen y Taxes.
3. OCR carta/QR si aplica + parser activeringscode.
4. Estados `received/verified`.
5. Tests multi-flujo.

**Resultado:** autorización estandarizada y mantenible.

## Sprint 7 — D1 Taxes Pro v1 (5–8 días)
1. `/app/taxes` wizard.
2. Tax pack export (resumen + artefacto).
3. Crear case `taxes` + checklist docs + pipeline IA.
4. Integración con módulo authorization.
5. QA completo (RLS + i18n + errores).

**Resultado:** segunda vertical productiva con mismo backbone.

## Sprint 8 — E1/E2/E3 Verticales LeadGen operables (8–12 días)
1. Mortgage intake → case mortgage.
2. Credit intake → case credit.
3. Insurance intake → case insurance.
4. Todos con tracking `start/submit/abandon`.
5. Todos con docs checklist + sync-ready.

**Resultado:** expansión comercial sin rediseñar arquitectura.

## Sprint 9 — F1/F2/F3 Lifecycle & product_events (5–7 días)
1. `product_events` + emitter central.
2. Campaigns básicas: welcome, docs missing, authorization pending, case updated.
3. Admin lifecycle: activar/desactivar + métricas mínimas.
4. Throttling/cooldowns y plantillas i18n.

**Resultado:** mejora de conversión y reducción de carga operativa.

## Sprint 10 — G1/G2/G3 Finny Gate + Proactivity (5–8 días)
1. Finny Lite vs Premium gate.
2. Contexto por case/docs/estado para Premium.
3. Guardrails anti-spam y acciones sugeridas.
4. Triggers proactivos por eventos + quiet hours.

**Resultado:** asistente diferenciador con control de coste/riesgo.

## Sprint 11 — H1/H2/H3 Sell-ready (7–10 días)
1. Multi-tenant (`tenants`, `tenant_members`, branding/config por tenant).
2. GDPR operativo (retention, export/delete completo).
3. Observabilidad de negocio (eventos críticos + Sentry).
4. Checklist de compliance y handoff comercial.

**Resultado:** plataforma vendible fuera de Domek.

## 4) Backlog atómico de ejecución con Codex
Para cada bloque (A3, A4, B1...) usar secuencia fija:
1. Prompt de plan técnico.
2. Prompt de implementación (archivos completos).
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

## 6) Próximo paso recomendado (ejecución)
Ejecutar **C1 (Toeslagen v3 intake único + motor de elegibilidad)** para llevar el roadmap de integración a una vertical vendible end-to-end.
