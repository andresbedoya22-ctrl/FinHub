import { describe, expect, it } from "vitest";
import { calculateKot2026 } from "../kot2026";
import { PARAMS_2026 } from "../params/2026";

describe("calculateKot2026", () => {
  it("matches example 1 (one child, day care)", () => {
    const result = calculateKot2026(
      {
        annualIncomeHousehold: 60000,
        workedMonths: 12,
        children: [
          {
            hoursPerMonth: 122,
            hourlyRate: 10.5,
            childcareType: "dagopvang",
          },
        ],
      },
      PARAMS_2026
    );

    expect(result.monthlyCents).toBe(120200);
  });

  it("matches example 2 (two children, day care + bso)", () => {
    const result = calculateKot2026(
      {
        annualIncomeHousehold: 120000,
        workedMonths: 12,
        children: [
          {
            hoursPerMonth: 87,
            hourlyRate: 12.45,
            childcareType: "dagopvang",
          },
          {
            hoursPerMonth: 65,
            hourlyRate: 10.1,
            childcareType: "bso",
          },
        ],
      },
      PARAMS_2026
    );

    expect(result.monthlyCents).toBe(116200);
  });

  it("matches example 3 (one child, gastouder, hours capped)", () => {
    const result = calculateKot2026(
      {
        annualIncomeHousehold: 40000,
        workedMonths: 12,
        children: [
          {
            hoursPerMonth: 240,
            hourlyRate: 8.25,
            childcareType: "gastouder",
          },
        ],
      },
      PARAMS_2026
    );

    expect(result.monthlyCents).toBe(182100);
  });
});
