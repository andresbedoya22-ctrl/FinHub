import type { AuthorizationCaseRef, AuthorizationCaseType, AuthorizationEvent, AuthorizationStatus } from "./types";

const AUTH_REQUIRED_CASE_TYPES: ReadonlySet<AuthorizationCaseType> = new Set(["toeslagen", "taxes"]);
const REVIEW_STATUSES: ReadonlySet<string> = new Set(["ready_for_review", "submitted"]);

export function isAuthorizationRequiredCaseType(caseType: AuthorizationCaseType): boolean {
  return AUTH_REQUIRED_CASE_TYPES.has(caseType);
}

export function requiresServiceAuthorizationForStatus(status: string): boolean {
  return REVIEW_STATUSES.has(status);
}

export function nextAuthorizationStatusForEvent(
  current: AuthorizationStatus,
  event: AuthorizationEvent
): AuthorizationStatus {
  if (event === "activation_code_verified") return "verified";
  if (event === "consent_granted") {
    return current === "verified" ? "verified" : "received";
  }
  return current;
}

export function resolveAuthorizationTransition(
  caseRef: AuthorizationCaseRef,
  event: AuthorizationEvent
): AuthorizationStatus | null {
  if (!isAuthorizationRequiredCaseType(caseRef.caseType)) return null;
  const next = nextAuthorizationStatusForEvent(caseRef.authorizationStatus, event);
  return next === caseRef.authorizationStatus ? null : next;
}

