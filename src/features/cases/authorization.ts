import { isAuthorizationRequiredCaseType, requiresServiceAuthorizationForStatus } from "../authorization";
import type { CaseStatus, CaseType } from "./casesTypes";

export function requiresServiceAuthorization(targetStatus: CaseStatus, caseType: CaseType = "toeslagen"): boolean {
  return isAuthorizationRequiredCaseType(caseType) && requiresServiceAuthorizationForStatus(targetStatus);
}

export function ensureStatusTransitionAuthorization(
  targetStatus: CaseStatus,
  hasServiceAuthorizationConsent: boolean,
  caseType: CaseType = "toeslagen"
): void {
  if (requiresServiceAuthorization(targetStatus, caseType) && !hasServiceAuthorizationConsent) {
    throw new Error("Service authorization consent required before moving to review");
  }
}
