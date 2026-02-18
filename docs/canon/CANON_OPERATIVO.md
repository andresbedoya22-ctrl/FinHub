# FinHub Canon Operativo (v3)

> **SOURCE OF TRUTH (documentación operativa):** este archivo.
>
> Si otro documento contradice este canon, prevalece este canon y el estado de `src/**` + `supabase/migrations/**`.

## 1) Alcance y método

Este canon refleja el estado real del repositorio a fecha de esta actualización, validado contra:

- Rutas App Router en `src/app/**`.
- Endpoints en `src/app/api/**`.
- Módulos en `src/features/**`.
- Migraciones y RLS en `supabase/migrations/**`.
- Pruebas en `src/**` (`*.test.ts`, `*.spec.ts`).

Documentos de snapshot anteriores (por ejemplo `docs/repo-snapshots/**` y canon F00–F15 de enero) se mantienen como **histórico**.

## 2) Reglas no negociables (estado real)

- `src/app/(dashboard)/app/page.tsx` redirige a `/app/finances`.
- No hay captura de credenciales DigiD en código.
- OCR existe con endpoints y UI de revisión (`/app/documents/ocr-review`, `/api/documents/[id]/ocr`, `/api/documents/[id]/extraction`, `/api/documents/[id]/verify`).
- i18n runtime y mensajes en EN/ES/PL/RO.
- Integración OpenAI server-side en `/api/assistant/chat`.

## 3) Estado por fases F00–F15

Leyenda: **DONE**, **PARTIAL**, **PENDING**.

### F00 — Descubrimiento técnico
- **Estado:** DONE.
- Evidencia: mapas de arquitectura, snapshots, docs de canon/decisiones.

### F01 — i18n Foundation P0
- **Estado:** DONE.
- Evidencia: runtime i18n + mensajes EN/ES/PL/RO + endpoint `/api/i18n/locale`.

### F02 — Landing + captación
- **Estado:** DONE.
- Evidencia: `/landing`, `/privacy`, `/terms`, `/api/marketing/leads`, migraciones `marketing_leads_*`.

### F03 — Auth/Login
- **Estado:** DONE.
- Evidencia: rutas `/login`, `/register`, `/forgot-password`, `/reset-password` y `/api/auth/*`.

### F04 — Finny v2
- **Estado:** PARTIAL.
- Implementado: `/api/assistant/chat`, módulos de provider y guardrails.
- Pendiente: playbooks por idioma y modo operador/admin dedicado.

### F05 — Lifecycle post-registro
- **Estado:** PARTIAL.
- Implementado: base de lifecycle (`src/features/lifecycle/*`, `/api/admin/lifecycle*`, migration `20260213183000_lifecycle_v1.sql`).
- Pendiente: campañas enterprise completas (orquestación avanzada, analítica extendida, jobs dedicados).

### F10 — Navegación/Home centrado en finanzas
- **Estado:** DONE.
- Evidencia: redirect `/app -> /app/finances`, rutas y shell de dashboard.

### F11 — Finanzas personales v2
- **Estado:** DONE (v1 operativa).
- Evidencia: rutas `/app/finances*`, APIs `/api/finances*`, migraciones `finance_core_*`, RLS y tests.

### F12 — Subsidios / Toeslagen
- **Estado:** DONE (v1 operativa).
- Evidencia: rutas `/app/subsidies*` + `/toeslagen`, APIs `/api/subsidies/checkout` y `/api/toeslagen/contract-start`, migraciones `subsidies_v1` + storage y tests de calculadoras.

### F13 — Taxes Pro
- **Estado:** PARTIAL.
- Implementado: ruta `/app/taxes`, cliente `src/features/taxes/*`, API `/api/taxes/intake`, tests de intake/server vertical.
- Pendiente: tax pack/export y workflow operativo completo de backoffice.

### F14 — Créditos personales
- **Estado:** PARTIAL.
- Implementado: ruta `/app/credit`, intake compartido `/api/verticals/intake`, checklist/tareas por case.
- Pendiente: operación vertical completa (pack específico + automatizaciones dedicadas).

### F15 — Seguros v2
- **Estado:** PARTIAL.
- Implementado: ruta `/app/insurance`, intake compartido `/api/verticals/intake`, base de casos/eventos.
- Pendiente: inventario/pipeline específico de seguros con automatización dedicada.

## 4) Integraciones y módulos (resumen)

- **Supabase:** auth/db/storage + clientes server/admin.
- **Stripe:** checkout/status + webhook.
- **OCR Azure DI:** provider y pipeline de extracción/verificación.
- **OpenAI:** provider server-side y chat assistant.
- **Elements:** conector + sync directo/inverso (`src/features/integrations/elements/*`, webhook).

## 5) Base de datos y RLS (resumen)

Áreas principales de migraciones:

- Núcleo: `schema_v1`, `rls_v1`, admin roles.
- Case engine/doc pipeline/authorization/admin: A1/A2/A3/A4.
- Finanzas: `finance_core_v1`, `finance_core_rls_v1`.
- Subsidies: `subsidies_v1`, storage bucket y políticas.
- Integraciones: `external_refs`, `product_events`, reverse sync.
- Sell-ready: `h1_h2_h3_sell_ready_v1` (tenant, GDPR, observabilidad negocio).

## 6) Coherencia documental

- Índice único de docs: `docs/DOCS_INDEX.md`.
- Estado y contradicciones resueltas: `docs/STATUS.md`.
- Los documentos históricos del canon F00–F15 se conservan para trazabilidad, pero no son la fuente vigente.
