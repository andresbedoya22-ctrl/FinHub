# Runbook Dev / Release (finhub-web)

## 1) Rutas reales de LeadGen
- Mortgage: `/app/mortgage`
- Credit: `/app/credit`
- Insurance: `/app/insurance`

Atajos habilitados:
- `/mortgage` -> redirect a `/app/mortgage`
- `/credit` -> redirect a `/app/credit`
- `/insurance` -> redirect a `/app/insurance`

## 2) Flujo local limpio
1. `git status`
2. `Remove-Item -Recurse -Force .next` (o `rm -rf .next`)
3. `pnpm install`
4. `pnpm dev`
5. Validar UI en:
   - `http://localhost:3000/app/mortgage`
   - `http://localhost:3000/app/credit`
   - `http://localhost:3000/app/insurance`

## 3) Validaciones antes de publicar
1. `pnpm lint`
2. `pnpm typecheck`
3. `pnpm test`
4. `pnpm build`

## 4) Limitaciones en entornos sandbox (Codex)
- Puede no haber acceso saliente a GitHub (`github.com:443`), por lo que `git push` puede fallar aunque el repo este correcto.
- En algunos sandboxes Windows puede fallar `next dev`, `next build` o `vitest` con `spawn EPERM` por bloqueo de procesos hijo.
- Esos errores no implican bug funcional del repo; valida gates finales desde tu PC local.
- Flujo recomendado en Codex: implementar + lint/typecheck + commit local.

## 5) Publicacion desde tu PC
1. `git status`
2. `git push origin main`

## 6) Reglas SSR/CSR para evitar hydration mismatch
- No usar `next/head` dentro de `src/app/*` (App Router usa `metadata`/`viewport`).
- No usar `Date.now()`, `Math.random()` ni `navigator.*` en layouts/providers raiz.
- El primer render cliente debe usar el mismo snapshot que SSR (locale, mes inicial, tema).
- Si cambias idioma o tema, aplica el cambio despues de hidratar, sin mutar el arbol raiz durante hydration.
- Si aparece mismatch solo en navegador normal y no en incognito, revisar extensiones que inyectan DOM.
