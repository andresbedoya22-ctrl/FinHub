import { describe, expect, it } from "vitest";

import {
  ageFromBirthDate,
  estimateCreditSimulation,
  estimateInsurancePremium,
  estimateMortgageCapacity,
  mapIncomeBand,
  normalizeAnnualIncome,
} from "./leadgenCalculators";

describe("leadgenCalculators", () => {
  it("normalizes monthly and annual income", () => {
    expect(normalizeAnnualIncome(5_000, "monthly")).toBe(60_000);
    expect(normalizeAnnualIncome(60_000, "annual")).toBe(60_000);
  });

  it("computes age from birth date deterministically", () => {
    const today = new Date("2026-02-14T00:00:00.000Z");
    expect(ageFromBirthDate("1990-02-14", today)).toBe(36);
    expect(ageFromBirthDate("1990-12-01", today)).toBe(35);
  });

  it("estimates mortgage capacity using household and risk factors", () => {
    const today = new Date("2026-02-14T00:00:00.000Z");
    const out = estimateMortgageCapacity(
      [
        { grossIncome: 5_000, incomePeriod: "monthly", birthDate: "1991-04-05", selfEmployed: false },
        { grossIncome: 2_000, incomePeriod: "monthly", birthDate: "1993-09-10", selfEmployed: true },
      ],
      true,
      today
    );

    expect(out.annualHouseholdIncome).toBe(84_000);
    expect(out.selfEmployedCount).toBe(1);
    expect(out.maxMortgage).toBeGreaterThan(250_000);
    expect(out.maxMortgage).toBeLessThan(500_000);
  });

  it("returns realistic credit simulation", () => {
    const sim = estimateCreditSimulation({ amount: 20_000, termMonths: 60, annualRatePct: 7.9 });
    expect(sim.monthlyInstallment).toBeGreaterThan(300);
    expect(sim.monthlyInstallment).toBeLessThan(450);
    expect(sim.totalRepayable).toBeGreaterThan(20_000);
  });

  it("estimates insurance premium and rewards no-claim years", () => {
    const lower = estimateInsurancePremium({
      productType: "vehicle",
      assetValue: 18_000,
      birthDate: "1994-05-02",
      noClaimsYears: 10,
    });
    const higher = estimateInsurancePremium({
      productType: "vehicle",
      assetValue: 18_000,
      birthDate: "1994-05-02",
      noClaimsYears: 0,
    });

    expect(lower).toBeLessThan(higher);
  });

  it("maps annual income to intake bands", () => {
    expect(mapIncomeBand(12_000)).toBe("lt_25k");
    expect(mapIncomeBand(30_000)).toBe("25_50k");
    expect(mapIncomeBand(70_000)).toBe("50_90k");
    expect(mapIncomeBand(120_000)).toBe("90k_plus");
  });
});

