# System Map (v2.2)

## Módulos (observado en repo)
- Marketing: /landing, /privacy, /terms
- Auth: /login, /register
- Dashboard app: /app (cases, documents, profile, ui-kit, admin)
- API: /api/auth/*, /api/documents/*, /api/payments/*, /api/stripe/webhook, /api/assistant/chat

## Flujos críticos (alto nivel)
- Auth → Dashboard
- Cases wizard → pasos por stepKey
- Documents → OCR → verify → OCR review (admin)
- Payments → checkout/status → webhook
- Finny (assistant) → /api/assistant/chat

## Dependencias (por confirmar en inventario)
- Supabase (clients server/admin/browser)
- Stripe (checkout + webhook)
- OCR (Azure Document Intelligence provider)
- LLM (OpenAI provider + mock)

## Puntos de riesgo
- PII/telemetría (ya hay enfoque no-PII)
- RLS / aislamiento multi-tenant (confirmar en supabase/migrations)
- Seguridad webhook Stripe (firma/secret)
