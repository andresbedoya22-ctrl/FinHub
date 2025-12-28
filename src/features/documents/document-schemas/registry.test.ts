import { describe, it, expect } from "vitest";
import { getExtractionSpec } from "./registry";

describe("document-schemas registry", () => {
  it("returns machtigingsregistratie v1 spec", () => {
    const spec = getExtractionSpec("machtigingsregistratie");
    expect(spec.extractionType).toBe("machtigingsregistratie");
    expect(spec.schemaVersion).toBeGreaterThanOrEqual(1);
    expect(spec.schemaName).toContain("machtigingsregistratie");
    expect(spec.instructions.length).toBeGreaterThan(10);
    expect(typeof spec.jsonSchema).toBe("object");

    const validated = spec.validateForSave({ activeringscode: "ABC12345", extra: {} });
    expect(validated.ok).toBe(true);
  });
});
