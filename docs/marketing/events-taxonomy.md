# Events taxonomy (F02) — Privacy-first

Principio: NO PII en telemetría (no email/name/phone, no utm_*).

## Events
- product.marketing.landing.view
  attrs: route, locale
- product.marketing.cta.click
  attrs: route, locale, intent (create_account | lead_form)
- product.marketing.lead.submit.success
  attrs: route, locale, interested_count
- product.marketing.lead.submit.fail
  attrs: route, locale, reason (validation | server)

## Notes
- UTM se guarda en DB (marketing_leads) pero NO se envía a telemetry.
