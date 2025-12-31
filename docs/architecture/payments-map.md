# Payments Map (v2.2)

## Endpoints observados
- POST /api/payments/checkout
- GET  /api/payments/status
- POST /api/stripe/webhook

## Productos/precios (TBD)
- Confirmar si se crean via dashboard Stripe o via config.

## Estados (TBD)
- draft → checkout_started → paid → provisioned (definir)

## Riesgos
- Validación de webhook + idempotencia
- Reintentos y estados inconsistentes
