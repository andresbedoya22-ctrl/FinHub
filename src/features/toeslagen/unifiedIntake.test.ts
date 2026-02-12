import { describe, expect, it } from "vitest";
import { evaluateUnifiedToeslagenIntake } from "./unifiedIntake";

const baseInput = {
  age: 30,
  hasPartner: false,
  incomeSelf: 24000,
  incomePartner: 0,
  rent: 700,
  serviceCosts: 40,
  hasBasicInsurance: true,
  childrenCount: 2,
  childcareType: "dagopvang" as const,
  childcareHoursPerMonth: 80,
  childcareCostPerHour: 9,
  worksOrStudies: true,
  partnerWorksOrStudies: true,
};

describe("evaluateUnifiedToeslagenIntake", () => {
  it("returns all four subsidies", () => {
    const result = evaluateUnifiedToeslagenIntake(baseInput);
    expect(result).toHaveLength(4);
    expect(result.map((r) => r.slug)).toEqual(["huurtoeslag", "zorgtoeslag", "kgb", "kot"]);
  });

  it("marks huurtoeslag as blocked when rent is missing", () => {
    const result = evaluateUnifiedToeslagenIntake({ ...baseInput, rent: null });
    const huur = result.find((r) => r.slug === "huurtoeslag");
    expect(huur?.eligible).toBe(false);
    expect(huur?.blockingReasons).toContain("engine.common.missingRent");
  });

  it("marks zorgtoeslag as blocked when no insurance", () => {
    const result = evaluateUnifiedToeslagenIntake({ ...baseInput, hasBasicInsurance: false });
    const zorg = result.find((r) => r.slug === "zorgtoeslag");
    expect(zorg?.eligible).toBe(false);
    expect(zorg?.blockingReasons).toContain("engine.zorgtoeslag.noBasicInsurance");
  });

  it("marks kgb as blocked without children", () => {
    const result = evaluateUnifiedToeslagenIntake({ ...baseInput, childrenCount: 0 });
    const kgb = result.find((r) => r.slug === "kgb");
    expect(kgb?.eligible).toBe(false);
    expect(kgb?.blockingReasons).toContain("engine.kgb.noChildren");
  });

  it("marks kot as blocked without childcare cost input", () => {
    const result = evaluateUnifiedToeslagenIntake({
      ...baseInput,
      childcareHoursPerMonth: null,
      childcareCostPerHour: null,
    });
    const kot = result.find((r) => r.slug === "kot");
    expect(kot?.eligible).toBe(false);
    expect(kot?.blockingReasons).toContain("engine.kot.noChildcareCosts");
  });
});
