# DOCS_INDEX

Índice de documentación clave de FinHub.

## 1) Canon y estado global

- `docs/canon/CANON_OPERATIVO.md` — **source of truth** operativo del estado del producto, fases y arquitectura.
- `docs/STATUS.md` — bitácora de actualización documental, contradicciones resueltas y backlog real.
- `docs/canon/01-phase-map-F00-F15.md` — mapa resumido de fases (sin detalle técnico).

## 2) Arquitectura

- `docs/architecture/system-map.md` — mapa de sistema.
- `docs/architecture/route-map.md` — mapa de rutas/páginas.
- `docs/architecture/data-map.md` — mapa de datos.
- `docs/architecture/ocr-map.md` — arquitectura OCR.
- `docs/architecture/payments-map.md` — arquitectura de pagos.
- `docs/architecture/finny-map.md` — arquitectura Finny.

## 3) Base de datos

- `supabase/migrations/*` — fuente de verdad de esquema evolutivo y RLS.
- `docs/db/schema-v1.sql` — referencia base de esquema inicial.
- `docs/db/rls-v1.md` — estrategia RLS base.
- `docs/db-notes.md` — notas operativas DB.

## 4) Operación y runbooks

- `docs/runbooks/A1_apply_migration_supabase.md` — runbook de aplicación de migraciones.
- `docs/runbooks/A2_document_pipeline_v2.md` — runbook del pipeline documental.
- `docs/runbooks/taxes-pro-v1-smoke.md` — smoke de taxes.
- `docs/runbooks/finny-premium-v1-smoke.md` — smoke de Finny.
- `docs/runbooks/lifecycle-v1-smoke.md` — smoke lifecycle.
- `docs/runbooks/sell-ready-v1-smoke.md` — smoke sell-ready.

## 5) Decisiones (ADR)

- `docs/adr/*` — ADRs formales (incluye plantilla).
- `docs/decisions/adr-0001-canon2-scope.md` — alcance de canon previo.

## 6) Dominio y especificaciones funcionales

- `docs/domain/*` — scope/model/mapping de dominio.
- `docs/subsidies-*.md` — documentación funcional de subsidios.
- `docs/openapi/finhub-v1.yaml` — contrato OpenAPI de referencia.

## 7) Documentos históricos y deprecados

- `docs/repo-snapshots/*` — snapshots históricos (no canónicos vigentes).
- `docs/reports/2026-02-14-roadmap-audit.md` — auditoría puntual histórica.
- `docs/Canon.docx` — material legado; no usar como fuente operativa actual.
