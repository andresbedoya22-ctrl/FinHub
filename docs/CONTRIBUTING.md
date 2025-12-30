# Contribución

## Estilo de commits (mínimo)
- eat: nueva funcionalidad
- ix: corrección
- chore: mantenimiento
- docs: documentación
- efactor: refactor
- 	est: tests
- ci: CI

## Pull Requests
- Trabajar siempre por branch + PR (main protegido).
- Debe pasar: pnpm lint, pnpm test, pnpm build (y pnpm typecheck si aplica).
- Preferir PRs pequeñas y revisables.
- Documentar decisiones relevantes en docs/adr/.

## Calidad
- Mantener TypeScript estricto.
- Evitar dependencias innecesarias.
- No subir artefactos temporales (*.bak*, dumps, exports locales).
