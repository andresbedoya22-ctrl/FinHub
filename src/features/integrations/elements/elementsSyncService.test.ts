import { describe, expect, it, vi } from "vitest";
import { syncCaseBundleToElements, type SyncEntityType } from "./elementsSyncService";
import type { ElementsClient } from "./elementsClient";

type RefRow = {
  id: string;
  caseId: string;
  entityType: SyncEntityType;
  localId: string;
  externalId: string;
  payloadHash: string;
};

function createRepo() {
  const refs = new Map<string, RefRow>();
  const syncedDocs: string[] = [];

  const bundle = {
    detail: {
      id: "case-1",
      type: "toeslagen" as const,
      title: "Case 1",
      status: "ready_for_review" as const,
      stepKey: "review" as const,
      authorizationStatus: "received" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tasks: [],
      documents: [],
      consents: [],
    },
    tasks: [{ id: "task-1", caseId: "case-1", title: "Task", status: "open" as const, dueAt: null, createdAt: "", updatedAt: "" }],
    documents: [
      {
        id: "case-doc-1",
        caseId: "case-1",
        documentId: "doc-1",
        status: "validated" as const,
        createdAt: "",
        updatedAt: "",
        validatedAt: new Date().toISOString(),
        document: { id: "doc-1", fileName: "a.pdf", type: "id", status: "uploaded", createdAt: "", updatedAt: "" },
      },
    ],
  };

  return {
    repo: {
      async getCaseBundle(caseId: string) {
        return caseId === "case-1" ? bundle : null;
      },
      async getExternalRef(entityType: SyncEntityType, localId: string) {
        return refs.get(`${entityType}:${localId}`) ?? null;
      },
      async upsertExternalRef(input: Omit<RefRow, "id">) {
        refs.set(`${input.entityType}:${input.localId}`, { ...input, id: `ref-${input.entityType}-${input.localId}` });
      },
      async markCaseDocumentSynced(caseDocumentId: string) {
        syncedDocs.push(caseDocumentId);
      },
    },
    syncedDocs,
  };
}

function createClient(request: ReturnType<typeof vi.fn>): ElementsClient {
  return { request: request as ElementsClient["request"] };
}

describe("elements sync service", () => {
  it("syncs case, tasks and validated docs", async () => {
    const { repo, syncedDocs } = createRepo();
    const request = vi.fn(async () => ({ status: 200, data: { id: "ext-1" }, headers: new Headers() }));

    const summary = await syncCaseBundleToElements(repo, createClient(request), "case-1");

    expect(summary.synced).toBe(3);
    expect(summary.skipped).toBe(0);
    expect(request).toHaveBeenCalledTimes(3);
    expect(syncedDocs).toEqual(["case-doc-1"]);
  });

  it("skips already synced entities when payload hash has not changed", async () => {
    const { repo } = createRepo();
    const request = vi.fn(async () => ({ status: 200, data: { id: "ext-1" }, headers: new Headers() }));

    await syncCaseBundleToElements(repo, createClient(request), "case-1");
    await syncCaseBundleToElements(repo, createClient(request), "case-1");

    expect(request).toHaveBeenCalledTimes(3);
  });

  it("does not sync when case status is not ready/submitted/completed", async () => {
    const { repo } = createRepo();
    const request = vi.fn(async () => ({ status: 200, data: { id: "ext-1" }, headers: new Headers() }));

    const repoWithDraft = {
      ...repo,
      async getCaseBundle(caseId: string) {
        const b = await repo.getCaseBundle(caseId);
        if (!b) return null;
        return { ...b, detail: { ...b.detail, status: "in_progress" as const } };
      },
    };

    const summary = await syncCaseBundleToElements(repoWithDraft, createClient(request), "case-1");
    expect(summary.synced).toBe(0);
    expect(summary.skipped).toBe(0);
    expect(request).toHaveBeenCalledTimes(0);
  });
});
