import { describe, it, expect } from "vitest";
import {
  validateForSaveMachtigingsregistratieFieldsV1,
  validateForVerifyMachtigingsregistratieFieldsV1,
} from "./machtigingsregistratieSchema";

describe("machtigingsregistratieSchema", () => {
  it("rechaza keys desconocidas", () => {
    const r = validateForSaveMachtigingsregistratieFieldsV1({ activeringscode: "ABC-123", hack: true } as unknown);
    expect(r.ok).toBe(false);
  });

  it("normaliza activeringscode (sin espacios/guiones, uppercase)", () => {
    const r = validateForSaveMachtigingsregistratieFieldsV1({ activeringscode: "ab c-12 3" } as unknown);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.activeringscode).toBe("ABC123");
  });

  it("verify exige activeringscode", () => {
    const r = validateForVerifyMachtigingsregistratieFieldsV1({ activeringscode: "" } as unknown);
    expect(r.ok).toBe(false);
  });

  it("verify pasa con activeringscode mínima", () => {
    const r = validateForVerifyMachtigingsregistratieFieldsV1({ activeringscode: "ABC-123" } as unknown);
    expect(r.ok).toBe(true);
  });
});
