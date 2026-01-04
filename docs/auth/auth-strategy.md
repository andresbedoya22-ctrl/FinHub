# F03 — Auth Premium (estrategia)

## Objetivo
Auth premium con: email+password, verificación de email, OAuth (Google/Apple), locale heredado del landing, hardening (rate limit + audit), y flujos forgot/reset.

## Locale
- Canonical cookie: fh_locale
- Compat: locale, NEXT_LOCALE
- /api/i18n/locale setea las 3.

## Providers
- Email/password
- OAuth: Google, Apple

## Verificación de email
- Activada a nivel Supabase (Confirm email).
- UI: registro informa y permite reenviar verificación.

## Seguridad
- Rate limit en /api/auth/*
- Telemetría product.auth.*