import { describe, expect, it, vi } from "vitest";
import { applyAuthorizationEventToCase, markAuthorizationReceivedFromConsent, markAuthorizationVerifiedFromDocument } from "./service";
import type { AuthorizationCaseRef } from "./types";

describe("authorization service", () => {
  it("applies consent event for taxes and skips unsupported case types", async () => {
    const updates: Array<{ id: string; status: string }> = [];

    const supabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "cases") {
          return {
            update: vi.fn().mockImplementation((payload: { authorization_status: string }) => ({
              eq: vi.fn().mockImplementation((column: string, value: string) => {
                if (column === "id") updates.push({ id: value, status: payload.authorization_status });
                return Promise.resolve({ error: null });
              }),
            })),
          };
        }
        throw new Error(`Unexpected table: ${table}`);
      }),
    };

    const taxesCase: AuthorizationCaseRef = {
      caseId: "case-tax",
      caseType: "taxes",
      authorizationStatus: "not_started",
    };

    const insuranceCase: AuthorizationCaseRef = {
      caseId: "case-ins",
      caseType: "insurance",
      authorizationStatus: "not_started",
    };

    expect(await applyAuthorizationEventToCase(supabase as never, taxesCase, "consent_granted")).toBe(true);
    expect(await applyAuthorizationEventToCase(supabase as never, insuranceCase, "consent_granted")).toBe(false);
    expect(updates).toEqual([{ id: "case-tax", status: "received" }]);
  });

  it("marks authorization received from consent using case lookup", async () => {
    const updates: Array<{ id: string; status: string }> = [];
    const casesSelect = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: "case-1", type: "toeslagen", authorization_status: "pending" },
        error: null,
      }),
    };

    const supabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "cases") {
          return {
            ...casesSelect,
            update: vi.fn().mockImplementation((payload: { authorization_status: string }) => ({
              eq: vi.fn().mockImplementation((column: string, value: string) => {
                if (column === "id") updates.push({ id: value, status: payload.authorization_status });
                return Promise.resolve({ error: null });
              }),
            })),
          };
        }
        throw new Error(`Unexpected table: ${table}`);
      }),
    };

    const changed = await markAuthorizationReceivedFromConsent(supabase as never, "case-1");
    expect(changed).toBe(true);
    expect(updates).toEqual([{ id: "case-1", status: "received" }]);
  });

  it("marks only toeslagen/taxes cases as verified from document links", async () => {
    const updates: Array<{ id: string; status: string }> = [];

    const caseDocumentsQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [
          {
            case_id: "case-toeslagen",
            case: { id: "case-toeslagen", type: "toeslagen", authorization_status: "received" },
          },
          {
            case_id: "case-taxes",
            case: { id: "case-taxes", type: "taxes", authorization_status: "pending" },
          },
          {
            case_id: "case-credit",
            case: { id: "case-credit", type: "credit", authorization_status: "pending" },
          },
        ],
        error: null,
      }),
    };

    const supabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "case_documents") return caseDocumentsQuery;
        if (table === "cases") {
          return {
            update: vi.fn().mockImplementation((payload: { authorization_status: string }) => ({
              eq: vi.fn().mockImplementation((column: string, value: string) => {
                if (column === "id") updates.push({ id: value, status: payload.authorization_status });
                return Promise.resolve({ error: null });
              }),
            })),
          };
        }
        throw new Error(`Unexpected table: ${table}`);
      }),
    };

    const updatedCaseIds = await markAuthorizationVerifiedFromDocument(supabase as never, "doc-1");
    expect(updatedCaseIds).toEqual(["case-toeslagen", "case-taxes"]);
    expect(updates).toEqual([
      { id: "case-toeslagen", status: "verified" },
      { id: "case-taxes", status: "verified" },
    ]);
  });
});

