# Subsidies payments (Stripe + iDEAL)

## Architecture
- Subsidies uses Stripe Checkout sessions created in `src/app/api/subsidies/checkout/route.ts`.
- Payment methods: `card` and `ideal` (configured in the Checkout session).

## Enable iDEAL
1. Stripe Dashboard ? Settings ? Payment methods ? Enable iDEAL.
2. Ensure your account is activated for iDEAL (may require verification).
3. Use EUR currency (already enforced for Subsidies).

## Environment variables
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

## Notes
- The UI text references iDEAL via `subsidies.checkout.methods`.
- If iDEAL is not enabled, Stripe will hide it automatically.
