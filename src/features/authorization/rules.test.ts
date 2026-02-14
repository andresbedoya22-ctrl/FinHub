import { describe, expect, it } from "vitest";
import {
  isAuthorizationRequiredCaseType,
  nextAuthorizationStatusForEvent,
  requiresServiceAuthorizationForStatus,
  resolveAuthorizationTransition,
} from "./rules";

describe("authorization rules", () => {
  it("enables authorization requirement for toeslagen and taxes only", () => {
    expect(isAuthorizationRequiredCaseType("toeslagen")).toBe(true);
    expect(isAuthorizationRequiredCaseType("taxes")).toBe(true);
    expect(isAuthorizationRequiredCaseType("mortgage")).toBe(false);
  });

  it("requires authorization on review statuses", () => {
    expect(requiresServiceAuthorizationForStatus("ready_for_review")).toBe(true);
    expect(requiresServiceAuthorizationForStatus("submitted")).toBe(true);
    expect(requiresServiceAuthorizationForStatus("in_progress")).toBe(false);
  });

  it("moves to received on consent and keeps verified sticky", () => {
    expect(nextAuthorizationStatusForEvent("not_started", "consent_granted")).toBe("received");
    expect(nextAuthorizationStatusForEvent("verified", "consent_granted")).toBe("verified");
  });

  it("moves to verified on activation code verification", () => {
    expect(nextAuthorizationStatusForEvent("received", "activation_code_verified")).toBe("verified");
  });

  it("resolves transitions only for supported case types", () => {
    expect(
      resolveAuthorizationTransition(
        { caseId: "case-1", caseType: "toeslagen", authorizationStatus: "received" },
        "activation_code_verified"
      )
    ).toBe("verified");

    expect(
      resolveAuthorizationTransition(
        { caseId: "case-2", caseType: "taxes", authorizationStatus: "not_started" },
        "consent_granted"
      )
    ).toBe("received");

    expect(
      resolveAuthorizationTransition(
        { caseId: "case-3", caseType: "insurance", authorizationStatus: "not_started" },
        "consent_granted"
      )
    ).toBeNull();
  });
});

