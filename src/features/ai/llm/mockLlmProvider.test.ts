import { describe, it, expect } from "vitest";
import { MockLlmProvider } from "./mockLlmProvider";

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

describe("MockLlmProvider", () => {
  it("extracts fields for machtigingsregistratie", async () => {
    const llm = new MockLlmProvider();
    const res = await llm.extractJson({
      instructions: "Return JSON",
      input: "activeringscode: ABC12345\nbriefkenmerk: 2026-01-XYZ\nintrekkingscode: INT-9999",
      schemaName: "machtigingsregistratie_v1",
      jsonSchema: { type: "object" },
    });

    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(isRecord(res.data)).toBe(true);
    const data = res.data as Record<string, unknown>;
    expect(typeof data.activeringscode).toBe("string");
    expect(data.activeringscode).toBe("ABC12345");
  });
});
