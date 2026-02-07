export type CaseType = "toeslagen" | "taxes" | "mortgage" | "credit" | "insurance";

export type CaseStatus =
  | "created"
  | "in_progress"
  | "waiting_user"
  | "submitted"
  | "under_review"
  | "completed"
  | "cancelled";

export type CaseStepKey =
  | "intake"
  | "eligibility"
  | "result"
  | "checkout"
  | "authorization"
  | "documents"
  | "review"
  | "submitted"
  | "done";

export type CaseEntity = {
  id: string;
  type: CaseType;
  productSlug?: string | null;
  title: string;
  status: CaseStatus;
  stepKey: CaseStepKey;
  createdAt: string; // ISO
  updatedAt: string; // ISO
};

export type CaseTaskStatus = "open" | "in_progress" | "done";

export type CaseTask = {
  id: string;
  caseId: string;
  title: string;
  status: CaseTaskStatus;
  dueAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CaseDocumentStatus = "uploaded" | "validating" | "rejected" | "validated" | "synced";

export type CaseDocumentEntry = {
  id: string;
  caseId: string;
  documentId: string;
  status: CaseDocumentStatus;
  validationReason?: string | null;
  validationMeta?: Record<string, unknown> | null;
  validatedAt?: string | null;
  rejectedAt?: string | null;
  syncedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  document?: {
    id: string;
    fileName: string;
    type: string;
    status: string;
    createdAt: string;
    updatedAt: string;
  } | null;
};

export type CaseDetail = CaseEntity & {
  tasks: CaseTask[];
  documents: CaseDocumentEntry[];
};

export type CasesState = {
  cases: CaseEntity[];
};