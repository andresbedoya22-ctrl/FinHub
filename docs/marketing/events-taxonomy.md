# FinHub — Events Taxonomy (F02.2.1 P0)

Reglas:
- Non-PII. Prohibido: email, nombre, documento, teléfono, address.
- Payload mínimo, estable y versionable.
- locale siempre incluido.

## Eventos P0 (Landing)

### landing_view
Cuándo: al render inicial del landing.
Payload:
- locale: en|es|pl|ro
- path: string (ej. "/landing")
- referrerDomain: string | null (solo dominio si existe)

### nav_click
Cuándo: click en links del header (scroll/route).
Payload:
- locale
- target: "modules"|"how"|"pricing"|"faq"|"lead"|"login"|"register"

### cta_primary_click
Cuándo: CTA principal (Hero/Header).
Payload:
- locale
- placement: "hero"|"header"|"section"
- target: "register"|"app"|"precheck"

### cta_secondary_click
Cuándo: CTA secundario.
Payload:
- locale
- placement
- target: "how"|"pricing"

### pricing_view
Cuándo: pricing entra en viewport (1a vez).
Payload:
- locale

### pricing_select
Cuándo: selección de plan (sin pago real).
Payload:
- locale
- plan: "free"|"plus"|"pro"

### faq_expand
Cuándo: expand de item FAQ.
Payload:
- locale
- itemKey: string (key estable)

### finny_lite_open
Cuándo: abrir widget Finny Lite.
Payload:
- locale
- placement: "faq"|"floating"

### finny_lite_question
Cuándo: usuario envía pregunta al widget.
Payload:
- locale
- topicKey: string (clasificación, no texto libre)

### lead_submit_attempt
Cuándo: submit del formulario.
Payload:
- locale
- interestsCount: number

### lead_submit_success
Cuándo: API ok.
Payload:
- locale

### lead_submit_fail
Cuándo: API fail.
Payload:
- locale
- reason: "validation"|"rate_limit"|"server"

### locale_change
Cuándo: cambio de idioma desde LanguageSwitcher.
Payload:
- from: en|es|pl|ro
- to: en|es|pl|ro
- placement: "landing_header"|"app_header"

## Versionado
- Añadir campo eventVersion si se rompe compatibilidad.
