import { floorToWholeEuros, sum, toCents } from "./helpers";
import type { BenefitEstimate, ZorgtoeslagInput } from "./types";
import { PARAMS_2026 } from "./params/2026";

export function calculateZorgtoeslag2026(
  input: ZorgtoeslagInput,
  params: typeof PARAMS_2026
): BenefitEstimate {
  const missingInputs: string[] = [];
  if (input.annualIncomeApplicant === null) missingInputs.push("result.benefit.missing.incomeApplicant");
  if (input.hasPartner && input.annualIncomePartner === null) {
    missingInputs.push("result.benefit.missing.incomePartner");
  }

  if (missingInputs.length) {
    return {
      currency: "EUR",
      breakdownKeys: [],
      assumptionsKeys: ["result.benefit.assumptions.domesticInsurance"],
      missingInputs,
      explanationKey: "result.benefit.notAvailableDescription",
    };
  }

  const totalIncome = sum(input.annualIncomeApplicant, input.hasPartner ? input.annualIncomePartner : 0);
  const maxIncome = input.hasPartner ? params.zorgtoeslag.maxIncomePartner : params.zorgtoeslag.maxIncomeSingle;

  if (totalIncome > maxIncome) {
    return {
      currency: "EUR",
      breakdownKeys: [],
      assumptionsKeys: ["result.benefit.assumptions.domesticInsurance"],
      explanationKey: "result.benefit.notEligibleIncome",
    };
  }

  const standardPremium = input.hasPartner
    ? params.zorgtoeslag.standardPremium * 2
    : params.zorgtoeslag.standardPremium;
  const thresholdIncome = params.zorgtoeslag.thresholdIncome;
  const delta = Math.max(0, totalIncome - thresholdIncome);
  const baseRate = input.hasPartner ? params.zorgtoeslag.normRatePartnerBase : params.zorgtoeslag.normRateSingleBase;
  const normPremium = baseRate * thresholdIncome + params.zorgtoeslag.normRateMarginal * delta;
  const yearly = Math.max(0, standardPremium - normPremium);
  const monthly = floorToWholeEuros(yearly / 12);

  return {
    currency: "EUR",
    monthlyCents: monthly * 100,
    yearlyCents: toCents(yearly),
    breakdownKeys: [
      "result.benefit.breakdown.zorg.standardPremium",
      "result.benefit.breakdown.zorg.normPremium",
      "result.benefit.breakdown.zorg.income",
      "result.benefit.breakdown.zorg.rounding",
    ],
    assumptionsKeys: ["result.benefit.assumptions.domesticInsurance"],
  };
}
