# Fase 9 — Observabilidad (Sentry)

## Objetivo
Capturar errores (server/client/edge), performance tracing y replay (cliente) con muestreo controlado por entorno.

## Variables de entorno (recomendadas)
- NEXT_PUBLIC_SENTRY_DSN=...
- SENTRY_DSN=... (si aplica server-side separado)
- SENTRY_ENVIRONMENT=development|staging|production
- NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=0.1
- NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE=0.0
- NEXT_PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE=1.0

## Reglas de muestreo sugeridas
- development: traces 1.0, replay session 0.0, replay on error 1.0
- staging: traces 0.2, replay session 0.0–0.05, replay on error 1.0
- production: traces 0.05–0.1, replay session 0.0–0.01, replay on error 1.0

## Validación rápida
1) Ejecutar: pnpm dev
2) Provocar error controlado (p.ej. throw en una ruta dev-only) y verificar evento en Sentry.
3) Confirmar que NO existen rutas /sentry-example-page ni /api/sentry-example-api.

## Privacy-first hardening (beforeSend hooks)

We sanitize Sentry events and transactions to reduce accidental PII leakage:
- Removes sensitive request headers: Authorization, Cookie, Set-Cookie, X-API-Key
- Drops request cookies and request body/data payloads
- Drops request query_string (can include tokens)
- Strips fetch/xhr breadcrumb payload fields: body, data, headers

Config:
- sendDefaultPii is env-controlled and defaults to false:
  - SENTRY_SEND_DEFAULT_PII=true enables default PII sending

## Product telemetry (non-PII)

Ubicación:
- src/features/observability/productTelemetry.ts
- src/__tests__/productTelemetry.test.ts

Objetivo:
- Emitir eventos de producto (UX/flujo) sin PII, usando Sentry como backend de observabilidad.

Variables de entorno:
- SENTRY_PRODUCT_TELEMETRY_ENABLED: "true" para activar (default: false si no está definida)
- SENTRY_PRODUCT_TELEMETRY_SAMPLE_RATE: tasa [0..1] (default recomendado: 0.1)

Garantías de privacidad (high-level):
- Se aplica un filtro/denylist de claves sensibles (p. ej. email/token) y no se debe enviar contenido que identifique a una persona.
- Diseñado para métricas de flujo (pantallas, acciones, outcomes), no para datos de usuario.

Uso (ejemplo conceptual):
- trackProductEvent("auth.login.fail", { route: "/login", reason: "invalid_credentials" })

