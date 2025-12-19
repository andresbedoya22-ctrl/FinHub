# FinHub (web) — repo base

Este repositorio corresponde a **FinHub v2.0 (web-first)** y está alineado con el documento canónico:
- Frontend: **Next.js (App Router) + TypeScript + Tailwind**
- En fases posteriores: shadcn/ui, Supabase, Stripe, Azure AI Document Intelligence

## Requisitos
- Node.js: ver `.nvmrc`
- pnpm (recomendado): `corepack enable`

## Comandos
```bash
pnpm install
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Estructura (resumen)
- `src/app/(marketing)` — páginas públicas (landing)
- `src/app/(auth)` — login/registro
- `src/app/(dashboard)` — app privada (shell)
- `src/features` — lógica por dominio (cases, documents, i18n, etc.)
- `docs` — ADRs, decisiones y guías

## Convenciones rápidas
- TypeScript estricto.
- Sin lógica de negocio en `src/app`; ahí van páginas y composición.
- Dominios en `src/features/*`.
- Estándares y decisiones relevantes deben documentarse en `docs/adr`.

