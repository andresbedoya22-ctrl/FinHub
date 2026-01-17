import { floorToWholeEuros, toCents } from "./helpers";
import type { BenefitEstimate, KgbInput } from "./types";
import { PARAMS_2026 } from "./params/2026";

export function calculateKgb2026(input: KgbInput, params: typeof PARAMS_2026): BenefitEstimate {
  const missingInputs: string[] = [];
  if (input.childrenCount === null) missingInputs.push("result.benefit.missing.childrenCount");
  if (input.childrenCount12To15 === null) {
    missingInputs.push("result.benefit.missing.childrenCount12To15");
  }
  if (input.childrenCount16To17 === null) {
    missingInputs.push("result.benefit.missing.childrenCount16To17");
  }
  if (input.annualIncomeHousehold === null) {
    missingInputs.push("result.benefit.missing.incomeHousehold");
  }

  if (missingInputs.length) {
    return {
      currency: "EUR",
      breakdownKeys: [],
      assumptionsKeys: ["result.benefit.assumptions.childrenInNL"],
      missingInputs,
      explanationKey: "result.benefit.notAvailableDescription",
    };
  }

  const childrenCount = Math.max(0, input.childrenCount ?? 0);
  if (childrenCount === 0) {
    return {
      currency: "EUR",
      breakdownKeys: [],
      assumptionsKeys: ["result.benefit.assumptions.childrenInNL"],
      explanationKey: "result.benefit.notEligibleChildren",
    };
  }

  const baseTable = input.hasPartner ? params.kgb.basePartner : params.kgb.baseSingle;
  let base = 0;
  if (childrenCount === 1) base = baseTable.oneChild;
  else if (childrenCount === 2) base = baseTable.twoChildren;
  else base = baseTable.twoChildren + (childrenCount - 2) * baseTable.extraPerChild;

  const supplement12To15 = Math.max(0, input.childrenCount12To15 ?? 0) * params.kgb.ageSupplement12To15;
  const supplement16To17 = Math.max(0, input.childrenCount16To17 ?? 0) * params.kgb.ageSupplement16To17;
  const income = input.annualIncomeHousehold ?? 0;
  const threshold = input.hasPartner ? params.kgb.incomeThresholdPartner : params.kgb.incomeThresholdSingle;
  const reduction = income > threshold ? (income - threshold) * params.kgb.reductionRate : 0;

  const yearly = Math.max(0, base + supplement12To15 + supplement16To17 - reduction);
  const monthly = floorToWholeEuros(yearly / 12);

  return {
    currency: "EUR",
    monthlyCents: monthly * 100,
    yearlyCents: toCents(yearly),
    breakdownKeys: [
      "result.benefit.breakdown.kgb.maxAmount",
      "result.benefit.breakdown.kgb.ageSupplements",
      "result.benefit.breakdown.kgb.incomeReduction",
      "result.benefit.breakdown.kgb.rounding",
    ],
    assumptionsKeys: ["result.benefit.assumptions.childrenInNL"],
  };
}
