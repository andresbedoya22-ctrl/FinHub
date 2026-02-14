import { describe, expect, it } from "vitest";

import {
  INITIAL_MORTGAGE_STEP,
  MORTGAGE_BUYER_OPTIONS,
  canProceedFromMortgageStep1,
  validateMortgageLeadGateContact,
} from "./MortgageCalculatorClient";

describe("Mortgage wizard guards", () => {
  it("starts at step 1 buyers screen", () => {
    expect(INITIAL_MORTGAGE_STEP).toBe("buyers");
  });

  it("exposes step 1 buyer options from 1 to 4", () => {
    expect(MORTGAGE_BUYER_OPTIONS).toEqual([1, 2, 3, 4]);
  });

  it("does not allow continue from step 1 when no buyer selection interaction happened", () => {
    expect(canProceedFromMortgageStep1({ buyersCountTouched: false, buyersCount: 1 })).toBe(false);
  });

  it("allows continue from step 1 only after explicit buyer selection interaction", () => {
    expect(canProceedFromMortgageStep1({ buyersCountTouched: true, buyersCount: 1 })).toBe(true);
  });

  it("requires complete contact data before showing result for anonymous users", () => {
    const invalid = validateMortgageLeadGateContact({
      firstName: "",
      lastName: "",
      email: "bad",
      phone: "12",
      consent: false,
    });
    expect(Object.keys(invalid).length).toBeGreaterThan(0);

    const valid = validateMortgageLeadGateContact({
      firstName: "Ana",
      lastName: "Perez",
      email: "ana@example.com",
      phone: "+3160000000",
      consent: true,
    });
    expect(valid).toEqual({});
  });
});
