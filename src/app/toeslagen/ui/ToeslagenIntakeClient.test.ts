import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("Toeslagen intake navigation", () => {
  it("navigates to dedicated eligibility screen instead of inline form", () => {
    const file = path.join(process.cwd(), "src/app/toeslagen/ui/ToeslagenIntakeClient.tsx");
    const source = fs.readFileSync(file, "utf8");
    expect(source.includes('href="/app/subsidies/eligibility"')).toBe(true);
  });
});
