import { describe, expect, it } from "vitest";
import { ensureStatusTransitionAuthorization, requiresServiceAuthorization } from "./authorization";
import { parseCreateCaseConsentInput, parseUpdateCaseInput } from "./casesService";

describe("cases authorization guards", () => {
  it("requires consent for review statuses in toeslagen/taxes", () => {
    expect(requiresServiceAuthorization("ready_for_review", "toeslagen")).toBe(true);
    expect(requiresServiceAuthorization("submitted", "taxes")).toBe(true);
    expect(requiresServiceAuthorization("ready_for_review", "mortgage")).toBe(false);
    expect(requiresServiceAuthorization("created", "toeslagen")).toBe(false);
  });

  it("throws when moving to review without consent", () => {
    expect(() => ensureStatusTransitionAuthorization("ready_for_review", false, "toeslagen")).toThrow(
      /consent required/i
    );
  });

  it("allows review transition with consent", () => {
    expect(() => ensureStatusTransitionAuthorization("ready_for_review", true, "taxes")).not.toThrow();
  });

  it("does not block non-authorization case types", () => {
    expect(() => ensureStatusTransitionAuthorization("ready_for_review", false, "credit")).not.toThrow();
  });

  it("parses update case payload", () => {
    const parsed = parseUpdateCaseInput({ status: "ready_for_review", stepKey: "review" });
    expect(parsed.status).toBe("ready_for_review");
    expect(parsed.stepKey).toBe("review");
  });

  it("parses create case consent payload", () => {
    const parsed = parseCreateCaseConsentInput({
      consentType: "service_authorization",
      granted: true,
      version: 2,
      source: "unit_test",
      locale: "en",
    });

    expect(parsed.consentType).toBe("service_authorization");
    expect(parsed.granted).toBe(true);
    expect(parsed.version).toBe(2);
    expect(parsed.source).toBe("unit_test");
    expect(parsed.locale).toBe("en");
  });
});
