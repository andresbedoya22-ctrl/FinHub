import { describe, expect, it } from "vitest";
import { calculateKot2026 } from "../kot2026";
import { PARAMS_2026 } from "../params/2026";

type ChildInput = {
  childcareType: "dagopvang" | "bso" | "gastouder";
  hoursPerMonth: number;
  hourlyRate: number;
};

type CaseInput = {
  annualIncomeHousehold: number;
  workedMonths: number;
  children: ChildInput[];
};

function selectPercent(income: number) {
  const match = PARAMS_2026.kot.incomeTable.find((row) => income >= row.min && income <= row.max);
  return match ?? PARAMS_2026.kot.incomeTable[PARAMS_2026.kot.incomeTable.length - 1]!;
}

function expectedMonthly(input: CaseInput) {
  const percents = selectPercent(input.annualIncomeHousehold);
  const computed = input.children.slice(0, 4).map((child) => {
    const maxRate = PARAMS_2026.kot.maxHourlyRate[child.childcareType];
    const hourly = Math.min(child.hourlyRate, maxRate);
    const hours = Math.min(child.hoursPerMonth, PARAMS_2026.kot.maxHoursPerMonth);
    return { hours, cost: hourly * hours };
  });

  const ranked = computed
    .map((child, index) => ({ index, hours: child.hours, cost: child.cost }))
    .sort((a, b) => (a.hours !== b.hours ? b.hours - a.hours : b.cost - a.cost));

  const firstIndex = ranked[0]?.index ?? 0;
  let totalRaw = 0;
  computed.forEach((child, index) => {
    const percent = index === firstIndex ? percents.first : percents.next;
    totalRaw += child.cost * percent;
  });

  return Math.floor(totalRaw) * 100;
}

const cases: Array<{ name: string; input: CaseInput }> = [
  {
    name: "single child dagopvang",
    input: {
      annualIncomeHousehold: 28000,
      workedMonths: 12,
      children: [{ childcareType: "dagopvang", hoursPerMonth: 140, hourlyRate: 9.0 }],
    },
  },
  {
    name: "single child bso",
    input: {
      annualIncomeHousehold: 32000,
      workedMonths: 10,
      children: [{ childcareType: "bso", hoursPerMonth: 120, hourlyRate: 8.0 }],
    },
  },
  {
    name: "single child gastouder",
    input: {
      annualIncomeHousehold: 22000,
      workedMonths: 12,
      children: [{ childcareType: "gastouder", hoursPerMonth: 100, hourlyRate: 7.0 }],
    },
  },
  {
    name: "two children mixed types",
    input: {
      annualIncomeHousehold: 36000,
      workedMonths: 12,
      children: [
        { childcareType: "dagopvang", hoursPerMonth: 160, hourlyRate: 9.5 },
        { childcareType: "bso", hoursPerMonth: 80, hourlyRate: 8.4 },
      ],
    },
  },
  {
    name: "two children with higher hours on second",
    input: {
      annualIncomeHousehold: 42000,
      workedMonths: 11,
      children: [
        { childcareType: "dagopvang", hoursPerMonth: 90, hourlyRate: 9.3 },
        { childcareType: "bso", hoursPerMonth: 140, hourlyRate: 8.2 },
      ],
    },
  },
  {
    name: "three children",
    input: {
      annualIncomeHousehold: 48000,
      workedMonths: 12,
      children: [
        { childcareType: "dagopvang", hoursPerMonth: 120, hourlyRate: 9.6 },
        { childcareType: "bso", hoursPerMonth: 100, hourlyRate: 8.1 },
        { childcareType: "gastouder", hoursPerMonth: 90, hourlyRate: 7.3 },
      ],
    },
  },
  {
    name: "hours above cap",
    input: {
      annualIncomeHousehold: 30000,
      workedMonths: 12,
      children: [{ childcareType: "dagopvang", hoursPerMonth: 300, hourlyRate: 9.0 }],
    },
  },
  {
    name: "rate above cap",
    input: {
      annualIncomeHousehold: 30000,
      workedMonths: 12,
      children: [{ childcareType: "bso", hoursPerMonth: 120, hourlyRate: 12.0 }],
    },
  },
  {
    name: "four children (max)",
    input: {
      annualIncomeHousehold: 54000,
      workedMonths: 12,
      children: [
        { childcareType: "dagopvang", hoursPerMonth: 100, hourlyRate: 9.2 },
        { childcareType: "bso", hoursPerMonth: 90, hourlyRate: 8.0 },
        { childcareType: "gastouder", hoursPerMonth: 80, hourlyRate: 6.9 },
        { childcareType: "bso", hoursPerMonth: 70, hourlyRate: 7.8 },
      ],
    },
  },
  {
    name: "higher income band",
    input: {
      annualIncomeHousehold: 70000,
      workedMonths: 12,
      children: [{ childcareType: "dagopvang", hoursPerMonth: 140, hourlyRate: 9.5 }],
    },
  },
  {
    name: "shorter worked months",
    input: {
      annualIncomeHousehold: 26000,
      workedMonths: 6,
      children: [{ childcareType: "gastouder", hoursPerMonth: 110, hourlyRate: 7.2 }],
    },
  },
  {
    name: "mixed hours and rates",
    input: {
      annualIncomeHousehold: 38000,
      workedMonths: 9,
      children: [
        { childcareType: "dagopvang", hoursPerMonth: 130, hourlyRate: 9.1 },
        { childcareType: "bso", hoursPerMonth: 60, hourlyRate: 8.3 },
      ],
    },
  },
];

describe("calculateKot2026", () => {
  for (const c of cases) {
    it(`matches ${c.name}`, () => {
      const result = calculateKot2026(
        {
          annualIncomeHousehold: c.input.annualIncomeHousehold,
          workedMonths: c.input.workedMonths,
          children: c.input.children,
        },
        PARAMS_2026
      );
      expect(result.monthlyCents).toBe(expectedMonthly(c.input));
      if (result.monthlyCents !== undefined) {
        expect(result.yearlyCents).toBe(result.monthlyCents * c.input.workedMonths);
      }
    });
  }
});
