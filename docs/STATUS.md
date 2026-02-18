# STATUS — Actualización integral de documentación

Fecha: actualización actual del repositorio.

## 1) Source of truth definido

Se definió como **SOURCE OF TRUTH** documental:

- `docs/canon/CANON_OPERATIVO.md`

Regla aplicada:
- Si otro documento contradice al canon, prevalece el canon y la evidencia en `src/**` + `supabase/migrations/**`.

## 2) Inventario de documentación revisada (por tipo)

- Canon: `docs/canon/*`, `docs/Canon.docx`.
- Roadmap/planificación: `ROADMAP_CODEX.md`, `docs/reports/2026-02-14-roadmap-audit.md`.
- Readmes/guías: `README.md`, `docs/README.md`, `CONTRIBUTING.md`, `docs/CONTRIBUTING.md`.
- Arquitectura: `docs/architecture/*`.
- DB/RLS/migraciones: `docs/db/*`, `supabase/migrations/*`.
- Runbooks: `docs/runbooks/*`.
- ADR/decisiones: `docs/adr/*`, `docs/decisions/*`.
- Dominio/spec/notas: `docs/domain/*`, `docs/subsidies-*.md`, `docs/openapi/*`, `docs/db-notes.md`.
- Históricos: `docs/repo-snapshots/*`.

## 3) Snapshot del repo validado

- Rutas: `src/app/**` (dashboard/auth/marketing + verticales).
- APIs: `src/app/api/**` (auth, finances, documents, subsidies, toeslagen, taxes, verticals, admin, assistant, integrations).
- Features: `src/features/**` (lifecycle, taxes, leadgen, integrations/elements, observability, tenant, authorization, etc.).
- DB/RLS: migraciones hasta `20260214123000_h1_h2_h3_sell_ready_v1.sql`.
- Tests: Vitest en `src/**` + `vitest.config.ts`.

## 4) Contradicciones resueltas

| Documento | Antes | Después | Motivo |
|---|---|---|---|
| `docs/canon/CANON_OPERATIVO.md` | F13/F14/F15 como MISSING; F05 como MISSING; estado mixto antiguo | F13/F14/F15/F05 en PARTIAL; F11/F12 en DONE v1; reglas y evidencia actualizadas | El código actual sí tiene rutas/APIs/features base para esas fases |
| `docs/canon/00-repo-truth.md` | Snapshot histórico presentado como verdad actual | Documento consolidado que redirige al canon vigente | Evitar doble verdad y desalineación temporal |
| `docs/canon/01-phase-map-F00-F15.md` | Mapa antiguo con estados desactualizados | Mapa resumido vigente alineado al canon | Consistencia de fases |
| `docs/canon/03-diff-vs-canon.md` | Diferencias abiertas de auditoría previa | Registro de discrepancias históricas ya resueltas | Cerrar contradicciones explícitamente |
| `docs/README.md` | Canon = `docs/Canon.docx` | Canon = `docs/canon/CANON_OPERATIVO.md` + STATUS + INDEX | Unificar fuente vigente |
| `ROADMAP_CODEX.md` | Estado con mojibake y fases pendientes desactualizadas | Roadmap limpio con estado actual y backlog real | Coherencia con repo ejecutado |

## 5) Pendientes reales (backlog)

1. Finny operator mode/playbooks por idioma.
2. Lifecycle enterprise (orquestación avanzada, analítica extendida, jobs dedicados).
3. Taxes full workflow (tax pack/export + automatización backoffice).
4. Credit full workflow vertical.
5. Insurance full workflow vertical.
6. Sell-ready enterprise adicional (SSO/SAML, branding runtime por tenant, facturación B2B, jobs GDPR asíncronos).

## 6) Documentos deprecados/históricos

- `docs/repo-snapshots/*`: históricos.
- `docs/Canon.docx`: legado; no canónico operativo.
- `docs/reports/2026-02-14-roadmap-audit.md`: auditoría puntual histórica.

