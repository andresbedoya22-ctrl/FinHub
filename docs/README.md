# Docs — FinHub Web

Este directorio contiene la documentación canónica del repositorio.

## Canon
- Documento canónico (fuente de verdad): ./Canon.docx

## Fase 4 — Modelo de datos + Contratos (OpenAPI v1)
- Dominio (scope): ./domain/scope-v1.md
- Modelo de dominio (entidades/enums/state machine): ./domain/model-v1.md
- Mapping frontend (localStorage) → DB: ./domain/mapping-localstorage-to-db.md
- OpenAPI v1: ./openapi/finhub-v1.yaml
- Schema SQL v1: ./db/schema-v1.sql
- RLS (estrategia): ./db/rls-v1.md
- Checklist cierre fase 4: ./phase-4-closure.md

## Fase 7 — OCR/IA (operación)
- Operación v1 (OCR + review): ./phase-7/ops-v1.md

## Fase 8 — QA / GDPR / Release hardening
- Release readiness checklist: ./phase-8/release-readiness.md

## Contribución
- Guía de contribución: ./CONTRIBUTING.md

## Checks rápidos
- Mojibake ES (tildes rotas) en mensajes: `rg -n -F "?" src/i18n/messages/es.json`
