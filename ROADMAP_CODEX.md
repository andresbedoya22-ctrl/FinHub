# ROADMAP_CODEX — Estado operativo alineado al repo

Este roadmap resume ejecución y backlog real según el código actual.

## Reglas de ejecución

- Sin lógica de negocio en `src/app`.
- Dominio en `src/features/*`.
- Cambios de datos en `supabase/migrations/*` con RLS cuando aplica.
- Validación mínima: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.

## Estado por bloques

### Bloques cerrados (v1)
- A1 Case Engine v1.
- A2 Document Pipeline v2.
- A3 Consent + Authorization ledger (base).
- A4 Admin de operación v1.
- B1 Elements connector v1.
- B2 Sync FinHub→Elements v1.
- B3 Sync inverso Elements→FinHub v1.
- H1/H2/H3 sell-ready v1 (multi-tenant base + GDPR operativo + observabilidad negocio).

### Verticales estado actual
- F11 Finanzas: **DONE (v1 operativa)**.
- F12 Subsidios/Toeslagen: **DONE (v1 operativa)**.
- F13 Taxes Pro: **PARTIAL** (intake + case/tareas base, falta pack/export y flujo full).
- F14 Créditos: **PARTIAL** (intake + case base, falta operación vertical completa).
- F15 Seguros: **PARTIAL** (intake + case base, falta pipeline específico completo).

### Backlog real (pendientes)
1. Lifecycle enterprise (campañas/analítica/orquestación avanzada).
2. Taxes full backoffice (tax pack/export + automatizaciones).
3. Credit full vertical (pack y automatizaciones propias).
4. Insurance full vertical (inventario/pipeline especializado).
5. Finny operator mode/playbooks por idioma.
6. Sell-ready enterprise (SSO/SAML, branding runtime por tenant, facturación B2B, jobs asíncronos GDPR).

## Relación con canon

Para definiciones normativas y evidencia por fase, usar `docs/canon/CANON_OPERATIVO.md`.
Para seguimiento de cambios documentales, usar `docs/STATUS.md`.
