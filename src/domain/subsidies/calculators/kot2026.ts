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

function compareChildren(a: { hours: number; cost: number }, b: { hours: number; cost: number }) {
  if (a.hours !== b.hours) return b.hours - a.hours;
  return b.cost - a.cost;
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

  if (input.children.length > 4) {
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

  const income = input.annualIncomeHousehold ?? 0;
  const percents = selectPercent(income, params.kot.incomeTable);

  const computedChildren = input.children.slice(0, 4).map((entry) => {
    const cost = computeChildCost(entry, params);
    return { entry, cost };
  });

  const missing = computedChildren.find((c) => c.cost.missing);
  if (missing?.cost.missing) {
    return {
      currency: "EUR",
      breakdownKeys: [],
      assumptionsKeys: [],
      missingInputs: [missing.cost.missing],
      explanationKey: "result.benefit.notAvailableDescription",
    };
  }

  const ranked = computedChildren
    .map((child, index) => ({
      index,
      hours: child.entry.hoursPerMonth ?? 0,
      cost: child.cost.monthlyCost,
    }))
    .sort(compareChildren);

  const firstIndex = ranked[0]?.index ?? 0;
  let totalRaw = 0;
  const breakdownItems = computedChildren.map((child, index) => {
    const percent = index === firstIndex ? percents.first : percents.next;
    const amountRaw = child.cost.monthlyCost * percent;
    totalRaw += amountRaw;
    return {
      labelKey: "result.benefit.childLabel",
      labelValues: { index: index + 1 },
      amountCents: floorToWholeEuros(amountRaw) * 100,
    };
  });

  const monthly = floorToWholeEuros(totalRaw);
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
    breakdownItems,
    assumptionsKeys: [],
  };
}
