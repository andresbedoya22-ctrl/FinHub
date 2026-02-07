import type { CaseDocumentEntry } from "@/features/cases/casesTypes";
import type { DocumentEntity, DocumentType } from "@/features/documents/documentsTypes";

export type UploadDocumentResult = {
  doc: DocumentEntity;
  bucket: string;
  path: string;
  token: string;
};

export type DocumentValidationMeta = {
  mime: string | null;
  file_size: number | null;
  doc_type: string;
  provider: string | null;
  ocr_confidence: number | null;
};

export type DocumentValidationResult = {
  status: "validated" | "rejected";
  reason: string | null;
  meta: DocumentValidationMeta;
};

export async function uploadDocument(file: File, type: DocumentType): Promise<UploadDocumentResult> {
  const res = await fetch("/api/documents/upload", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ fileName: file.name, type }),
  });
  if (!res.ok) throw new Error(await safeText(res));
  const json = (await res.json()) as UploadDocumentResult;

  const form = new FormData();
  form.set("file", file);
  form.set("bucket", json.bucket);
  form.set("path", json.path);
  form.set("token", json.token);

  const uploadRes = await fetch("/api/documents/upload-to-signed", {
    method: "POST",
    body: form,
  });

  if (!uploadRes.ok) {
    const err = await safeText(uploadRes);
    throw new Error(err || "Upload failed");
  }

  return json;
}

export async function attachDocumentToCase(caseId: string, documentId: string): Promise<CaseDocumentEntry> {
  const res = await fetch(`/api/cases/${encodeURIComponent(caseId)}/documents`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ documentId }),
  });
  if (!res.ok) throw new Error(await safeText(res));
  return (await res.json()) as CaseDocumentEntry;
}

export async function validateDocument(documentId: string): Promise<DocumentValidationResult> {
  const res = await fetch("/api/documents/validate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ documentId }),
  });
  if (!res.ok) throw new Error(await safeText(res));
  return (await res.json()) as DocumentValidationResult;
}

export async function updateCaseDocument(
  caseId: string,
  caseDocumentId: string,
  patch: { status?: CaseDocumentEntry["status"]; validationReason?: string | null; validationMeta?: Record<string, unknown> | null }
): Promise<CaseDocumentEntry> {
  const res = await fetch(`/api/cases/${encodeURIComponent(caseId)}/documents/${encodeURIComponent(caseDocumentId)}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(await safeText(res));
  return (await res.json()) as CaseDocumentEntry;
}

async function safeText(res: Response): Promise<string> {
  try {
    const t = await res.text();
    return t || `${res.status} ${res.statusText}`;
  } catch {
    return `${res.status} ${res.statusText}`;
  }
}
