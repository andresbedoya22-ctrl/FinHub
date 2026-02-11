import { describe, expect, it } from "vitest";
import { computeSlaBucket } from "./adminCasesSla";

describe("admin SLA bucket", () => {
  const base = new Date("2026-02-11T12:00:00.000Z").getTime();

  it("returns ok for recent updates", () => {
    const ts = new Date(base - 6 * 60 * 60 * 1000).toISOString();
    expect(computeSlaBucket(ts, base)).toBe("ok");
  });

  it("returns warning after 24h", () => {
    const ts = new Date(base - 30 * 60 * 60 * 1000).toISOString();
    expect(computeSlaBucket(ts, base)).toBe("warning");
  });

  it("returns overdue after 72h", () => {
    const ts = new Date(base - 80 * 60 * 60 * 1000).toISOString();
    expect(computeSlaBucket(ts, base)).toBe("overdue");
  });
});
