import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "../../../lib/supabaseAdminClient";
import type { CaseStatus } from "../../cases/casesTypes";

export type ElementsWebhookEvent = {
  externalCaseId: string;
  status: string;
  eventType?: string;
  occurredAt?: string;
  metadata?: Record<string, unknown>;
};

export type ReverseSyncResult = {
  ok: true;
  caseId: string;
  status: CaseStatus;
};

const CASE_STATUS_VALUES: ReadonlySet<CaseStatus> = new Set([
  "created",
  "in_progress",
  "waiting_user",
  "ready_for_review",
  "submitted",
  "under_review",
  "completed",
  "cancelled",
]);

function toCaseStatus(raw: string): CaseStatus {
  const normalized = raw.trim().toLowerCase();
  const map: Record<string, CaseStatus> = {
    created: "created",
    draft: "created",
    in_progress: "in_progress",
    inprogress: "in_progress",
    waiting_user: "waiting_user",
    waiting_for_client: "waiting_user",
    ready_for_review: "ready_for_review",
    review_ready: "ready_for_review",
    submitted: "submitted",
    sent: "submitted",
    under_review: "under_review",
    processing: "under_review",
    completed: "completed",
    done: "completed",
    cancelled: "cancelled",
    canceled: "cancelled",
  };

  const mapped = map[normalized] ?? (normalized as CaseStatus);
  if (!CASE_STATUS_VALUES.has(mapped)) {
    throw new Error(`Unsupported Elements status: ${raw}`);
  }

  return mapped;
}

function parseOccurredAt(value?: string): string {
  if (!value) return new Date().toISOString();
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return new Date().toISOString();
  return parsed.toISOString();
}

export async function processElementsReverseSync(
  event: ElementsWebhookEvent,
  supabase: SupabaseClient = createSupabaseAdminClient()
): Promise<ReverseSyncResult> {
  const externalCaseId = event.externalCaseId?.trim();
  if (!externalCaseId) {
    throw new Error("externalCaseId is required");
  }

  const status = toCaseStatus(event.status);

  const ref = await supabase
    .from("external_refs")
    .select("case_id")
    .eq("provider", "elements")
    .eq("entity_type", "case")
    .eq("external_id", externalCaseId)
    .maybeSingle();

  if (ref.error) throw new Error(ref.error.message);
  if (!ref.data?.case_id) throw new Error("External case reference not found");

  const caseId = String(ref.data.case_id);

  const upd = await supabase
    .from("cases")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", caseId)
    .select("id")
    .single();

  if (upd.error || !upd.data) throw new Error(upd.error?.message ?? "Failed to update case status");

  const caseOwner = await supabase.from("cases").select("user_id").eq("id", caseId).maybeSingle();
  if (caseOwner.error) throw new Error(caseOwner.error.message);

  const evt = await supabase.from("product_events").insert({
    user_id: caseOwner.data?.user_id ?? null,
    case_id: caseId,
    event_name: "elements.case.status.updated",
    payload: {
      provider: "elements",
      externalCaseId,
      status,
      eventType: event.eventType ?? "status_update",
      metadata: event.metadata ?? {},
    },
    occurred_at: parseOccurredAt(event.occurredAt),
  });

  if (evt.error) throw new Error(evt.error.message);

  return { ok: true, caseId, status };
}
