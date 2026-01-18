# FinHub Canon Operativo (v2.2) - Technical Reality up to F15

Sources:
- docs/repo-snapshots/canon-refresh-20260118-132825 (routes-pages.txt, routes-api.txt, migrations-list.txt, env-keys-env.local.txt, modules-dirs.txt, tests.txt, tree-src.txt, tree-docs.txt, tree-supabase.txt, integrations-grep.txt)
- Direct inspection: src/app/(dashboard)/app/page.tsx, rg auth.getUser in src/app/api, supabase/migrations/* (create table and RLS scans)

Scope
- This update covers F00 through F15 only. Phases beyond F15 are out of scope unless already present in Canon.

0) Como usar este canon
- The canon below is evidence-based. Each claim is grounded in snapshot files or direct code inspection.
- If evidence is missing, it is marked as NO EVIDENCE.

1) Supuestos (evidence-based)
- Next.js App Router with groups (auth), (dashboard), (marketing) (routes-pages.txt).
- Supabase for Auth/DB/Storage (env keys + integrations-grep.txt).
- Stripe for payments + webhook (integrations-grep.txt).
- OCR via Azure Document Intelligence provider (src/features/documents/ocr/README.md).
- i18n runtime with message files in src/i18n/messages/{en,es,pl,ro}.json (tree-src.txt).

2) Reglas no negociables (actualizadas)
- /app redirects to /app/finances (src/app/(dashboard)/app/page.tsx).
- No credential capture for DigiD in codebase: NO EVIDENCE of DigiD flows or storage.
- OCR has explicit review UI routes and OCR endpoints (routes-pages.txt, routes-api.txt).
- EN/ES/PL/RO message files exist; email i18n is NO EVIDENCE in repo.
- OpenAI integration is server-side in /api/assistant/chat and provider module (integrations-grep.txt); no client key exposure observed.

3) F00-F15 status

F00 - Descubrimiento tecnico
- F00.0 Objective: Document repo baseline (routes, modules, integrations, CI gates, architecture docs).
- Evidence: docs/repo-snapshots/canon-refresh-20260118-132825/*; docs/architecture/*; docs/decisions/adr-0001-canon2-scope.md.
- Status: DONE.

F01 - i18n Foundation P0
- F01.0 Objective: i18n skeleton before Landing/Auth/Finny with EN default and EN/ES/PL/RO support.
- Evidence: src/i18n/*, src/i18n/messages/*.json; docs/i18n/i18n-decision.md; docs/i18n/coverage-matrix.md.
- Status: DONE.
- Notes: email i18n not found (NO EVIDENCE).

F02 - Landing Premium + Captacion
- F02.0 Objective: multi-language landing + lead capture + consent + telemetry.
- Evidence: /landing, /privacy, /terms routes; /api/marketing/leads; marketing_leads migrations.
- Status: DONE for implemented scope.
- Notes: advanced SEO features are NO EVIDENCE (deferred in Canon).

F03 - Auth/Login Premium
- F03.0 Objective: auth flows with validation and security hardening.
- Evidence: /login, /register, /forgot-password, /reset-password routes; /api/auth/* routes; Supabase auth usage in route handlers.
- Status: DONE.

F04 - Finny v2
- F04.0 Objective: OpenAI API, playbooks, operator mode, audit.
- Evidence: /api/assistant/chat; src/features/ai/llm/openaiLlmProvider.ts; src/features/assistant/finny/*.
- Status: PARTIAL.
- Gaps: playbooks per language and operator/admin mode UI (NO EVIDENCE).

F05 - Captacion post-registro (lifecycle)
- F05.0 Objective: lifecycle emails, templates, throttling, campaigns.
- Evidence: NO EVIDENCE in routes, modules, or env keys.
- Status: MISSING.

F10 - Re-ensamble navegacion y Home
- F10.0 Objective: /app -> /app/finances, nav centered on finances.
- Evidence: src/app/(dashboard)/app/page.tsx redirect; /app/finances route; dashboard UI modules in src/app/(dashboard)/app/ui/*.
- Status: DONE.

F11 - Finanzas Personales v2
- F11.0 Objective: finance core data model + UI + transactions flows.
- Evidence: finance_core migrations + RLS; /app/finances routes; /api/finances/* routes; src/features/finances/*; formatCurrency tests.
- Status: PARTIAL.
- Gaps: NO EVIDENCE for explicit OCR-to-transaction test coverage or CSV export tests.

F12 - Subsidios/Toeslagen Premium
- F12.0 Objective: eligibility -> result -> checkout -> docs -> review -> done, with admin and i18n.
- Evidence: /app/subsidies* routes; /api/subsidies/checkout; src/domain/subsidies/*; src/lib/db/subsidies/*; subsidies migrations; calculators tests; Stripe checkout includes ideal + card.
- Status: PARTIAL.
- Gaps: NO EVIDENCE for Case Engine reuse or explicit Authorization Modo A flow for subsidies.

F13 - Taxes Pro
- F13.0 Objective: taxes wizard, tax pack, admin workflow.
- Evidence: NO EVIDENCE in repo for taxes routes or modules.
- Status: MISSING.

F14 - Creditos personales
- F14.0 Objective: credit case end-to-end.
- Evidence: NO EVIDENCE in repo.
- Status: MISSING.

F15 - Seguros v2
- F15.0 Objective: insurance inventory with OCR + consented suggestions.
- Evidence: NO EVIDENCE in repo.
- Status: MISSING.

Appendix: Evidence Pack
- docs/canon/00-repo-truth.md
- docs/canon/01-phase-map-F00-F15.md
- docs/canon/02-module-catalog.md
- docs/canon/03-diff-vs-canon.md
- docs/repo-snapshots/canon-refresh-20260118-132825
