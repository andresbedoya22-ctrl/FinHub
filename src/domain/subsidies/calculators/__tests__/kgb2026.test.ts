import { describe, expect, it } from "vitest";
import { calculateKgb2026 } from "../kgb2026";
import { PARAMS_2026 } from "../params/2026";

describe("calculateKgb2026", () => {
  it("matches example 1 (partner, 2 kids under 12)", () => {
    const result = calculateKgb2026(
      {
        hasPartner: true,
        annualIncomeHousehold: 45000,
        childrenCount: 2,
        childrenCount12To15: 0,
        childrenCount16To17: 0,
      },
      PARAMS_2026
    );

    expect(result.monthlyCents).toBe(39200);
  });

  it("matches example 2 (partner, 2 teens)", () => {
    const result = calculateKgb2026(
      {
        hasPartner: true,
        annualIncomeHousehold: 45000,
        childrenCount: 2,
        childrenCount12To15: 1,
        childrenCount16To17: 1,
      },
      PARAMS_2026
    );

    expect(result.monthlyCents).toBe(53300);
  });

  it("matches example 3 (single parent, 1 child)", () => {
    const result = calculateKgb2026(
      {
        hasPartner: false,
        annualIncomeHousehold: 30000,
        childrenCount: 1,
        childrenCount12To15: 0,
        childrenCount16To17: 0,
      },
      PARAMS_2026
    );

    expect(result.monthlyCents).toBe(49700);
  });
});
