import { describe, expect, it } from "vitest";
import { calculateHuurtoeslag2026 } from "../huurtoeslag2026";
import { PARAMS_2026 } from "../params/2026";

type CaseInput = {
  age: number;
  hasPartner: boolean;
  householdSize: number;
  annualIncomeApplicant: number;
  annualIncomePartner: number | null;
  monthlyRent: number;
  under21HasChildOrDisability: boolean;
};

function expectedMonthly(input: CaseInput) {
  const isUnder21 = input.age < 21;
  const rentLimit = isUnder21 && !input.under21HasChildOrDisability
    ? PARAMS_2026.huurtoeslag.rentLimitUnder21
    : PARAMS_2026.huurtoeslag.rentLimitGeneral;
  const rent = Math.min(input.monthlyRent, rentLimit);
  const householdSize = Math.max(1, input.householdSize);
  const baseRent = householdSize >= 2 ? PARAMS_2026.huurtoeslag.baseRentMulti : PARAMS_2026.huurtoeslag.baseRentSingle;
  const qualityLimit = PARAMS_2026.huurtoeslag.qualityLimit;
  const cappingLimit = householdSize >= 3 ? PARAMS_2026.huurtoeslag.cappingLimitLarge : PARAMS_2026.huurtoeslag.cappingLimitSmall;
  const income = input.annualIncomeApplicant + (input.hasPartner ? input.annualIncomePartner ?? 0 : 0);
  const pivot = householdSize >= 2 ? PARAMS_2026.huurtoeslag.incomePivotMulti : PARAMS_2026.huurtoeslag.incomePivotSingle;
  const phaseOut = householdSize >= 2 ? PARAMS_2026.huurtoeslag.phaseOutMulti : PARAMS_2026.huurtoeslag.phaseOutSingle;
  const correction = income > pivot ? (income - pivot) * (phaseOut / 12) : 0;

  let partA = 0;
  if (rent > baseRent) {
    partA = Math.max(0, Math.min(rent, qualityLimit) - baseRent);
  }

  let partB = 0;
  let partC = 0;
  if (!isUnder21) {
    if (rent > qualityLimit) {
      partB = Math.max(0, Math.min(rent, cappingLimit) - qualityLimit) * 0.65;
    }
    if (rent > cappingLimit) {
      partC = Math.max(0, rent - cappingLimit) * 0.4;
    }
  }

  const monthlyRaw = Math.max(0, partA + partB + partC - correction);
  return Math.floor(monthlyRaw) * 100;
}

const cases: Array<{ name: string; input: CaseInput }> = [
  {
    name: "single age 20, rent 600",
    input: {
      age: 20,
      hasPartner: false,
      householdSize: 1,
      annualIncomeApplicant: 22000,
      annualIncomePartner: null,
      monthlyRent: 600,
      under21HasChildOrDisability: false,
    },
  },
  {
    name: "couple, rent 1200",
    input: {
      age: 30,
      hasPartner: true,
      householdSize: 3,
      annualIncomeApplicant: 26000,
      annualIncomePartner: 8000,
      monthlyRent: 1200,
      under21HasChildOrDisability: false,
    },
  },
  {
    name: "single age 69, rent 710",
    input: {
      age: 69,
      hasPartner: false,
      householdSize: 1,
      annualIncomeApplicant: 29000,
      annualIncomePartner: null,
      monthlyRent: 710,
      under21HasChildOrDisability: false,
    },
  },
  {
    name: "under 21, no child, rent 500",
    input: {
      age: 19,
      hasPartner: false,
      householdSize: 1,
      annualIncomeApplicant: 16000,
      annualIncomePartner: null,
      monthlyRent: 500,
      under21HasChildOrDisability: false,
    },
  },
  {
    name: "under 21, child exception, rent 700",
    input: {
      age: 19,
      hasPartner: false,
      householdSize: 2,
      annualIncomeApplicant: 18000,
      annualIncomePartner: null,
      monthlyRent: 700,
      under21HasChildOrDisability: true,
    },
  },
  {
    name: "high rent capped",
    input: {
      age: 45,
      hasPartner: true,
      householdSize: 2,
      annualIncomeApplicant: 24000,
      annualIncomePartner: 12000,
      monthlyRent: 1400,
      under21HasChildOrDisability: false,
    },
  },
  {
    name: "low income, moderate rent",
    input: {
      age: 32,
      hasPartner: false,
      householdSize: 1,
      annualIncomeApplicant: 15000,
      annualIncomePartner: null,
      monthlyRent: 520,
      under21HasChildOrDisability: false,
    },
  },
  {
    name: "income near phase-out",
    input: {
      age: 38,
      hasPartner: true,
      householdSize: 2,
      annualIncomeApplicant: 32000,
      annualIncomePartner: 18000,
      monthlyRent: 900,
      under21HasChildOrDisability: false,
    },
  },
  {
    name: "large household, rent 800",
    input: {
      age: 41,
      hasPartner: true,
      householdSize: 4,
      annualIncomeApplicant: 28000,
      annualIncomePartner: 15000,
      monthlyRent: 800,
      under21HasChildOrDisability: false,
    },
  },
  {
    name: "two-person household, rent 880",
    input: {
      age: 52,
      hasPartner: true,
      householdSize: 2,
      annualIncomeApplicant: 26000,
      annualIncomePartner: 9000,
      monthlyRent: 880,
      under21HasChildOrDisability: false,
    },
  },
  {
    name: "rent below base rent",
    input: {
      age: 27,
      hasPartner: false,
      householdSize: 1,
      annualIncomeApplicant: 12000,
      annualIncomePartner: null,
      monthlyRent: 200,
      under21HasChildOrDisability: false,
    },
  },
  {
    name: "single senior, high rent",
    input: {
      age: 72,
      hasPartner: false,
      householdSize: 1,
      annualIncomeApplicant: 24000,
      annualIncomePartner: null,
      monthlyRent: 1000,
      under21HasChildOrDisability: false,
    },
  },
];

describe("calculateHuurtoeslag2026", () => {
  for (const c of cases) {
    it(`matches ${c.name}`, () => {
      const result = calculateHuurtoeslag2026(c.input, PARAMS_2026);
      expect(result.monthlyCents).toBe(expectedMonthly(c.input));
    });
  }

  it("adds rent cap assumption when rent exceeds limit", () => {
    const result = calculateHuurtoeslag2026(
      {
        age: 35,
        hasPartner: false,
        householdSize: 1,
        annualIncomeApplicant: 20000,
        annualIncomePartner: null,
        monthlyRent: 1500,
        under21HasChildOrDisability: false,
      },
      PARAMS_2026
    );

    expect(result.assumptionsKeys).toContain("result.benefit.assumptions.huur.rentCapped");
  });
});
