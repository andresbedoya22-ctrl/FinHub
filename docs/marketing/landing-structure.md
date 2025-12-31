# FinHub Landing (F02) — Structure + Copy (Premium)

## 1) Objetivo (conversión)
Convertir tráfico frío en:
- Creación de cuenta (CTA principal)
- Lead cualificado (CTA secundario) con segmentación por intención

## 2) Posicionamiento (EN-first)
**One place to control your money in the Netherlands.**
FinHub es un “hub” centrado en **Personal Finance Control** del que se desprenden flujos guiados:
- Taxes (IB) + provisional assessment (voorlopige aanslag)
- Toeslagen (subsidies)
- Mortgages
- Personal loans
- Insurance
- Documents + OCR (asistente operativo)

## 3) Wireframe textual por secciones (order matters)
### S1 — Top nav
- Logo: FinHub
- Links: Privacy / Terms
- CTA: Create account (-> /register)

### S2 — Hero (above the fold)
- H1: core promise (EN/ES/PL/RO)
- 3 bullets (valor inmediato)
- CTA primary: Create account
- CTA secondary: Get updates (scroll a Lead Form)
- Visual: “Hub diagram” (custom SVG) mostrando core + ramas

### S3 — “FinHub Core” (hub + branches)
- Card central: Personal Finance Control
- 6 cards/ramas (cada una con 1 frase + outcome)

### S4 — How it works (3 pasos, honestos)
1) Create account
2) Follow guided flows + upload documents when needed
3) Get an outcome + human review when it matters (si aplica)

### S5 — Pricing (Beta)
- Subscription: 0 € (Beta)
- Pay-per-case: 0 € (Beta)
- Nota: “Pricing will be announced after beta; early users keep benefits.”

### S6 — FAQ (Finny Lite)
- FAQ visible (6–10 preguntas)
- “Ask Finny” widget (existing FinnyWidget) para dudas rápidas

### S7 — Lead capture (qualified)
Campos:
- Full name (required)
- Email (required)
- Phone (optional)
- Interested in (multi-select)
- Consent checkbox (required)

Acción:
- Submit -> /api/marketing/leads
- Success state: “Thanks — we’ll reach out.”

### S8 — Footer
- Privacy / Terms
- Small disclaimer (beta)

## 4) Conversion rules
- CTA principal siempre visible (header + hero).
- Lead form como CTA secundario con “Get updates”.
- No claims no verificables (ej: “encryption at rest”) salvo confirmación técnica.

## 5) i18n keys (namespace)
marketing.landing.*
marketing.leads.*
