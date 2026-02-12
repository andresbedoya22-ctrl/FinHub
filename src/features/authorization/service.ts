import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveAuthorizationTransition } from "./rules";
import type { AuthorizationCaseRef, AuthorizationEvent, AuthorizationStatus } from "./types";

type CaseRow = {
  id: string;
  type: string;
  authorization_status: string | null;
};

type CaseDocumentRow = {
  case_id: string | null;
  case?: CaseRow | CaseRow[] | null;
};

function normalizeCase(row: CaseDocumentRow): AuthorizationCaseRef | null {
  const caseRow = Array.isArray(row.case) ? row.case[0] ?? null : row.case ?? null;
  const caseId = typeof row.case_id === "string" ? row.case_id : caseRow?.id;
  if (!caseRow || !caseId) return null;
  return {
    caseId,
    caseType: caseRow.type as AuthorizationCaseRef["caseType"],
    authorizationStatus: (caseRow.authorization_status ?? "not_started") as AuthorizationStatus,
  };
}

async function updateCaseAuthorizationStatus(
  supabase: SupabaseClient,
  caseId: string,
  nextStatus: AuthorizationStatus
): Promise<void> {
  const { error } = await supabase
    .from("cases")
    .update({ authorization_status: nextStatus, updated_at: new Date().toISOString() })
    .eq("id", caseId);

  if (error) throw new Error(error.message);
}

export async function applyAuthorizationEventToCase(
  supabase: SupabaseClient,
  caseRef: AuthorizationCaseRef,
  event: AuthorizationEvent
): Promise<boolean> {
  const next = resolveAuthorizationTransition(caseRef, event);
  if (!next) return false;
  await updateCaseAuthorizationStatus(supabase, caseRef.caseId, next);
  return true;
}

export async function markAuthorizationReceivedFromConsent(
  supabase: SupabaseClient,
  caseId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("cases")
    .select("id,type,authorization_status")
    .eq("id", caseId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Case not found");

  return applyAuthorizationEventToCase(
    supabase,
    {
      caseId: String(data.id),
      caseType: String(data.type) as AuthorizationCaseRef["caseType"],
      authorizationStatus: String(data.authorization_status ?? "not_started") as AuthorizationStatus,
    },
    "consent_granted"
  );
}

export async function markAuthorizationVerifiedFromDocument(
  supabase: SupabaseClient,
  documentId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from("case_documents")
    .select("case_id,case:cases(id,type,authorization_status)")
    .eq("document_id", documentId);

  if (error) throw new Error(error.message);

  const linkedCases = (data ?? [])
    .map((row) => normalizeCase(row as CaseDocumentRow))
    .filter((row): row is AuthorizationCaseRef => Boolean(row));

  const updated: string[] = [];
  for (const caseRef of linkedCases) {
    const changed = await applyAuthorizationEventToCase(supabase, caseRef, "activation_code_verified");
    if (changed) updated.push(caseRef.caseId);
  }
  return updated;
}

