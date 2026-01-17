# Subsidies smoke checklist

Run these checks after any Subsidies change. Use all locales: ES, EN, PL, RO.

## Routes
- /app/subsidies (Home)
- /app/subsidies/huurtoeslag (Detail)
- /app/subsidies/huurtoeslag/wizard (Wizard)
- /app/subsidies/huurtoeslag/result (Result)
- /app/subsidies/huurtoeslag/checkout (Checkout)
- /app/subsidies/applications (Applications)
- /app/subsidies/applications/[id] (Application detail)

## Checklist (repeat per locale)
- No MISSING_MESSAGE in console.
- No raw i18n keys in UI.
- No mojibake/encoding issues (e.g., Estimaci?n, dop?aty, subven?ii).
- Wizard navigation works: Back/Continue, and final Continue opens Result.
- Result shows benefit estimate and FinHub fee; no raw errors.
- Checkout starts payment or shows i18n error message (no technical stack).
- Applications list/detail load and show translated labels/statuses.

## Special cases
- Huurtoeslag with rent > 1000: should NOT show ineligible solely due to rent.
- If DB tables are missing, UI shows translated guidance (apply migrations/contact support).
