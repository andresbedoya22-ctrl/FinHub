import { describe, expect, it } from "vitest";
import { processElementsReverseSync } from "./elementsReverseSyncService";

function makeSupabase(options?: { missingRef?: boolean; insertError?: string }) {
  const state = {
    updatedStatus: "",
    insertedEventName: "",
  };

  const supabase = {
    from(table: string) {
      if (table === "external_refs") {
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          maybeSingle: async () => {
            if (options?.missingRef) return { data: null, error: null };
            return { data: { case_id: "case-1" }, error: null };
          },
        };
      }

      if (table === "cases") {
        return {
          update(values: { status?: string }) {
            state.updatedStatus = values.status ?? "";
            return {
              eq() {
                return {
                  select() {
                    return {
                      single: async () => ({ data: { id: "case-1" }, error: null }),
                    };
                  },
                };
              },
            };
          },
          select() {
            return {
              eq() {
                return {
                  maybeSingle: async () => ({ data: { user_id: "user-1" }, error: null }),
                };
              },
            };
          },
        };
      }

      if (table === "product_events") {
        return {
          insert(rows: Array<{ event_name: string }> | { event_name: string }) {
            const row = Array.isArray(rows) ? rows[0] : rows;
            state.insertedEventName = row?.event_name ?? "";
            return Promise.resolve({ error: options?.insertError ? { message: options.insertError } : null });
          },
        };
      }

      throw new Error(`Unexpected table ${table}`);
    },
    __state: state,
  };

  return supabase;
}

describe("elements reverse sync service", () => {
  it("maps external status and writes product event", async () => {
    const supabase = makeSupabase();

    const result = await processElementsReverseSync(
      { externalCaseId: "ext-1", status: "processing", eventType: "workflow_updated" },
      supabase as never
    );

    expect(result.ok).toBe(true);
    expect(result.status).toBe("under_review");
    expect((supabase as { __state: { updatedStatus: string } }).__state.updatedStatus).toBe("under_review");
    expect((supabase as { __state: { insertedEventName: string } }).__state.insertedEventName).toBe(
      "elements.case.status.updated"
    );
  });

  it("throws when external ref does not exist", async () => {
    const supabase = makeSupabase({ missingRef: true });

    await expect(
      processElementsReverseSync({ externalCaseId: "ext-missing", status: "completed" }, supabase as never)
    ).rejects.toThrow(/reference not found/i);
  });

  it("throws for unsupported status", async () => {
    const supabase = makeSupabase();

    await expect(
      processElementsReverseSync({ externalCaseId: "ext-1", status: "not_a_real_status" }, supabase as never)
    ).rejects.toThrow(/unsupported elements status/i);
  });
});
