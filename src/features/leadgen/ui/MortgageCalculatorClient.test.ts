import { describe, expect, it } from "vitest";

import { MORTGAGE_BUYER_OPTIONS, validateMortgageLeadGateContact } from "./MortgageCalculatorClient";

describe("Mortgage wizard guards", () => {
  it("exposes step 1 buyer options from 1 to 4", () => {
    expect(MORTGAGE_BUYER_OPTIONS).toEqual([1, 2, 3, 4]);
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
