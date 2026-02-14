import { describe, expect, it, vi } from "vitest";

type Scenario = {
  campaign:
    | { error: { message: string; code?: string }; data: null }
    | { error: null; data: { key: string; enabled: boolean; throttle_minutes: number; channel: "in_app" | "email" } };
  eventInsert?: { error: { message: string } | null; data: { id: string } | null };
  throttleHit?: boolean;
  deliveryInsertError?: string | null;
};

function makeMockAdmin(s: Scenario) {
  return {
    from(table: string) {
      if (table === "lifecycle_campaigns") {
        return {
          select() { return this; },
          eq() { return this; },
          async maybeSingle() { return s.campaign; },
        };
      }

      if (table === "tenant_members") {
        return {
          select() { return this; },
          eq() { return this; },
          order() { return this; },
          limit() { return this; },
          async maybeSingle() { return { error: null, data: null }; },
        };
      }

      if (table === "lifecycle_events") {
        return {
          insert() {
            return {
              select() { return this; },
              async single() {
                return s.eventInsert ?? { error: null, data: { id: "evt-1" } };
              },
            };
          },
          update() {
            return {
              async eq() { return { error: null }; },
            };
          },
        };
      }

      if (table === "lifecycle_deliveries") {
        return {
          select() { return this; },
          eq() { return this; },
          gte() { return this; },
          order() { return this; },
          limit() { return this; },
          async maybeSingle() {
            return { error: null, data: s.throttleHit ? { id: "d-1" } : null };
          },
          async insert() {
            return s.deliveryInsertError ? { error: { message: s.deliveryInsertError } } : { error: null };
          },
        };
      }

      throw new Error(`Unexpected table ${table}`);
    },
  };
}

vi.mock("@/lib/supabaseAdminClient", () => ({
  createSupabaseAdminClient: vi.fn(),
}));

describe("lifecycleService", () => {
  it("returns schema_missing when lifecycle schema is not available", async () => {
    const { createSupabaseAdminClient } = await import("@/lib/supabaseAdminClient");
    vi.mocked(createSupabaseAdminClient).mockReturnValue(
      makeMockAdmin({
        campaign: {
          error: { code: "PGRST205", message: "Could not find the table 'public.lifecycle_campaigns' in the schema cache" },
          data: null,
        },
      }) as never
    );

    const { emitLifecycleEvent } = await import("./lifecycleService");
    const result = await emitLifecycleEvent({
      userId: "u-1",
      campaignKey: "welcome",
      eventName: "auth.registered",
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.outcome).toBe("schema_missing");
  });

  it("skips campaign when disabled", async () => {
    const { createSupabaseAdminClient } = await import("@/lib/supabaseAdminClient");
    vi.mocked(createSupabaseAdminClient).mockReturnValue(
      makeMockAdmin({
        campaign: {
          error: null,
          data: { key: "welcome", enabled: false, throttle_minutes: 10, channel: "in_app" },
        },
      }) as never
    );

    const { emitLifecycleEvent } = await import("./lifecycleService");
    const result = await emitLifecycleEvent({
      userId: "u-1",
      campaignKey: "welcome",
      eventName: "auth.registered",
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.outcome).toBe("skipped_disabled");
  });

  it("marks as sent when campaign is enabled and not throttled", async () => {
    const { createSupabaseAdminClient } = await import("@/lib/supabaseAdminClient");
    vi.mocked(createSupabaseAdminClient).mockReturnValue(
      makeMockAdmin({
        campaign: {
          error: null,
          data: { key: "case_update", enabled: true, throttle_minutes: 120, channel: "in_app" },
        },
        throttleHit: false,
      }) as never
    );

    const { emitLifecycleEvent } = await import("./lifecycleService");
    const result = await emitLifecycleEvent({
      userId: "u-2",
      caseId: "c-2",
      campaignKey: "case_update",
      eventName: "case.updated",
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.outcome).toBe("sent_mock");
  });
});
