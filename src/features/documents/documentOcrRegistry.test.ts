import { describe, expect, it } from "vitest";
import { inferOcrKindFromType, parseOcrKind } from "./documentOcrRegistry";

describe("documentOcrRegistry", () => {
  it("inferOcrKindFromType: machtigingsregistratie -> machtigingsregistratie", () => {
    expect(inferOcrKindFromType("machtigingsregistratie")).toBe("machtigingsregistratie");
  });

  it("inferOcrKindFromType: other types -> null", () => {
    expect(inferOcrKindFromType("id")).toBe(null);
    expect(inferOcrKindFromType("income")).toBe(null);
    expect(inferOcrKindFromType("bank")).toBe(null);
    expect(inferOcrKindFromType("rental")).toBe(null);
    expect(inferOcrKindFromType("tax")).toBe(null);
    expect(inferOcrKindFromType("other")).toBe(null);
  });

  it("parseOcrKind: accepts only valid values", () => {
    expect(parseOcrKind("machtigingsregistratie")).toBe("machtigingsregistratie");
    expect(parseOcrKind("  MACHTIGINGSREGISTRATIE ")).toBe("machtigingsregistratie");
    expect(parseOcrKind("something-else")).toBe(null);
    expect(parseOcrKind(null)).toBe(null);
    expect(parseOcrKind(undefined)).toBe(null);
  });
});