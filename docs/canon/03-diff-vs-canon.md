# Diff vs Canon (F00-F15)

Sources:
- docs/repo-snapshots/canon-refresh-20260118-132825 (routes-pages.txt, routes-api.txt, migrations-list.txt, tree-src.txt, integrations-grep.txt)
- docs/canon/CANON_OPERATIVO.md (current Canon structure and F00-F15 objectives)

Added in repo (not explicit in Canon)
- /app/ui-kit route present (docs/repo-snapshots/canon-refresh-20260118-132825/routes-pages.txt).
- /api/debug/* endpoints (admin, cookies, documents, i18n) present (docs/repo-snapshots/canon-refresh-20260118-132825/routes-api.txt).
- /api/profile/delete and /api/profile/export endpoints present (routes-api.txt).
- /app/profile/whoami route present (routes-pages.txt).
- Finance receipt links API /api/finances/receipt-links and seed endpoint /api/finances/ledger/seed present (routes-api.txt).
- A1 Case Engine v1 backbone: cases/case_tasks/case_documents tables + RLS, /api/cases* endpoints, /app/cases* UI, and RLS tests (20260123090000_case_engine_v1.sql; src/app/api/cases/*; src/app/(dashboard)/app/cases/*; src/__tests__/cases.api.test.ts).

Missing in repo (present in Canon)
- F05 lifecycle emails: no provider selection, templates, or admin campaigns (NO EVIDENCE in routes or modules).
- F13 Taxes Pro: no taxes UI routes or modules in snapshot (NO EVIDENCE).
- F14 Creditos personales: no credit case routes/modules (NO EVIDENCE).
- F15 Seguros v2: no insurance inventory routes/modules (NO EVIDENCE).
- F04 Operator mode / playbooks: no operator UI or playbooks modules (NO EVIDENCE).

Renamed/moved or scope drift
- Canon F12 suggests reusing Case Engine (case_step_data); repo implements a dedicated subsidies data model (subsidies_* tables in 20260113101000_subsidies_v1.sql) and separate /app/subsidies flow. This is a scope drift that should be made explicit in Canon.
- Canon F12 checklist includes Authorization Modo A; repo has OCR/machtigingsregistratie infra but no explicit authorization flow tied to subsidies (NO EVIDENCE of dedicated flow).

A1 (Case Engine v1) status
- Status: DONE (code, commit b6c5504 / PR #60). DB apply: DONE once runbook executed (docs/runbooks/A1_apply_migration_supabase.md).
- Adds: cases + case_tasks + case_documents tables, RLS policies, /api/cases* routes, /app/cases* UI, and RLS tests.
- Not included: A2 doc pipeline hardening, OCR pipeline validation, async jobs/queues.

Risk register (evidence-based)
- Payments: Stripe webhook and checkout routes exist; correctness depends on webhook signature handling and idempotency (src/app/api/stripe/webhook/route.ts; 20251226133000_payments_stripe_unique_indexes.sql).
- OCR: Azure OCR provider uses external API and env keys not listed in .env.local inventory (src/features/documents/ocr/providers/azureDocumentIntelligenceOcrTextProvider.ts; env-keys-env.local.txt lacks AZURE_*).
- Subsidies calculations: calculators are code-only and covered by unit tests; any policy updates require recalculation and test updates (src/domain/subsidies/calculators/*; tests in src/domain/subsidies/calculators/__tests__/*).
- i18n/SSR: i18n runtime relies on server-side locale resolution; errors in message files can break UI (src/i18n/*; scripts/fix-i18n-utf8.mjs).
- RLS: multiple RLS policies exist across core, finance, subsidies; policy drift is a risk without coverage tests (supabase/migrations/*_rls_*.sql).

Recommendations to update Canon text
- F04: mark Finny v2 as PARTIAL; document the current /api/assistant/chat and OpenAI provider, and explicitly note missing playbooks and operator mode.
- F05: mark as MISSING; add a placeholder section that lists required modules/routes and env keys, with NO EVIDENCE.
- F12: update to reflect subsidies_applications and related tables; state that flow is separate from cases. Add Stripe Checkout with iDEAL evidence from /api/subsidies/checkout.
- F11: cite finance_core migrations and /api/finances routes as the concrete implementation of finance core.
- i18n: document the concrete message files in src/i18n/messages and the utf-8 guard script (scripts/fix-i18n-utf8.mjs).
- Add A1 Case Engine v1 as a cross-cutting backbone (cases/case_tasks/case_documents, RLS, /api/cases*, /app/cases*).

Out of scope (post-F15)
- Canon includes phases beyond F15 (e.g., F16 mortgages). This audit stops at F15 per request (docs/canon/CANON_OPERATIVO.md).
