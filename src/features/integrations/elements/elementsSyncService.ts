import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCaseDetail } from "../../cases/casesService";
import type { CaseDetail, CaseDocumentEntry, CaseTask } from "../../cases/casesTypes";
import type { ElementsClient } from "./elementsClient";

export type SyncEntityType = "case" | "task" | "document";

type ExternalRef = {
  id: string;
  caseId: string;
  entityType: SyncEntityType;
  localId: string;
  externalId: string;
  payloadHash: string;
};

type CaseBundle = {
  detail: CaseDetail;
  tasks: CaseTask[];
  documents: CaseDocumentEntry[];
};

type SyncRepo = {
  getCaseBundle: (caseId: string) => Promise<CaseBundle | null>;
  getExternalRef: (entityType: SyncEntityType, localId: string) => Promise<ExternalRef | null>;
  upsertExternalRef: (input: {
    caseId: string;
    entityType: SyncEntityType;
    localId: string;
    externalId: string;
    payloadHash: string;
  }) => Promise<void>;
  markCaseDocumentSynced: (caseDocumentId: string) => Promise<void>;
};

export type SyncSummary = {
  caseId: string;
  synced: number;
  skipped: number;
};

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(",")}]`;

  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(obj[key])}`).join(",")}}`;
}

function hashPayload(payload: unknown): string {
  return createHash("sha256").update(stableStringify(payload)).digest("hex");
}

function isSyncTriggerStatus(status: string): boolean {
  return status === "ready_for_review" || status === "submitted" || status === "completed";
}

async function syncEntity(
  repo: SyncRepo,
  client: ElementsClient,
  input: {
    caseId: string;
    entityType: SyncEntityType;
    localId: string;
    payload: unknown;
    endpoint: string;
  }
): Promise<"synced" | "skipped"> {
  const payloadHash = hashPayload(input.payload);
  const existing = await repo.getExternalRef(input.entityType, input.localId);

  if (existing && existing.payloadHash === payloadHash) {
    return "skipped";
  }

  const response = await client.request<{ id?: string; externalId?: string }>({
    path: input.endpoint,
    method: "POST",
    body: input.payload,
    idempotencyKey: `${input.entityType}:${input.localId}:${payloadHash}`,
  });

  const externalId = response.data.id ?? response.data.externalId;
  if (!externalId || externalId.trim().length === 0) {
    throw new Error(`Elements sync failed: missing external id for ${input.entityType}`);
  }

  await repo.upsertExternalRef({
    caseId: input.caseId,
    entityType: input.entityType,
    localId: input.localId,
    externalId,
    payloadHash,
  });

  if (input.entityType === "document") {
    await repo.markCaseDocumentSynced(input.localId);
  }

  return "synced";
}

export async function syncCaseBundleToElements(repo: SyncRepo, client: ElementsClient, caseId: string): Promise<SyncSummary> {
  const bundle = await repo.getCaseBundle(caseId);
  if (!bundle) {
    throw new Error("Case not found");
  }

  if (!isSyncTriggerStatus(bundle.detail.status)) {
    return { caseId, synced: 0, skipped: 0 };
  }

  let synced = 0;
  let skipped = 0;

  const caseResult = await syncEntity(repo, client, {
    caseId,
    entityType: "case",
    localId: bundle.detail.id,
    endpoint: "/v1/cases/sync",
    payload: {
      id: bundle.detail.id,
      type: bundle.detail.type,
      title: bundle.detail.title,
      status: bundle.detail.status,
      authorizationStatus: bundle.detail.authorizationStatus,
      stepKey: bundle.detail.stepKey,
    },
  });
  if (caseResult === "synced") synced += 1;
  else skipped += 1;

  for (const task of bundle.tasks) {
    const result = await syncEntity(repo, client, {
      caseId,
      entityType: "task",
      localId: task.id,
      endpoint: "/v1/tasks/sync",
      payload: {
        id: task.id,
        caseId: task.caseId,
        title: task.title,
        status: task.status,
        dueAt: task.dueAt,
      },
    });
    if (result === "synced") synced += 1;
    else skipped += 1;
  }

  for (const doc of bundle.documents.filter((item) => item.status === "validated" || item.status === "synced")) {
    const result = await syncEntity(repo, client, {
      caseId,
      entityType: "document",
      localId: doc.id,
      endpoint: "/v1/documents/sync",
      payload: {
        id: doc.id,
        caseId: doc.caseId,
        documentId: doc.documentId,
        status: doc.status,
        validatedAt: doc.validatedAt,
        type: doc.document?.type ?? null,
      },
    });
    if (result === "synced") synced += 1;
    else skipped += 1;
  }

  return { caseId, synced, skipped };
}

function createSupabaseSyncRepo(supabase: SupabaseClient): SyncRepo {
  return {
    async getCaseBundle(caseId) {
      const detail = await getCaseDetail(supabase, caseId);
      if (!detail) return null;
      return { detail, tasks: detail.tasks, documents: detail.documents };
    },

    async getExternalRef(entityType, localId) {
      const { data, error } = await supabase
        .from("external_refs")
        .select("id,case_id,entity_type,local_id,external_id,payload_hash")
        .eq("provider", "elements")
        .eq("entity_type", entityType)
        .eq("local_id", localId)
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (!data) return null;

      return {
        id: String(data.id),
        caseId: String(data.case_id),
        entityType: data.entity_type as SyncEntityType,
        localId: String(data.local_id),
        externalId: String(data.external_id),
        payloadHash: String(data.payload_hash),
      };
    },

    async upsertExternalRef(input) {
      const now = new Date().toISOString();
      const { error } = await supabase.from("external_refs").upsert(
        {
          case_id: input.caseId,
          provider: "elements",
          entity_type: input.entityType,
          local_id: input.localId,
          external_id: input.externalId,
          payload_hash: input.payloadHash,
          updated_at: now,
          last_synced_at: now,
        },
        { onConflict: "provider,entity_type,local_id" }
      );

      if (error) throw new Error(error.message);
    },

    async markCaseDocumentSynced(caseDocumentId) {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("case_documents")
        .update({ status: "synced", synced_at: now, updated_at: now })
        .eq("id", caseDocumentId);

      if (error) throw new Error(error.message);
    },
  };
}

export async function syncCaseToElementsById(
  supabase: SupabaseClient,
  client: ElementsClient,
  caseId: string
): Promise<SyncSummary> {
  const repo = createSupabaseSyncRepo(supabase);
  return syncCaseBundleToElements(repo, client, caseId);
}
