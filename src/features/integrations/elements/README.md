# Elements Connector v1 (B1 + B2 base)

This module provides an adapter-first integration client for Elements:

- OAuth2 client credentials token provider with in-memory refresh.
- Typed HTTP wrapper with retries/backoff for transient failures.
- Optional idempotency key header support.
- Runtime env validation via `assertElementsConnectorEnv`.
- B2 sync service for cases/tasks/validated documents with idempotent `external_refs` tracking.

## Usage

```ts
import { createElementsClientFromEnv, syncCaseToElementsById } from "@/features/integrations/elements";
import { createSupabaseAdminClient } from "@/lib/supabaseAdminClient";

const supabase = createSupabaseAdminClient();
const client = createElementsClientFromEnv();

await syncCaseToElementsById(supabase, client, "case_123");
```

## Required env vars

- `ELEMENTS_BASE_URL`
- `ELEMENTS_TOKEN_URL`
- `ELEMENTS_CLIENT_ID`
- `ELEMENTS_CLIENT_SECRET`
- `ELEMENTS_SCOPE` (optional)
