import { describe, expect, it } from "vitest";
import {
  buildToeslagenCaseTitle,
  buildToeslagenTaskTitles,
  parseToeslagenContractStartInput,
} from "./contractStart";

describe("toeslagen contract start", () => {
  it("parses and deduplicates valid slugs", () => {
    const parsed = parseToeslagenContractStartInput({
      selectedSlugs: ["huurtoeslag", "zorgtoeslag", "huurtoeslag", "not-valid"],
    });

    expect(parsed.selectedSlugs).toEqual(["huurtoeslag", "zorgtoeslag"]);
  });

  it("rejects payload without valid selected slugs", () => {
    expect(() => parseToeslagenContractStartInput({ selectedSlugs: ["invalid"] })).toThrow(
      /at least one valid subsidy slug/i
    );
  });

  it("builds a stable case title", () => {
    expect(buildToeslagenCaseTitle(["huurtoeslag"]))
      .toBe("Toeslagen contract - huurtoeslag");
    expect(buildToeslagenCaseTitle(["huurtoeslag", "zorgtoeslag"]))
      .toBe("Toeslagen contract - huurtoeslag, zorgtoeslag");
  });

  it("builds initial task checklist with docs and operations review", () => {
    const tasks = buildToeslagenTaskTitles(["huurtoeslag"]);
    expect(tasks[0]).toBe("Confirm service authorization consent");
    expect(tasks.some((row) => row.startsWith("Upload document:"))).toBe(true);
    expect(tasks[tasks.length - 1]).toBe("Operations review and submission");
  });
});

