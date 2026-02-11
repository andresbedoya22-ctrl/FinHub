import type { CaseStatus } from "./casesTypes";

export function requiresServiceAuthorization(targetStatus: CaseStatus): boolean {
  return targetStatus === "ready_for_review" || targetStatus === "submitted";
}

export function ensureStatusTransitionAuthorization(
  targetStatus: CaseStatus,
  hasServiceAuthorizationConsent: boolean
): void {
  if (requiresServiceAuthorization(targetStatus) && !hasServiceAuthorizationConsent) {
    throw new Error("Service authorization consent required before moving to review");
  }
}
