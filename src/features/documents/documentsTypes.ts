export type DocumentType = "id" | "income" | "bank" | "rental" | "tax" | "other";

/**
 * IMPORTANTE:
 * Estos estados deben coincidir con el CHECK constraint en la tabla documents.
 * Ajusta aquÃ­ solo si cambias el constraint en Supabase.
 */
export type DocumentStatus = "uploaded" | "under_review" | "approved" | "rejected";

export type DocumentEntity = {
  id: string;
  fileName: string;
  type: DocumentType;
  extraction_type?: string | null;
  status: DocumentStatus;
  caseId?: string;
  notes?: string;
  storagePath?: string; // ruta relativa dentro del bucket "vault"
  createdAt: string;
  updatedAt: string;
};

export type DocumentsState = {
  documents: DocumentEntity[];
};



