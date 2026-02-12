# Elements Connector (B1 + B2 + B3 base)

This module provides an adapter-first integration stack for Elements:

- OAuth2 client credentials token provider with in-memory refresh.
- Typed HTTP wrapper with retries/backoff for transient failures.
- Optional idempotency key header support.
- Runtime env validation via `assertElementsConnectorEnv`.
- B2 sync service for cases/tasks/validated documents with idempotent `external_refs` tracking.
- B3 reverse sync service for Elements webhook updates -> FinHub case status + `product_events`.

## Usage

```ts
import { createElementsClientFromEnv, syncCaseToElementsById } from "@/features/integrations/elements";
import { createSupabaseAdminClient } from "@/lib/supabaseAdminClient";

const supabase = createSupabaseAdminClient();
const client = createElementsClientFromEnv();

await syncCaseToElementsById(supabase, client, "case_123");
```

## Reverse sync webhook

Route: `POST /api/integrations/elements/webhook`

Headers:
- `x-elements-webhook-secret: <ELEMENTS_WEBHOOK_SECRET>`

Body:
```json
{
  "externalCaseId": "ext_case_123",
  "status": "processing",
  "eventType": "workflow_updated",
  "occurredAt": "2026-02-12T10:30:00.000Z"
}
```

## Required env vars

- `ELEMENTS_BASE_URL`
- `ELEMENTS_TOKEN_URL`
- `ELEMENTS_CLIENT_ID`
- `ELEMENTS_CLIENT_SECRET`
- `ELEMENTS_SCOPE` (optional)
- `ELEMENTS_WEBHOOK_SECRET` (for reverse sync webhook)
