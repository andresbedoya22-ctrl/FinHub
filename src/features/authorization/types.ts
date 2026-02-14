export type AuthorizationCaseType = "toeslagen" | "taxes" | "mortgage" | "credit" | "insurance";

export type AuthorizationStatus = "not_started" | "pending" | "received" | "verified";

export type AuthorizationEvent = "consent_granted" | "activation_code_verified";

export type AuthorizationCaseRef = {
  caseId: string;
  caseType: AuthorizationCaseType;
  authorizationStatus: AuthorizationStatus;
};

