# Module Catalog

Sources:
- docs/repo-snapshots/canon-refresh-20260118-132825 (modules-dirs.txt, tree-src.txt, routes-pages.txt, routes-api.txt, tests.txt, integrations-grep.txt)
- Direct inspection: rg lib/db/subsidies usage in src/app; rg auth.getUser in src/app/api

Notes:
- Module purposes are derived from file names and observed imports; where behavior is not explicit, NO EVIDENCE is called out.

## src/domain/*

### src/domain/subsidies
- What it does: Eligibility engine, policy registry (2026), wizard schemas/store, and error mapping for subsidies (tree-src.txt).
- Entrypoints: Subsidies UI uses DEFAULT_POLICY_2026 and wizard store in src/app/(dashboard)/app/subsidies/[slug]/* (rg lib/db/subsidies).
- Data dependencies: NO EVIDENCE of direct DB access inside domain; data access appears in src/lib/db/subsidies/*.
- Security notes: NO EVIDENCE.
- Tests: Subsidies calculator tests under src/domain/subsidies/calculators/__tests__ (tests.txt).
- Evidence: src/domain/subsidies/* (tree-src.txt).

### src/domain/subsidies/calculators
- What it does: 2026 calculators for huurtoeslag, zorgtoeslag, kgb, kot (tree-src.txt).
- Entrypoints: imported via src/domain/subsidies/calculators/index.ts (tree-src.txt).
- Data dependencies: NO EVIDENCE.
- Security notes: NO EVIDENCE.
- Tests: src/domain/subsidies/calculators/__tests__/* (tests.txt).
- Evidence: src/domain/subsidies/calculators/* (tree-src.txt).

## src/features/*

### src/features/ai/llm
- What it does: LLM provider abstraction and OpenAI implementation (integrations-grep.txt).
- Entrypoints: /api/assistant/chat uses OpenAI directly (integrations-grep.txt); provider via getLlmProvider.ts.
- Data dependencies: NO EVIDENCE.
- Security notes: Uses OPENAI_API_KEY env (integrations-grep.txt); key not present in env-keys inventory.
- Tests: src/features/ai/llm/mockLlmProvider.test.ts (tests.txt).
- Evidence: src/features/ai/llm/* (tree-src.txt).

### src/features/assistant/finny
- What it does: Finny FAQ registry and UI widget (tree-src.txt).
- Entrypoints: UI widget likely mounted in app shell (tree-src.txt; NO EVIDENCE for specific mount).
- Data dependencies: NO EVIDENCE.
- Security notes: NO EVIDENCE.
- Tests: NO EVIDENCE.
- Evidence: src/features/assistant/finny/* (tree-src.txt).

### src/features/auth
- What it does: Auth helpers (errors, roles, safe redirects) (tree-src.txt).
- Entrypoints: /api/auth/* routes (routes-api.txt) use Supabase server client (rg supabase in src/app/api/auth).
- Data dependencies: Supabase Auth.
- Security notes: Auth handled server-side via Supabase client.
- Tests: NO EVIDENCE.
- Evidence: src/features/auth/* (tree-src.txt).

### src/features/cases
- What it does: Case engine client/store/config/steps (tree-src.txt).
- Entrypoints: /app/cases* routes (routes-pages.txt).
- Data dependencies: cases and case_step_data tables (supabase/migrations/20251222210000_schema_v1.sql).
- Security notes: RLS policies in 20251222210010_rls_v1.sql.
- Tests: NO EVIDENCE.
- Evidence: src/features/cases/* (tree-src.txt).

### src/features/documents
- What it does: Documents client/store/types and OCR schemas (tree-src.txt).
- Entrypoints: /app/documents* routes and /api/documents* routes.
- Data dependencies: documents, document_ocr_runs, document_extractions, document_reviews tables (migrations listed in DB summary).
- Security notes: RLS policies in 20251222210010_rls_v1.sql and 20251227202547_documents_rls_drop_admin_policy.sql.
- Tests: documentOcrRegistry.test.ts, machtigingsregistratieSchema.test.ts, document-schemas/registry.test.ts (tests.txt).
- Evidence: src/features/documents/* (tree-src.txt).

### src/features/documents/ocr
- What it does: OCR provider selection and text parsing (tree-src.txt).
- Entrypoints: /api/documents/[id]/ocr and /api/documents/[id]/extraction (routes-api.txt).
- Data dependencies: document_ocr_runs and document_extractions tables (migrations).
- Security notes: NO EVIDENCE beyond API auth guards.
- Tests: documentOcrRegistry.test.ts (tests.txt).
- Evidence: src/features/documents/ocr/* (tree-src.txt) and src/features/documents/ocr/README.md (integrations-grep.txt).

### src/features/finances
- What it does: Finances API clients, store, selectors, and UI helpers (tree-src.txt).
- Entrypoints: /app/finances* UI routes and /api/finances* API routes.
- Data dependencies: finance_* tables (20260110123957_finance_core_v1.sql).
- Security notes: RLS policies in 20260110124002_finance_core_rls_v1.sql.
- Tests: formatCurrency.test.ts (tests.txt).
- Evidence: src/features/finances/* (tree-src.txt).

### src/features/i18n
- What it does: Language normalization helper (tree-src.txt).
- Entrypoints: used by i18n request handling (src/i18n/getLocale.ts; tree-src.txt).
- Data dependencies: NO EVIDENCE.
- Security notes: NO EVIDENCE.
- Tests: NO EVIDENCE.
- Evidence: src/features/i18n/lang.ts (tree-src.txt).

### src/features/marketing
- What it does: Marketing leads client/store/types (tree-src.txt).
- Entrypoints: /api/marketing/leads (routes-api.txt) and /landing UI.
- Data dependencies: marketing_leads table (20251231221500_marketing_leads_v1.sql, 20260102145406_marketing_leads_v2.sql).
- Security notes: RLS for marketing leads not visible in scan; NO EVIDENCE of explicit policy in listed migrations.
- Tests: NO EVIDENCE.
- Evidence: src/features/marketing/* (tree-src.txt).

### src/features/observability
- What it does: Product telemetry wrapper (tree-src.txt).
- Entrypoints: used by marketing landing and other endpoints (integrations-grep.txt references).
- Data dependencies: NO EVIDENCE.
- Security notes: Test exists for non-PII telemetry.
- Tests: src/__tests__/productTelemetry.test.ts (tests.txt).
- Evidence: src/features/observability/productTelemetry.ts (tree-src.txt).

### src/features/payments
- What it does: Payment status hook (tree-src.txt).
- Entrypoints: likely used by payments UI; NO EVIDENCE for specific UI import.
- Data dependencies: payments table (20251222210000_schema_v1.sql) and Stripe provider data (20251226133000_payments_stripe_unique_indexes.sql).
- Security notes: Payments routes use Supabase auth.getUser (rg auth.getUser in src/app/api/payments).
- Tests: NO EVIDENCE.
- Evidence: src/features/payments/usePaymentStatus.ts (tree-src.txt).

## src/lib/*

### src/lib/db/subsidies
- What it does: Subsidies DB client/admin/policy utilities (tree-src.txt).
- Entrypoints: /api/subsidies/checkout and subsidies UI/admin pages import these clients (rg lib/db/subsidies).
- Data dependencies: subsidies_* tables and audit_log (20260113101000_subsidies_v1.sql).
- Security notes: RLS policies in 20260113101000_subsidies_v1.sql.
- Tests: NO EVIDENCE.
- Evidence: src/lib/db/subsidies/* (tree-src.txt).

### src/lib/supabase and supabase*Client
- What it does: Supabase admin/server/browser clients and middleware helpers (tree-src.txt).
- Entrypoints: most API routes use createSupabaseServerClient or supabaseRouteClient (integrations-grep.txt; rg auth.getUser).
- Data dependencies: Supabase Auth + DB.
- Security notes: SUPABASE_SERVICE_ROLE_KEY used in admin client (integrations-grep.txt).
- Tests: ocrGuard.test.ts uses supabase-like mocks (tests.txt).
- Evidence: src/lib/supabase/*.ts and src/lib/supabase*Client.ts (tree-src.txt).

## src/ui/*

### src/ui/components
- What it does: Shared UI components (buttons, cards, inputs, layout, stepper) (tree-src.txt).
- Entrypoints: used across app pages; NO EVIDENCE of specific import list in snapshot.
- Data dependencies: NO EVIDENCE.
- Security notes: NO EVIDENCE.
- Tests: NO EVIDENCE.
- Evidence: src/ui/components/* (tree-src.txt).

### src/ui/lib
- What it does: UI utilities including formatCurrency (tree-src.txt).
- Entrypoints: used by subsidies/finances UI; NO EVIDENCE of specific import list in snapshot.
- Data dependencies: NO EVIDENCE.
- Security notes: NO EVIDENCE.
- Tests: src/ui/lib/__tests__/formatCurrency.test.ts (tests.txt).
- Evidence: src/ui/lib/formatCurrency.ts (tree-src.txt).

## src/components/*

### src/components/subsidies
- What it does: Subsidy UI components (card, hero, icon, timeline) (tree-src.txt).
- Entrypoints: /app/subsidies page and detail UI (routes-pages.txt; tree-src.txt).
- Data dependencies: NO EVIDENCE.
- Security notes: NO EVIDENCE.
- Tests: NO EVIDENCE.
- Evidence: src/components/subsidies/* (tree-src.txt).
