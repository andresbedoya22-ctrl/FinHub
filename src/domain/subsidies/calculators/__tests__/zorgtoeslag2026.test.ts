import { describe, expect, it } from "vitest";
import { calculateZorgtoeslag2026 } from "../zorgtoeslag2026";
import { PARAMS_2026 } from "../params/2026";

describe("calculateZorgtoeslag2026", () => {
  it("matches example 1 (single, income 19,000)", () => {
    const result = calculateZorgtoeslag2026(
      { hasPartner: false, annualIncomeApplicant: 19000, annualIncomePartner: null },
      PARAMS_2026
    );

    expect(result.monthlyCents).toBe(12900);
    expect(result.yearlyCents).toBe(155045);
  });

  it("matches the stated max benefit at the threshold income", () => {
    const result = calculateZorgtoeslag2026(
      { hasPartner: false, annualIncomeApplicant: 29736, annualIncomePartner: null },
      PARAMS_2026
    );

    expect(result.yearlyCents).toBe(155045);
  });
});
