# Fase 8 — Release readiness (checklist)

Este checklist define el mínimo verificable para considerar el repositorio listo para release.

## Código y calidad
- [ ] pnpm lint OK
- [ ] pnpm test OK
- [ ] pnpm build OK
- [ ] No hay *.bak* ni artefactos temporales en el repo

## Seguridad
- [ ] Secret scanning activo (GitHub) y sin hallazgos abiertos
- [ ] CodeQL activo y pasando en main
- [ ] Headers de seguridad aplicados (middleware/proxy) y revisados para no romper la app
- [ ] Gitleaks pasando en PRs

## Operación y cumplimiento (GDPR básico)
- [ ] Se documenta dónde viven los datos (Supabase/Postgres/Storage) y quién accede
- [ ] Retención: política mínima definida (qué se guarda y por cuánto tiempo) — pendiente si no aplica aún
- [ ] Export/Delete de perfil funcionando (rutas ya existen en API)
- [ ] Runbook mínimo de incidentes (si aplica en F9 Operación)

## CI/CD
- [ ] Required checks de main pasan (test, CodeQL, Analyze)
- [ ] PR template y CONTRIBUTING actualizados

## Evidencias
- [ ] PR de Fase 8 enlaza a este checklist y a los gates ejecutados

