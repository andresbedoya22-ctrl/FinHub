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
2. `rm -rf .next` (en PowerShell: `Remove-Item -Recurse -Force .next`)
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
- Puede no haber acceso saliente a GitHub (`github.com:443`), por lo que `git push` puede fallar aunque el repo esté correcto.
- En ese caso, el push se realiza desde tu PC/local con acceso normal a red.

## 5) Publicación desde tu PC
1. `git status`
2. `git push origin main`
