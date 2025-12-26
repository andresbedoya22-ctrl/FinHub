-- Idempotencia para Stripe: evita duplicados cuando Stripe reintenta eventos.
-- Requiere que stripe_session_id / stripe_payment_intent_id sean únicos cuando no son null.

create unique index if not exists uq_payments_stripe_session_id
on public.payments (stripe_session_id)
where stripe_session_id is not null;

create unique index if not exists uq_payments_stripe_payment_intent_id
on public.payments (stripe_payment_intent_id)
where stripe_payment_intent_id is not null;
