# Phase Map F00-F15

Sources:
- docs/repo-snapshots/canon-refresh-20260118-132825 (routes-pages.txt, routes-api.txt, migrations-list.txt, env-keys-env.local.txt, modules-dirs.txt, tests.txt, tree-src.txt, tree-docs.txt, tree-supabase.txt, integrations-grep.txt)
- Direct inspection: src/app/(dashboard)/app/page.tsx, rg auth.getUser in src/app/api, supabase/migrations/* (create table and RLS scans)

Status legend: DONE, PARTIAL, MISSING, NO EVIDENCE.

## F00 - Descubrimiento tecnico
Objective (from Canon): Document repo baseline: routes, features, integrations, local CI status, architecture maps, and ADR scope.

Implementation evidence
- Snapshot inventory files exist in docs/repo-snapshots/canon-refresh-20260118-132825/*.
- Architecture docs present in docs/architecture/* (docs/repo-snapshots/canon-refresh-20260118-132825/tree-docs.txt).
- ADR scope file present in docs/decisions/adr-0001-canon2-scope.md (docs/repo-snapshots/canon-refresh-20260118-132825/tree-docs.txt).

DoD status: DONE.
Gaps and follow-ups
- NO EVIDENCE: current canon baseline commands/outputs are not stored in this snapshot set beyond the inventory files.

## F01 - i18n Foundation P0
Objective (from Canon): i18n skeleton before Landing/Auth/Finny, EN as default, base support for EN/ES/PL/RO.

Implementation evidence
- i18n runtime + messages: src/i18n/config.ts, src/i18n/getLocale.ts, src/i18n/getMessages.ts, src/i18n/request.ts, src/i18n/I18nProvider.tsx, src/i18n/messages/{en,es,pl,ro}.json (docs/repo-snapshots/canon-refresh-20260118-132825/tree-src.txt).
- i18n decision + coverage matrix docs: docs/i18n/i18n-decision.md, docs/i18n/coverage-matrix.md (docs/repo-snapshots/canon-refresh-20260118-132825/tree-docs.txt).
- API locale endpoint: /api/i18n/locale (docs/repo-snapshots/canon-refresh-20260118-132825/routes-api.txt).

DoD status: DONE.
Gaps and follow-ups
- NO EVIDENCE: email i18n (Canon requires UI + emails); no email templates/routes found in snapshot.

## F02 - Landing Premium + Captacion
Objective (from Canon): Multi-language landing, lead capture, consent, telemetry; SEO advanced deferred.

Implementation evidence
- UI routes: /landing, /privacy, /terms (docs/repo-snapshots/canon-refresh-20260118-132825/routes-pages.txt).
- Lead capture API: /api/marketing/leads (docs/repo-snapshots/canon-refresh-20260118-132825/routes-api.txt).
- Marketing leads migrations: 20251231221500_marketing_leads_v1.sql and 20260102145406_marketing_leads_v2.sql (docs/repo-snapshots/canon-refresh-20260118-132825/migrations-list.txt).
- Marketing module: src/features/marketing/* (docs/repo-snapshots/canon-refresh-20260118-132825/tree-src.txt).

DoD status: DONE (as evidenced by routes + migrations + modules).
Gaps and follow-ups
- SEO advanced features are explicitly deferred in Canon; NO EVIDENCE of JSON-LD/advanced metadata beyond route presence.

## F03 - Auth/Login Premium
Objective (from Canon): Full auth flows with validation, error mapping, and security hardening.

Implementation evidence
- UI routes: /login, /register, /forgot-password, /reset-password (routes-pages.txt).
- API routes: /api/auth/* (routes-api.txt).
- Supabase auth integration in routes (rg supabase in src/app/api/auth).
- Auth helpers: src/features/auth/* (tree-src.txt).

DoD status: DONE (routes + auth integration evidence).
Gaps and follow-ups
- NO EVIDENCE: captcha or additional abuse controls beyond current code (not required by Canon if rate limiting used).

## F04 - Finny v2 (OpenAI API + playbooks + operator mode)
Objective (from Canon): Finny v2 with OpenAI Responses API, playbooks, operator mode, audit, i18n.

Implementation evidence
- API route: /api/assistant/chat (routes-api.txt) with OpenAI usage (integrations-grep.txt).
- LLM provider: src/features/ai/llm/openaiLlmProvider.ts and getLlmProvider.ts (integrations-grep.txt).
- Finny UI module: src/features/assistant/finny/* (tree-src.txt).

DoD status: PARTIAL.
Gaps and follow-ups
- NO EVIDENCE: Playbooks by language or operator/admin mode UI.
- NO EVIDENCE: audit/telemetry specific to Finny beyond generic product telemetry.

## F05 - Captacion post-registro (lifecycle)
Objective (from Canon): lifecycle email flows, provider selection, templates, throttling, campaigns, admin view.

Implementation evidence
- NO EVIDENCE: No lifecycle email provider modules, routes, env keys, or templates in snapshot.

DoD status: MISSING.
Gaps and follow-ups
- Missing provider selection, templates, throttling, campaign admin view, and QA evidence.

## F10 - Re-ensamble navegacion y Home (Finanzas como centro)
Objective (from Canon): /app redirects to finances and dashboard nav centered on finances.

Implementation evidence
- /app route exists and redirects to /app/finances (src/app/(dashboard)/app/page.tsx).
- Finances UI route present: /app/finances (routes-pages.txt).
- Command palette and dashboard UI exist under src/app/(dashboard)/app/ui/* (tree-src.txt).

DoD status: DONE.
Gaps and follow-ups
- NO EVIDENCE: navigation analytics or explicit QA records beyond route presence.

## F11 - Finanzas Personales v2
Objective (from Canon): finance core data model, UI, OCR to transaction, transactions edit/splits, manual create.

Implementation evidence
- Finance core migrations + RLS: 20260110123957_finance_core_v1.sql and 20260110124002_finance_core_rls_v1.sql.
- UI routes: /app/finances, /app/finances/transactions, /app/finances/transactions/[id], /app/finances/transactions/new.
- API routes: /api/finances/* and /api/finances/transactions/*.
- Finance feature module: src/features/finances/*.
- Receipt links API: /api/finances/receipt-links (routes-api.txt).
- Tests: src/ui/lib/__tests__/formatCurrency.test.ts (tests.txt).

DoD status: PARTIAL.
Gaps and follow-ups
- NO EVIDENCE: explicit OCR to transaction flow documented in code or tests beyond API presence.
- NO EVIDENCE: CSV export tests; only code file name suggests CSV support (src/features/finances/financesCsv.ts).

## F12 - Subsidios/Toeslagen Premium
Objective (from Canon): eligibility -> result -> checkout -> authorization -> docs -> review -> done, with admin and i18n.

Implementation evidence
- UI routes: /app/subsidies, /app/subsidies/[slug], /wizard, /result, /checkout, /applications, /applications/[id] (routes-pages.txt).
- Admin route: /app/admin/subsidies (routes-pages.txt).
- API route: /api/subsidies/checkout (routes-api.txt).
- Subsidies domain + calculators: src/domain/subsidies/* and src/domain/subsidies/calculators/* (tree-src.txt).
- Subsidies DB access: src/lib/db/subsidies/*; referenced by subsidies UI and admin UI (rg lib/db/subsidies).
- Subsidies migrations + RLS: 20260113101000_subsidies_v1.sql, 20260113102000_storage_subsidies_bucket.sql.
- Stripe checkout with ideal + card in /api/subsidies/checkout (rg iDEAL; rg stripe).
- Tests: calculators tests in src/domain/subsidies/calculators/__tests__/*.

DoD status: PARTIAL.
Gaps and follow-ups
- NO EVIDENCE: Case Engine reuse for subsidies (no /app/cases integration for subsidies flow).
- NO EVIDENCE: explicit authorization Modo A flow beyond document checklist text and OCR infra.
- NO EVIDENCE: admin SLA tooling beyond admin page presence.

## A1 - Case Engine v1 (backbone)
Objective: Provide a shared Case Engine for toeslagen/taxes/mortgage/credit/insurance with RLS, API, and minimal UI.

Implementation evidence
- DB + RLS: 20260123090000_case_engine_v1.sql (cases, case_tasks, case_documents + policies).
- Runbook: docs/runbooks/A1_apply_migration_supabase.md.
- API routes: /api/cases, /api/cases/[id], /api/cases/[id]/tasks, /api/cases/[id]/documents.
- UI routes: /app/cases, /app/cases/new, /app/cases/[id], /app/cases/[id]/[stepKey].
- Tests: src/__tests__/cases.api.test.ts (RLS baseline; skips without Supabase env).
- PR/commit: b6c5504 (PR #60).

DoD status: DONE (code). DONE (DB) once runbook executed.
Gaps and follow-ups
- NO EVIDENCE: A2 document pipeline hardening (validation/OCR + sync-ready).
- NO EVIDENCE: async jobs/queues for background processing.

## F13 - Taxes Pro
Objective (from Canon): taxes wizard, internal sections, tax pack generator, admin notes + workflow.

Implementation evidence
- NO EVIDENCE: No taxes routes, modules, or migrations in snapshot.

DoD status: MISSING.
Gaps and follow-ups
- All F13 subphases missing in repo.

## F14 - Creditos personales
Objective (from Canon): credit eligibility, case type, document checklist, admin workflow.

Implementation evidence
- NO EVIDENCE: No credits routes, modules, or migrations in snapshot.

DoD status: MISSING.
Gaps and follow-ups
- All F14 subphases missing in repo.

## F15 - Seguros v2
Objective (from Canon): policy inventory with OCR, insurance intake case, consented suggestions.

Implementation evidence
- NO EVIDENCE: No insurance routes, modules, or migrations in snapshot.

DoD status: MISSING.
Gaps and follow-ups
- All F15 subphases missing in repo.

Out of scope (post-F15)
- Canon contains F16 (mortgages) and beyond in .tmp/canon-operativo.txt; this audit stops at F15 per request. Evidence: .tmp/canon-operativo.txt lines around F16 (extracted from docs/canon/CANON_OPERATIVO.md).
