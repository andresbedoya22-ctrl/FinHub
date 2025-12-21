export type DocumentStatus = "pending" | "ready" | "reviewed";

export type DocumentType =
  | "id"
  | "income"
  | "bank"
  | "rental"
  | "tax"
  | "other";

export type DocumentEntity = {
  id: string;
  fileName: string;
  type: DocumentType;
  status: DocumentStatus;
  caseId?: string; // asociaciÃ³n opcional a Case
  notes?: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
};

export type DocumentsState = {
  documents: DocumentEntity[];
};
