import { describe, expect, it } from "vitest";

import {
  isLeadgenVertical,
  leadgenChecklistTasks,
  parseLeadgenSubmitInput,
  parseTaxesIntakeInput,
  taxesChecklistTasks,
} from "./server";

describe("vertical server helpers", () => {
  it("validates leadgen verticals", () => {
    expect(isLeadgenVertical("mortgage")).toBe(true);
    expect(isLeadgenVertical("credit")).toBe(true);
    expect(isLeadgenVertical("insurance")).toBe(true);
    expect(isLeadgenVertical("taxes")).toBe(false);
  });

  it("parses taxes intake input", () => {
    const parsed = parseTaxesIntakeInput({
      fiscalYear: 2025,
      hasPartner: true,
      hasFreelanceIncome: false,
      hasOwnHome: true,
      hasForeignIncome: false,
      wantsTaxCreditsReview: true,
      notes: "ok",
    });

    expect(parsed.fiscalYear).toBe(2025);
    expect(parsed.hasPartner).toBe(true);
    expect(parsed.hasOwnHome).toBe(true);
  });

  it("builds taxes checklist with conditional docs", () => {
    const tasks = taxesChecklistTasks({
      fiscalYear: 2025,
      hasPartner: true,
      hasFreelanceIncome: true,
      hasOwnHome: false,
      hasForeignIncome: true,
      wantsTaxCreditsReview: true,
      notes: null,
    });
    expect(tasks.some((t) => t.includes("partner"))).toBe(true);
    expect(tasks.some((t) => t.includes("ZZP"))).toBe(true);
    expect(tasks.some((t) => t.includes("foreign income"))).toBe(true);
  });

  it("parses leadgen intake submit input", () => {
    const parsed = parseLeadgenSubmitInput({
      fullName: "Test User",
      email: "test@example.com",
      phone: "123",
      employmentStatus: "employed",
      yearlyIncomeBand: "25_50k",
      timelineMonths: "3_6",
      hasPartner: false,
      notes: "note",
      consent: true,
    });
    expect(parsed.fullName).toBe("Test User");
    expect(parsed.email).toBe("test@example.com");
  });

  it("returns checklist per leadgen vertical", () => {
    expect(leadgenChecklistTasks("mortgage").length).toBeGreaterThanOrEqual(4);
    expect(leadgenChecklistTasks("credit").length).toBeGreaterThanOrEqual(4);
    expect(leadgenChecklistTasks("insurance").length).toBeGreaterThanOrEqual(4);
  });
});
