import { describe, expect, it } from "vitest";

import { monthFromDate, resolveMonthFromSearchParams } from "./monthFallback";

describe("monthFallback", () => {
  it("returns YYYY-MM from Date", () => {
    expect(monthFromDate(new Date("2026-02-14T00:00:00.000Z"))).toBe("2026-02");
  });

  it("uses query month when valid", () => {
    expect(resolveMonthFromSearchParams({ month: "2025-11" }, new Date("2026-02-14T00:00:00.000Z"))).toBe("2025-11");
  });

  it("falls back to snapshot month when query invalid", () => {
    expect(resolveMonthFromSearchParams({ month: "invalid" }, new Date("2026-02-14T00:00:00.000Z"))).toBe("2026-02");
  });
});
