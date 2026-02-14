import { describe, expect, it } from "vitest";

import { loadBusinessMetrics } from "./businessMetricsService";

function mkAdmin() {
  return {
    from(table: string) {
      if (table === "tenants") {
        return {
          async select() {
            return { data: [{ id: "t1", slug: "acme", name: "Acme" }], error: null };
          },
        };
      }
      if (table === "tenant_members") {
        return {
          async select() {
            return {
              data: [
                { tenant_id: "t1", status: "active", user_id: "u1" },
                { tenant_id: "t1", status: "active", user_id: "u2" },
              ],
              error: null,
            };
          },
        };
      }
      if (table === "cases") {
        return {
          select() { return this; },
          async gte() {
            return {
              data: [
                { tenant_id: "t1", type: "taxes", created_at: "2026-02-01T00:00:00.000Z" },
                { tenant_id: "t1", type: "mortgage", created_at: "2026-02-02T00:00:00.000Z" },
              ],
              error: null,
            };
          },
        };
      }
      if (table === "product_events") {
        return {
          select() { return this; },
          async gte() {
            return {
              data: [{ tenant_id: "t1", occurred_at: "2026-02-03T00:00:00.000Z" }],
              error: null,
            };
          },
        };
      }
      if (table === "gdpr_requests") {
        return {
          select() { return this; },
          async gte() {
            return {
              data: [
                { tenant_id: "t1", request_type: "export", created_at: "2026-02-04T00:00:00.000Z" },
                { tenant_id: "t1", request_type: "delete", created_at: "2026-02-05T00:00:00.000Z" },
              ],
              error: null,
            };
          },
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  };
}

describe("businessMetricsService", () => {
  it("aggregates sell-ready metrics by tenant", async () => {
    const out = await loadBusinessMetrics(mkAdmin() as never, "2026-01-15T00:00:00.000Z");
    expect(out.totalTenants).toBe(1);
    expect(out.rows[0]).toMatchObject({
      tenantId: "t1",
      members: 2,
      activeMembers: 2,
      newCases30d: 2,
      taxesCases30d: 1,
      leadgenCases30d: 1,
      productEvents30d: 1,
      gdprExports30d: 1,
      gdprDeletes30d: 1,
    });
  });
});
