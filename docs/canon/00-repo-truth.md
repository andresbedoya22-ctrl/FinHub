# Repo Truth (F00-F15)

Sources:
- docs/repo-snapshots/canon-refresh-20260118-132825 (routes-pages.txt, routes-api.txt, migrations-list.txt, env-keys-env.local.txt, modules-dirs.txt, tests.txt, tree-src.txt, tree-docs.txt, tree-supabase.txt, integrations-grep.txt)
- Direct inspection: src/app/(dashboard)/app/page.tsx, rg auth.getUser in src/app/api, supabase/migrations/* (create table and RLS scans)

Repo truth summary
- UI routes: 36 App Router pages under (auth), (dashboard), (marketing) (docs/repo-snapshots/canon-refresh-20260118-132825/routes-pages.txt).
- API routes: 35 route handlers under /api (docs/repo-snapshots/canon-refresh-20260118-132825/routes-api.txt).
- Module groups: src/domain/subsidies, src/features/*, src/lib/db/subsidies, src/lib/supabase, src/ui/*, src/components/subsidies (docs/repo-snapshots/canon-refresh-20260118-132825/modules-dirs.txt, docs/repo-snapshots/canon-refresh-20260118-132825/tree-src.txt).
- DB migrations: 33 SQL migrations (docs/repo-snapshots/canon-refresh-20260118-132825/migrations-list.txt).
- Env keys (.env.local inventory): NEXT_PUBLIC_SENTRY_DSN, NEXT_PUBLIC_SENTRY_ENABLED, NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_SUPABASE_URL, SENTRY_DSN, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SUPABASE_SERVICE_ROLE_KEY (docs/repo-snapshots/canon-refresh-20260118-132825/env-keys-env.local.txt).
- Tests: 13 test files (docs/repo-snapshots/canon-refresh-20260118-132825/tests.txt).

System map (concise)
- Web UI: Next.js App Router with marketing, auth, and dashboard route groups (docs/repo-snapshots/canon-refresh-20260118-132825/routes-pages.txt).
- API: Route handlers under src/app/api for auth, documents, finances, payments, stripe webhook, subsidies checkout, assistant chat (docs/repo-snapshots/canon-refresh-20260118-132825/routes-api.txt).
- Domain: Subsidies eligibility engine + calculators in src/domain/subsidies/* (docs/repo-snapshots/canon-refresh-20260118-132825/tree-src.txt).
- Data: Supabase tables and RLS from migrations (supabase/migrations/*.sql; see DB summary below).
- Integrations: Supabase (clients + auth), Stripe Checkout + webhook, OpenAI LLM provider, Azure Document Intelligence OCR (docs/repo-snapshots/canon-refresh-20260118-132825/integrations-grep.txt; src/features/documents/ocr/README.md).

UI routes (App Router)
Evidence: docs/repo-snapshots/canon-refresh-20260118-132825/routes-pages.txt. Purposes are derived from route names; deeper behavior is NO EVIDENCE unless linked.

| Path | Purpose (from path) | Primary modules |
| --- | --- | --- |
| / | Marketing root page | src/app/page.tsx |
| /landing | Marketing landing | src/app/(marketing)/landing/page.tsx; src/app/(marketing)/landing/ui/* |
| /privacy | Marketing privacy | src/app/(marketing)/privacy/page.tsx |
| /terms | Marketing terms | src/app/(marketing)/terms/page.tsx |
| /login | Auth login | src/app/(auth)/login/page.tsx; src/app/(auth)/login/ui/LoginClient.tsx |
| /register | Auth register | src/app/(auth)/register/page.tsx; src/app/(auth)/register/ui/RegisterClient.tsx |
| /forgot-password | Auth forgot password | src/app/(auth)/forgot-password/page.tsx; src/app/(auth)/forgot-password/ui/ForgotPasswordClient.tsx |
| /reset-password | Auth reset password | src/app/(auth)/reset-password/page.tsx; src/app/(auth)/reset-password/ui/ResetPasswordClient.tsx |
| /app | Dashboard entry (redirect) | src/app/(dashboard)/app/page.tsx |
| /app/finances | Finances dashboard | src/app/(dashboard)/app/finances/page.tsx; src/features/finances/* |
| /app/finances/transactions | Finances transactions list | src/app/(dashboard)/app/finances/transactions/page.tsx |
| /app/finances/transactions/new | Finances new transaction | src/app/(dashboard)/app/finances/transactions/new/page.tsx |
| /app/finances/transactions/[id] | Finances transaction detail | src/app/(dashboard)/app/finances/transactions/[id]/page.tsx |
| /app/cases | Cases list | src/app/(dashboard)/app/cases/page.tsx; src/features/cases/* |
| /app/cases/new | New case | src/app/(dashboard)/app/cases/new/page.tsx |
| /app/cases/[id] | Case detail | src/app/(dashboard)/app/cases/[id]/page.tsx |
| /app/cases/[id]/[stepKey] | Case step | src/app/(dashboard)/app/cases/[id]/[stepKey]/page.tsx |
| /app/documents | Documents list | src/app/(dashboard)/app/documents/page.tsx; src/features/documents/* |
| /app/documents/ocr-review | OCR review list | src/app/(dashboard)/app/documents/ocr-review/page.tsx |
| /app/documents/ocr-review/[id] | OCR review detail | src/app/(dashboard)/app/documents/ocr-review/[id]/page.tsx |
| /app/profile | Profile | src/app/(dashboard)/app/profile/page.tsx |
| /app/profile/whoami | Profile whoami | src/app/(dashboard)/app/profile/whoami/page.tsx |
| /app/subsidies | Subsidies home | src/app/(dashboard)/app/subsidies/page.tsx; src/components/subsidies/*; src/domain/subsidies/* |
| /app/subsidies/[slug] | Subsidy detail | src/app/(dashboard)/app/subsidies/[slug]/page.tsx |
| /app/subsidies/[slug]/wizard | Subsidy wizard | src/app/(dashboard)/app/subsidies/[slug]/wizard/page.tsx; src/domain/subsidies/* |
| /app/subsidies/[slug]/result | Subsidy eligibility result | src/app/(dashboard)/app/subsidies/[slug]/result/page.tsx |
| /app/subsidies/[slug]/checkout | Subsidy checkout | src/app/(dashboard)/app/subsidies/[slug]/checkout/page.tsx |
| /app/subsidies/applications | Subsidy applications list | src/app/(dashboard)/app/subsidies/applications/page.tsx; src/lib/db/subsidies/client.ts |
| /app/subsidies/applications/[id] | Subsidy application detail | src/app/(dashboard)/app/subsidies/applications/[id]/page.tsx |
| /app/admin | Admin home | src/app/(dashboard)/app/admin/page.tsx |
| /app/admin/cases | Admin cases | src/app/(dashboard)/app/admin/cases/page.tsx |
| /app/admin/documents | Admin documents | src/app/(dashboard)/app/admin/documents/page.tsx |
| /app/admin/subsidies | Admin subsidies | src/app/(dashboard)/app/admin/subsidies/page.tsx; src/lib/db/subsidies/adminClient.ts |
| /app/admin/users | Admin users | src/app/(dashboard)/app/admin/users/page.tsx |
| /app/ui-kit | UI kit | src/app/(dashboard)/app/ui-kit/page.tsx |

API routes (Next route handlers)
Evidence: docs/repo-snapshots/canon-refresh-20260118-132825/routes-api.txt; auth guards from rg auth.getUser in src/app/api. Auth assumptions are only asserted when the route code calls supabase.auth.getUser; otherwise NO EVIDENCE.

| Path | Purpose (from path) | Auth assumptions | Integrations |
| --- | --- | --- | --- |
| /api/admin/documents/signed-url | Admin documents signed URL | Supabase auth.getUser | Supabase |
| /api/assistant/chat | Assistant chat | Supabase auth.getUser | OpenAI, Supabase |
| /api/auth/forgot-password | Auth reset email | Supabase server client | Supabase Auth |
| /api/auth/login | Auth login | Supabase server client | Supabase Auth |
| /api/auth/logout | Auth logout | Supabase server client | Supabase Auth |
| /api/auth/oauth/start | Auth OAuth start | Supabase server client | Supabase Auth |
| /api/auth/register | Auth register | Supabase server client | Supabase Auth |
| /api/auth/resend-verification | Auth resend verification | Supabase server client | Supabase Auth |
| /api/auth/reset-password | Auth reset password | Supabase server client | Supabase Auth |
| /api/debug/admin | Debug admin | Supabase auth.getUser | Supabase |
| /api/debug/cookies | Debug cookies | NO EVIDENCE | NO EVIDENCE |
| /api/debug/documents | Debug documents | Supabase auth.getUser | Supabase |
| /api/debug/i18n | Debug i18n | NO EVIDENCE | NO EVIDENCE |
| /api/documents | Documents list/create | Supabase auth.getUser | Supabase |
| /api/documents/my | Documents my | Supabase auth.getUser | Supabase |
| /api/documents/[id] | Document detail/update/delete | Supabase auth.getUser | Supabase |
| /api/documents/[id]/extraction | OCR extraction | Supabase auth.getUser | Supabase, OCR |
| /api/documents/[id]/ocr | OCR run | Supabase auth.getUser | Supabase, OCR |
| /api/documents/[id]/verify | OCR verify | Supabase auth.getUser | Supabase |
| /api/finances/bootstrap | Finances bootstrap | Supabase auth.getUser | Supabase |
| /api/finances/ledger | Finances ledger | Supabase auth.getUser | Supabase |
| /api/finances/ledger/seed | Finances ledger seed | Supabase auth.getUser | Supabase |
| /api/finances/receipt-links | Receipt links | Supabase auth.getUser | Supabase |
| /api/finances/transactions | Transactions list/create | Supabase auth.getUser | Supabase |
| /api/finances/transactions/[id] | Transaction detail/update/delete | Supabase auth.getUser | Supabase |
| /api/finances/transactions/[id]/splits | Transaction splits | Supabase auth.getUser | Supabase |
| /api/i18n/locale | Locale set/get | NO EVIDENCE | NO EVIDENCE |
| /api/marketing/leads | Marketing leads | Supabase server client | Supabase |
| /api/payments/checkout | Payments checkout | Supabase auth.getUser | Stripe, Supabase |
| /api/payments/status | Payments status | Supabase auth.getUser | Supabase |
| /api/profile/delete | Profile delete | Supabase auth.getUser | Supabase |
| /api/profile/export | Profile export | Supabase auth.getUser | Supabase |
| /api/stripe/webhook | Stripe webhook | NO EVIDENCE | Stripe, Supabase |
| /api/subsidies/checkout | Subsidies checkout | Supabase auth.getUser | Stripe (ideal + card), Supabase |

DB summary
Evidence: supabase/migrations/*.sql (see scans below) + docs/repo-snapshots/canon-refresh-20260118-132825/migrations-list.txt.

Migrations list (by filename)
- 20251222194856_expand_case_step_keys.sql
- 20251222195258_expand_case_step_keys_v2.sql
- 20251222210000_schema_v1.sql
- 20251222210010_rls_v1.sql
- 20251222210144_admin_roles_and_policies.sql
- 20251222210317_seed_admin_role.sql
- 20251223214703_add_notes_to_documents.sql
- 20251223215020_add_status_to_documents.sql
- 20251223215300_align_documents_columns.sql
- 20251223215816_align_documents_schema.sql
- 20251223220143_documents_storage_path_nullable.sql
- 20251226113642_align_documents_contract.sql
- 20251226113916_storage_vault_bucket_and_policies.sql
- 20251226114843_documents_status_check_fix.sql
- 20251226133000_payments_stripe_unique_indexes.sql
- 20251226174819_sync_step_key_constraints.sql
- 20251226183045_enforce_paid_to_access_locked_steps.sql
- 20251226210000_fix_documents_status_check.sql
- 20251226220000_documents_ocr_v1.sql
- 20251227130000_fix_documents_type_remove_machtigingsregistratie.sql
- 20251227141000_add_documents_ocr_kind.sql
- 20251227200908_documents_type_allow_machtigingsregistratie.sql
- 20251227202547_documents_rls_drop_admin_policy.sql
- 20251231221500_marketing_leads_v1.sql
- 20260102145406_marketing_leads_v2.sql
- 20260110123957_finance_core_v1.sql
- 20260110124002_finance_core_rls_v1.sql
- 20260113101000_subsidies_v1.sql
- 20260113102000_storage_subsidies_bucket.sql

Key tables (from create table scans)
- Core schema (20251222210000_schema_v1.sql): profiles, cases, case_step_data, documents, payments, consents.
- Documents OCR (20251226220000_documents_ocr_v1.sql): document_ocr_runs, document_extractions, document_reviews.
- Marketing leads (20251231221500_marketing_leads_v1.sql): marketing_leads.
- Finance core (20260110123957_finance_core_v1.sql): finance_categories, finance_transactions, finance_transaction_splits, finance_user_plans, finance_fixed_budgets, finance_rules_v1, finance_receipt_links.
- Subsidies (20260113101000_subsidies_v1.sql): subsidies_policy, subsidies_applications, subsidies_documents, subsidies_admin_notes, audit_log.

RLS notes (from RLS scans)
- Core RLS policies applied for profiles, cases, case_step_data, documents, payments, consents (20251222210010_rls_v1.sql).
- Finance RLS policies applied for finance_* tables (20260110124002_finance_core_rls_v1.sql).
- Subsidies RLS policies applied for subsidies_* + audit_log (20260113101000_subsidies_v1.sql).

Integrations
- Supabase: server, admin, and browser clients in src/lib/*; auth used in many API routes (docs/repo-snapshots/canon-refresh-20260118-132825/integrations-grep.txt).
- Stripe: checkout and webhook routes; payments unique indexes migration (docs/repo-snapshots/canon-refresh-20260118-132825/integrations-grep.txt).
- Stripe iDEAL: payment_method_types includes ideal in src/app/api/subsidies/checkout/route.ts (rg iDEAL, rg stripe in repo).
- OpenAI: provider and /api/assistant/chat (docs/repo-snapshots/canon-refresh-20260118-132825/integrations-grep.txt).
- OCR: Azure Document Intelligence provider and OCR routes (src/features/documents/ocr/README.md; tree-src.txt).

Test coverage map
Evidence: docs/repo-snapshots/canon-refresh-20260118-132825/tests.txt.
- Domain: Subsidies calculators tests (src/domain/subsidies/calculators/__tests__/*).
- UI lib: formatCurrency tests (src/ui/lib/__tests__/formatCurrency.test.ts).
- Documents OCR: registry and schema tests (src/features/documents/*).
- Observability: productTelemetry test (src/__tests__/productTelemetry.test.ts).
- Smoke and OCR guard tests (src/__tests__/smoke.test.ts, src/__tests__/ocrGuard.test.ts).
