# F9.5 — Operación analítica (Sentry, non-PII)

## Objetivo
Convertir la observabilidad (Sentry) en señales operables para producto sin capturar PII.

## Reglas anti-PII (obligatorias)
- PROHIBIDO: email, user_id, document_id, case_id, nombres, IBAN/BSN, tokens, cookies, Authorization headers, querystrings, texto libre del usuario, OCR raw, prompts.
- Permitido: enums, booleanos, números, buckets, outcomes.
- Rutas: sin querystring y preferiblemente plantillas (ej. /app/cases/:id).

## Convención de nombres (v1)
product.<dominio>.<acción>.<resultado>
Ejemplos:
- product.auth.login.success
- product.doc.upload.fail

## Campos comunes (v1)
- route: string (template, sin query)
- env: local|staging|prod
- release: string
- outcome: success|fail
- reason/error_code: enum
- latency_bucket: lt_250ms|lt_1s|lt_3s|gte_3s (si aplica)

## Catálogo de eventos (v1)
### Auth
- product.auth.login.success|fail (reason)
- product.auth.register.success|fail (reason)

### Cases
- product.case.create.success|fail (reason)

### Documents/OCR
- product.doc.upload.success|fail (doc_type, size_bucket, reason)
- product.ocr.start|success|fail (doc_type, latency_bucket, error_code)

### Payments
- product.payment.checkout.start|success|fail (plan, reason)

### Assistant
- product.assistant.chat.success|fail (intent, latency_bucket, reason)

## KPIs (v1)
- Login success rate
- Case activation rate
- Doc→OCR→Verify funnel
- Checkout conversion
- Assistant success rate + latency buckets

## Alertas recomendadas (v1)
- auth/login error rate spike
- OCR fail rate spike
- checkout fail rate spike
- exceso de error_code=unknown

## Runbook (v1)
1) Verificar release/env y sample rate.
2) Revisar errores top por endpoint/route.
3) Confirmar que beforeSend/beforeSendTransaction está sanitizando (sin cookies/headers).
4) Si hay ruido o riesgo: desactivar SENTRY_PRODUCT_TELEMETRY_ENABLED.
