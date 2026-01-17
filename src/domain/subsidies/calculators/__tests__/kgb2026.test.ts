import { describe, expect, it } from "vitest";
import { calculateKgb2026 } from "../kgb2026";
import { PARAMS_2026 } from "../params/2026";

type CaseInput = {
  hasPartner: boolean;
  annualIncomeHousehold: number;
  childrenCount: number;
  childrenCount12To15: number;
  childrenCount16To17: number;
};

function expectedMonthly(input: CaseInput) {
  const baseTable = input.hasPartner ? PARAMS_2026.kgb.basePartner : PARAMS_2026.kgb.baseSingle;
  let base = 0;
  if (input.childrenCount === 1) base = baseTable.oneChild;
  else if (input.childrenCount === 2) base = baseTable.twoChildren;
  else base = baseTable.twoChildren + (input.childrenCount - 2) * baseTable.extraPerChild;

  const supplement12To15 = input.childrenCount12To15 * PARAMS_2026.kgb.ageSupplement12To15;
  const supplement16To17 = input.childrenCount16To17 * PARAMS_2026.kgb.ageSupplement16To17;
  const threshold = input.hasPartner ? PARAMS_2026.kgb.incomeThresholdPartner : PARAMS_2026.kgb.incomeThresholdSingle;
  const reduction = input.annualIncomeHousehold > threshold
    ? (input.annualIncomeHousehold - threshold) * PARAMS_2026.kgb.reductionRate
    : 0;

  const yearly = Math.max(0, base + supplement12To15 + supplement16To17 - reduction);
  return Math.floor(yearly / 12) * 100;
}

const cases: Array<{ name: string; input: CaseInput }> = [
  { name: "single, 1 child", input: { hasPartner: false, annualIncomeHousehold: 28000, childrenCount: 1, childrenCount12To15: 0, childrenCount16To17: 0 } },
  { name: "single, 2 children", input: { hasPartner: false, annualIncomeHousehold: 32000, childrenCount: 2, childrenCount12To15: 1, childrenCount16To17: 0 } },
  { name: "single, 3 children", input: { hasPartner: false, annualIncomeHousehold: 35000, childrenCount: 3, childrenCount12To15: 1, childrenCount16To17: 1 } },
  { name: "single, 4 children", input: { hasPartner: false, annualIncomeHousehold: 42000, childrenCount: 4, childrenCount12To15: 2, childrenCount16To17: 1 } },
  { name: "partner, 1 child", input: { hasPartner: true, annualIncomeHousehold: 36000, childrenCount: 1, childrenCount12To15: 0, childrenCount16To17: 0 } },
  { name: "partner, 2 children", input: { hasPartner: true, annualIncomeHousehold: 42000, childrenCount: 2, childrenCount12To15: 1, childrenCount16To17: 1 } },
  { name: "partner, 3 children", input: { hasPartner: true, annualIncomeHousehold: 48000, childrenCount: 3, childrenCount12To15: 2, childrenCount16To17: 1 } },
  { name: "partner, 4 children", input: { hasPartner: true, annualIncomeHousehold: 52000, childrenCount: 4, childrenCount12To15: 2, childrenCount16To17: 2 } },
  { name: "single, income near threshold", input: { hasPartner: false, annualIncomeHousehold: PARAMS_2026.kgb.incomeThresholdSingle + 1000, childrenCount: 2, childrenCount12To15: 0, childrenCount16To17: 1 } },
  { name: "partner, income near threshold", input: { hasPartner: true, annualIncomeHousehold: PARAMS_2026.kgb.incomeThresholdPartner + 1000, childrenCount: 2, childrenCount12To15: 1, childrenCount16To17: 0 } },
  { name: "single, higher income", input: { hasPartner: false, annualIncomeHousehold: 60000, childrenCount: 2, childrenCount12To15: 1, childrenCount16To17: 0 } },
  { name: "partner, higher income", input: { hasPartner: true, annualIncomeHousehold: 70000, childrenCount: 3, childrenCount12To15: 1, childrenCount16To17: 1 } },
];

describe("calculateKgb2026", () => {
  for (const c of cases) {
    it(`matches ${c.name}`, () => {
      const result = calculateKgb2026(
        {
          hasPartner: c.input.hasPartner,
          annualIncomeHousehold: c.input.annualIncomeHousehold,
          childrenCount: c.input.childrenCount,
          childrenCount12To15: c.input.childrenCount12To15,
          childrenCount16To17: c.input.childrenCount16To17,
        },
        PARAMS_2026
      );
      expect(result.monthlyCents).toBe(expectedMonthly(c.input));
    });
  }

  it("returns not eligible when no children", () => {
    const result = calculateKgb2026(
      {
        hasPartner: false,
        annualIncomeHousehold: 24000,
        childrenCount: 0,
        childrenCount12To15: 0,
        childrenCount16To17: 0,
      },
      PARAMS_2026
    );

    expect(result.monthlyCents).toBeUndefined();
    expect(result.explanationKey).toBe("result.benefit.notEligibleChildren");
  });
});
