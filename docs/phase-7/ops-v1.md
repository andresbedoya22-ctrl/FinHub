# Fase 7 — Operación v1 (OCR + Finny)

Este documento describe cómo operar y validar el stack de Fase 7 en local/CI.

## 1) Variables de entorno requeridas (mínimo)
### Supabase (Auth + DB)
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY (solo scripts/admin/e2e; nunca en cliente)

### OpenAI (Finny LLM fallback)
- OPENAI_API_KEY
- FINNY_OPENAI_MODEL (opcional; default conservador en el código)

### Stripe (si aplica en tu entorno)
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET
- NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

Nota:
- El endpoint /api/assistant/chat exige usuario autenticado (guard Supabase) para evitar abuso público.

## 2) Endpoints relevantes
### Assistant
- POST /api/assistant/chat
  - Body: { message: string, lang?: string }
  - Respuesta: { ok: true, mode: "faq"|"llm", answer: string } o { ok: false, error: string }

### Documents / OCR / Verify (referencia)
- /api/documents
- /api/documents/[id]
- /api/documents/[id]/ocr
- /api/documents/[id]/extraction
- /api/documents/[id]/verify

## 3) Rutas UI relevantes
- /app/documents/ocr-review
- /app/documents/ocr-review/[id]
- Widget Finny: inyectado en layout del dashboard (UI flotante).

## 4) Idioma (estado actual)
- El assistant es "language-aware":
  - Toma lang del body si viene.
  - Si no, usa Accept-Language del request.
- Hoy el texto “garantizado” está en ES/EN. Otros idiomas (nl/pl/ro) caen a EN por defecto en `pickLangForText`.
- La internacionalización completa de la web app se implementará en su fase dedicada (según el canon).

## 5) Comandos de validación (local)
- Lint + tests + build:
  - pnpm lint
  - pnpm test
  - pnpm build

- E2E assistant (auth + idioma):
  - pnpm e2e:assistant
  - Requiere Supabase env (URL/keys) y el server corriendo en BASE_URL (por defecto http://localhost:3000).

## 6) Definition of Done (Fase 7 — mínimo operativo)
1) OCR registry y schema OK (tests verdes).
2) UI de revisión OCR accesible y no rompe con data inválida (manejo de errores).
3) Finny:
   - FAQ match funciona.
   - LLM fallback funciona si OPENAI_API_KEY está.
   - Responde según idioma activo (ES/EN hoy).
4) Seguridad:
   - /api/assistant/chat requiere sesión (401 si no auth).
   - No solicita credenciales sensibles (DigiD/contraseñas/tokens).
5) Runners:
   - pnpm e2e:assistant OK sin prompts interactivos.
6) CI-ready:
   - pnpm lint/test/build OK.
