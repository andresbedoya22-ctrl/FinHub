# A2: Document Pipeline v2 (hardening)

This runbook describes required env vars, how to run tests, and a minimal smoke test using API routes.

## Required env vars

Set these in your shell or `.env.local`:

- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY

Optional (recommended for deterministic tests and local smoke):

- FINHUB_OCR_PROVIDER=mock
- FINHUB_OCR_MIN_CONFIDENCE=0.45
- FINHUB_DOC_MAX_BYTES=10485760

## Run tests (Vitest)

```bash
pnpm test -- --runTestsByPath src/__tests__/caseDocuments.pipeline.test.ts
```

If the required Supabase env vars are missing, the test will skip with a clear message.

## Minimal local smoke test via API routes

Prerequisites:
- `pnpm dev`
- An existing user account (email + password)
- A local file `./tmp/a2-sample.pdf`

1) Login and capture session cookies:

```bash
curl -sS -c .cookies \
  -X POST http://localhost:3000/api/auth/login \
  -H "content-type: application/json" \
  -d '{"email":"you@example.com","password":"your-password"}'
```

2) Create a case:

```bash
curl -sS -b .cookies \
  -X POST http://localhost:3000/api/cases \
  -H "content-type: application/json" \
  -d '{"type":"toeslagen","productSlug":"huurtoeslag","title":"A2 pipeline smoke"}'
```

Capture `id` from the response as `CASE_ID`.

3) Prepare upload token:

```bash
curl -sS -b .cookies \
  -X POST http://localhost:3000/api/documents/upload \
  -H "content-type: application/json" \
  -d '{"fileName":"a2-sample.pdf","type":"other"}'
```

Capture `doc.id`, `bucket`, `path`, `token` as `DOC_ID`, `BUCKET`, `PATH`, `TOKEN`.

4) Upload the file to the signed URL (server-mediated):

```bash
curl -sS -b .cookies \
  -X POST http://localhost:3000/api/documents/upload-to-signed \
  -F file=@./tmp/a2-sample.pdf \
  -F bucket="$BUCKET" \
  -F path="$PATH" \
  -F token="$TOKEN"
```

5) Attach document to the case:

```bash
curl -sS -b .cookies \
  -X POST http://localhost:3000/api/cases/$CASE_ID/documents \
  -H "content-type: application/json" \
  -d '{"documentId":"'$DOC_ID'"}'
```

Capture `id` from the response as `CASE_DOC_ID`.

6) Mark the case document as validating:

```bash
curl -sS -b .cookies \
  -X PATCH http://localhost:3000/api/cases/$CASE_ID/documents/$CASE_DOC_ID \
  -H "content-type: application/json" \
  -d '{"status":"validating"}'
```

7) Validate the document (OCR + rules):

```bash
curl -sS -b .cookies \
  -X POST http://localhost:3000/api/documents/validate \
  -H "content-type: application/json" \
  -d '{"documentId":"'$DOC_ID'"}'
```

8) Persist validation outcome to the case document (use the response from step 7):

```bash
curl -sS -b .cookies \
  -X PATCH http://localhost:3000/api/cases/$CASE_ID/documents/$CASE_DOC_ID \
  -H "content-type: application/json" \
  -d '{"status":"validated","validationReason":null,"validationMeta":{}}'
```

Replace `status`, `validationReason`, and `validationMeta` with the actual values returned by step 7.

9) Confirm case detail includes the document:

```bash
curl -sS -b .cookies http://localhost:3000/api/cases/$CASE_ID
```

You should see the document entry with status and validation fields in `documents`.
