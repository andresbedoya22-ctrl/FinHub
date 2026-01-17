import { floorToWholeEuros, sum, toCents } from "./helpers";
import type { BenefitEstimate, HuurtoeslagInput } from "./types";
import { PARAMS_2026 } from "./params/2026";

export function calculateHuurtoeslag2026(
  input: HuurtoeslagInput,
  params: typeof PARAMS_2026
): BenefitEstimate {
  const missingInputs: string[] = [];
  if (input.age === null) missingInputs.push("result.benefit.missing.age");
  if (input.monthlyRent === null) missingInputs.push("result.benefit.missing.rent");
  if (input.annualIncomeApplicant === null) missingInputs.push("result.benefit.missing.incomeApplicant");
  if (input.hasPartner && input.annualIncomePartner === null) {
    missingInputs.push("result.benefit.missing.incomePartner");
  }
  if (input.householdSize === null) missingInputs.push("result.benefit.missing.householdSize");

  if (missingInputs.length) {
    return {
      currency: "EUR",
      breakdownKeys: [],
      assumptionsKeys: ["result.benefit.assumptions.noMedebewoners"],
      missingInputs,
      explanationKey: "result.benefit.notAvailableDescription",
    };
  }

  const age = input.age ?? 0;
  const isUnder21 = age < 21;
  const rentLimit = isUnder21 && !input.under21HasChildOrDisability
    ? params.huurtoeslag.rentLimitUnder21
    : params.huurtoeslag.rentLimitGeneral;
  const rawRent = input.monthlyRent ?? 0;
  const rent = Math.min(rawRent, rentLimit);
  const householdSize = Math.max(1, input.householdSize ?? (input.hasPartner ? 2 : 1));
  const baseRent = householdSize >= 2 ? params.huurtoeslag.baseRentMulti : params.huurtoeslag.baseRentSingle;
  const qualityLimit = params.huurtoeslag.qualityLimit;
  const cappingLimit = householdSize >= 3 ? params.huurtoeslag.cappingLimitLarge : params.huurtoeslag.cappingLimitSmall;
  const income = sum(input.annualIncomeApplicant, input.hasPartner ? input.annualIncomePartner : 0);
  const pivot = householdSize >= 2 ? params.huurtoeslag.incomePivotMulti : params.huurtoeslag.incomePivotSingle;
  const phaseOut = householdSize >= 2 ? params.huurtoeslag.phaseOutMulti : params.huurtoeslag.phaseOutSingle;
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
  const monthly = floorToWholeEuros(monthlyRaw);
  const assumptions: string[] = ["result.benefit.assumptions.noMedebewoners"];

  if (rawRent > rentLimit) {
    assumptions.push("result.benefit.assumptions.huur.rentCapped");
  }
  if ((input.monthlyServiceCosts ?? 0) > 0) {
    assumptions.push("result.benefit.assumptions.huur.serviceCostsExcluded");
  }
  assumptions.push("result.benefit.assumptions.huur.kaleHuurOnly");

  return {
    currency: "EUR",
    monthlyCents: monthly * 100,
    yearlyCents: toCents(monthly * 12),
    breakdownKeys: [
      "result.benefit.breakdown.huur.rekenhuur",
      "result.benefit.breakdown.huur.basishuur",
      "result.benefit.breakdown.huur.correction",
      "result.benefit.breakdown.huur.rounding",
    ],
    assumptionsKeys: assumptions,
  };
}
