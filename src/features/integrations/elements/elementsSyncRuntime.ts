import { createSupabaseAdminClient } from "@/lib/supabaseAdminClient";
import { createElementsClientFromEnv } from "./elementsClient";
import { syncCaseToElementsById, type SyncSummary } from "./elementsSyncService";

export async function syncCaseToElementsIfConfigured(caseId: string): Promise<SyncSummary | null> {
  const required = [
    process.env.ELEMENTS_BASE_URL,
    process.env.ELEMENTS_TOKEN_URL,
    process.env.ELEMENTS_CLIENT_ID,
    process.env.ELEMENTS_CLIENT_SECRET,
  ];

  if (required.some((value) => !value || value.trim().length === 0)) {
    return null;
  }

  const supabase = createSupabaseAdminClient();
  const elementsClient = createElementsClientFromEnv();
  return syncCaseToElementsById(supabase, elementsClient, caseId);
}
