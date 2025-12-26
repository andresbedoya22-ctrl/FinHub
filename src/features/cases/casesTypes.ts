export type CaseType = | "toeslag_huur" | "toeslag_zorg" | "toeslag_kinderopvang" | "tax_ib" | "tax_voorlopige_aanslag" | "finances_intake" | "document_review";

export type CaseStatus = | "created" | "in_progress" | "waiting_user" | "submitted" | "under_review" | "completed" | "cancelled";

export type StepKey = | "eligibility" | "result" | "checkout" | "authorization" | "documents" | "review" | "intake" | "submission" | "done";

export type CaseStep = {
  key: StepKey;
  label: string;
};

export type CaseEntity = {
  id: string;
  type: CaseType;
  title: string;
  status: CaseStatus;
  stepKey: StepKey;
  steps: CaseStep[];
  createdAt: string; // ISO
  updatedAt: string; // ISO
};

export type CaseDraft = {
  // Draft libre por stepKey. Cada step guarda su payload sin backend.
  [stepKey: string]: unknown;
};

export type CasesState = {
  cases: CaseEntity[];
  draftsByCaseId: Record<string, CaseDraft>;
};
