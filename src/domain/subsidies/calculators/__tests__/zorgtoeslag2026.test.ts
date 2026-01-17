import { describe, expect, it } from "vitest";
import { calculateZorgtoeslag2026 } from "../zorgtoeslag2026";
import { PARAMS_2026 } from "../params/2026";

type CaseInput = {
  hasPartner: boolean;
  annualIncomeApplicant: number;
  annualIncomePartner: number | null;
};

function expectedMonthly(input: CaseInput): number | null {
  const totalIncome = input.annualIncomeApplicant + (input.hasPartner ? input.annualIncomePartner ?? 0 : 0);
  const maxIncome = input.hasPartner ? PARAMS_2026.zorgtoeslag.maxIncomePartner : PARAMS_2026.zorgtoeslag.maxIncomeSingle;
  if (totalIncome > maxIncome) return null;
  const standardPremium = input.hasPartner
    ? PARAMS_2026.zorgtoeslag.standardPremium * 2
    : PARAMS_2026.zorgtoeslag.standardPremium;
  const thresholdIncome = PARAMS_2026.zorgtoeslag.thresholdIncome;
  const delta = Math.max(0, totalIncome - thresholdIncome);
  const baseRate = input.hasPartner
    ? PARAMS_2026.zorgtoeslag.normRatePartnerBase
    : PARAMS_2026.zorgtoeslag.normRateSingleBase;
  const normPremium = baseRate * thresholdIncome + PARAMS_2026.zorgtoeslag.normRateMarginal * delta;
  const yearly = Math.max(0, standardPremium - normPremium);
  return Math.floor(yearly / 12) * 100;
}

const cases: Array<{ name: string; input: CaseInput }> = [
  { name: "single low income", input: { hasPartner: false, annualIncomeApplicant: 18000, annualIncomePartner: null } },
  { name: "single mid income", input: { hasPartner: false, annualIncomeApplicant: 26000, annualIncomePartner: null } },
  { name: "single near threshold", input: { hasPartner: false, annualIncomeApplicant: 32000, annualIncomePartner: null } },
  { name: "single above threshold", input: { hasPartner: false, annualIncomeApplicant: 36000, annualIncomePartner: null } },
  { name: "partner low income", input: { hasPartner: true, annualIncomeApplicant: 18000, annualIncomePartner: 12000 } },
  { name: "partner mid income", input: { hasPartner: true, annualIncomeApplicant: 26000, annualIncomePartner: 14000 } },
  { name: "partner near threshold", input: { hasPartner: true, annualIncomeApplicant: 32000, annualIncomePartner: 16000 } },
  { name: "partner higher income", input: { hasPartner: true, annualIncomeApplicant: 35000, annualIncomePartner: 18000 } },
  { name: "single just above threshold", input: { hasPartner: false, annualIncomeApplicant: 33000, annualIncomePartner: null } },
  { name: "partner higher applicant", input: { hasPartner: true, annualIncomeApplicant: 40000, annualIncomePartner: 8000 } },
  { name: "partner balanced", input: { hasPartner: true, annualIncomeApplicant: 24000, annualIncomePartner: 24000 } },
  { name: "single higher income", input: { hasPartner: false, annualIncomeApplicant: 30000, annualIncomePartner: null } },
];

describe("calculateZorgtoeslag2026", () => {
  for (const c of cases) {
    it(`matches ${c.name}`, () => {
      const result = calculateZorgtoeslag2026(
        {
          hasPartner: c.input.hasPartner,
          annualIncomeApplicant: c.input.annualIncomeApplicant,
          annualIncomePartner: c.input.annualIncomePartner,
        },
        PARAMS_2026
      );
      const expected = expectedMonthly(c.input);
      if (expected === null) {
        expect(result.monthlyCents).toBeUndefined();
        expect(result.explanationKey).toBe("result.benefit.notEligibleIncome");
      } else {
        expect(result.monthlyCents).toBe(expected);
      }
    });
  }

  it("returns not eligible when above max income", () => {
    const result = calculateZorgtoeslag2026(
      {
        hasPartner: false,
        annualIncomeApplicant: PARAMS_2026.zorgtoeslag.maxIncomeSingle + 1,
        annualIncomePartner: null,
      },
      PARAMS_2026
    );

    expect(result.monthlyCents).toBeUndefined();
    expect(result.explanationKey).toBe("result.benefit.notEligibleIncome");
  });
});
