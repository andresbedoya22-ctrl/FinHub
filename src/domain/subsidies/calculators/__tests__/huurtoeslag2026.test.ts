import { describe, expect, it } from "vitest";
import { calculateHuurtoeslag2026 } from "../huurtoeslag2026";
import { PARAMS_2026 } from "../params/2026";

describe("calculateHuurtoeslag2026", () => {
  it("matches example 1 (single age 20, rent 600)", () => {
    const result = calculateHuurtoeslag2026(
      {
        age: 20,
        hasPartner: false,
        householdSize: 1,
        annualIncomeApplicant: 22000,
        annualIncomePartner: null,
        monthlyRent: 600,
        under21HasChildOrDisability: false,
      },
      PARAMS_2026
    );

    expect(result.monthlyCents).toBe(29500);
  });

  it("matches example 2 (couple, rent 1200)", () => {
    const result = calculateHuurtoeslag2026(
      {
        age: 30,
        hasPartner: true,
        householdSize: 3,
        annualIncomeApplicant: 26000,
        annualIncomePartner: 8000,
        monthlyRent: 1200,
        under21HasChildOrDisability: false,
      },
      PARAMS_2026
    );

    expect(result.monthlyCents).toBe(49200);
  });

  it("matches example 3 (single age 69, rent 710)", () => {
    const result = calculateHuurtoeslag2026(
      {
        age: 69,
        hasPartner: false,
        householdSize: 1,
        annualIncomeApplicant: 29000,
        annualIncomePartner: null,
        monthlyRent: 710,
        under21HasChildOrDisability: false,
      },
      PARAMS_2026
    );

    expect(result.monthlyCents).toBe(30700);
  });
});
