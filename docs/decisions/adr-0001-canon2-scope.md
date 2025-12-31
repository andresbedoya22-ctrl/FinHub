# ADR-0001 Canon2 Scope (v2.2)

## Cerrado (observado en repo)
- Web-first con Next.js App Router (Next 16.x).
- Auth básico (login/register/logout) + dashboard privado.
- Cases: listado + new + detalle + wizard por stepKey.
- Documents: listado + OCR endpoints + OCR review UI.
- Payments: checkout/status + Stripe webhook.
- Integraciones: Supabase clients, Stripe, OCR provider (Azure Document Intelligence), LLM provider (OpenAI) + mocks.
- Observabilidad: Sentry con enfoque no-PII (telemetría de producto y API core/OCR).

## Pendiente (confirmar / definir)
- Inventario exacto de schema DB + migraciones + RLS por tabla.
- Modelo de roles/operación (operators/admin) y permisos.
- Staging vs prod (acceso, captcha/invitación, seeds).
- Email provider (si aplica) y flujos transaccionales.
- Catálogo de productos/precios Stripe + lifecycle y provisión.
- Guardrails finales de Finny + políticas de contenido en app.

## Riesgos
- Multi-tenant leakage (RLS / joins / views).
- PII en logs/telemetría/OCR outputs.
- Webhook Stripe: firma, idempotencia, replay.
- Costes OCR/LLM y rate limiting.
