import { clamp, floorToWholeEuros, toCents } from "./helpers";
import type { BenefitEstimate, KotChildInput, KotInput } from "./types";
import { PARAMS_2026 } from "./params/2026";

function selectPercent(income: number, table: typeof PARAMS_2026.kot.incomeTable) {
  const match = table.find((row) => income >= row.min && income <= row.max);
  return match ?? table[table.length - 1]!;
}

function computeChildCost(
  child: KotChildInput,
  params: typeof PARAMS_2026
): { monthlyCost: number; missing?: string } {
  if (child.childcareType === null) return { monthlyCost: 0, missing: "result.benefit.missing.childcareType" };
  if (child.hoursPerMonth === null) return { monthlyCost: 0, missing: "result.benefit.missing.hoursPerMonth" };
  if (child.hourlyRate === null) return { monthlyCost: 0, missing: "result.benefit.missing.costPerHour" };

  const maxRate = params.kot.maxHourlyRate[child.childcareType];
  const hourly = Math.min(child.hourlyRate, maxRate);
  const hours = Math.min(child.hoursPerMonth, params.kot.maxHoursPerMonth);
  return { monthlyCost: hourly * hours };
}

export function calculateKot2026(input: KotInput, params: typeof PARAMS_2026): BenefitEstimate {
  const missingInputs: string[] = [];
  if (input.annualIncomeHousehold === null) missingInputs.push("result.benefit.missing.incomeHousehold");
  if (input.workedMonths === null || input.workedMonths < 1 || input.workedMonths > 12) {
    missingInputs.push("result.benefit.missing.workedMonths");
  }

  if (input.children.length === 0) {
    missingInputs.push("result.benefit.missing.childrenCount");
  }

  if (input.children.length > 1) {
    missingInputs.push("result.benefit.missing.childDetails");
  }

  if (missingInputs.length) {
    return {
      currency: "EUR",
      breakdownKeys: [],
      assumptionsKeys: [],
      missingInputs,
      explanationKey: "result.benefit.notAvailableDescription",
    };
  }

  const workedMonths = clamp(input.workedMonths ?? 0, 1, 12);
  const child = input.children[0];
  if (!child) {
    return {
      currency: "EUR",
      breakdownKeys: [],
      assumptionsKeys: [],
      missingInputs: ["result.benefit.missing.childrenCount"],
      explanationKey: "result.benefit.notAvailableDescription",
    };
  }
  const cost = computeChildCost(child, params);
  if (cost.missing) {
    return {
      currency: "EUR",
      breakdownKeys: [],
      assumptionsKeys: [],
      missingInputs: [cost.missing],
      explanationKey: "result.benefit.notAvailableDescription",
    };
  }

  const income = input.annualIncomeHousehold ?? 0;
  const percents = selectPercent(income, params.kot.incomeTable);
  const monthlyRaw = cost.monthlyCost * percents.first;
  const monthly = floorToWholeEuros(monthlyRaw);
  const yearly = monthly * workedMonths;

  return {
    currency: "EUR",
    monthlyCents: monthly * 100,
    yearlyCents: toCents(yearly),
    breakdownKeys: [
      "result.benefit.breakdown.kot.hourlyCap",
      "result.benefit.breakdown.kot.hoursCap",
      "result.benefit.breakdown.kot.incomePercent",
      "result.benefit.breakdown.kot.rounding",
    ],
    assumptionsKeys: [],
  };
}
