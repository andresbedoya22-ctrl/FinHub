export type ApiDocumentRow = {
  id: string;
  user_id: string;
  case_id: string | null;
  file_name: string;
  type: string;
  status: string;
  notes: string | null;
  storage_path: string | null;
  ocr_kind: string | null;
  created_at: string;
  updated_at: string;
};

export type ApiExtractionRow = {
  id: string;
  document_id: string;
  run_id: string | null;
  extraction_type: string;
  schema_version: number;
  fields: Record<string, unknown>;
  needs_review: boolean;
  confidence: number | null;
  created_at: string;
  updated_at: string;
};

async function readJson(res: Response): Promise<unknown> {
  return await res.json().catch(() => ({}));
}

function assertOk(res: Response, json: unknown, fallbackMsg: string) {
  const obj = (json ?? {}) as Record<string, unknown>;
  const ok = obj.ok === true;
  if (!res.ok || !ok) {
    const err = typeof obj.error === "string" ? obj.error : fallbackMsg;
    throw new Error(err);
  }
}

export async function requestOcr(documentId: string): Promise<{ run: unknown; extraction: unknown }> {
  const res = await fetch(`/api/documents/${encodeURIComponent(documentId)}/ocr`, { method: "POST" });
  const json = await readJson(res);
  assertOk(res, json, "OCR request failed");

  const obj = json as Record<string, unknown>;
  return {
    run: obj.run,
    extraction: obj.extraction,
  };
}

export async function getDocument(documentId: string): Promise<ApiDocumentRow> {
  const res = await fetch(`/api/documents/${encodeURIComponent(documentId)}`, { method: "GET" });
  const json = await readJson(res);
  assertOk(res, json, "Get document failed");

  const obj = json as Record<string, unknown>;
  return obj.doc as ApiDocumentRow;
}

export async function getLatestExtraction(documentId: string): Promise<ApiExtractionRow | null> {
  const res = await fetch(`/api/documents/${encodeURIComponent(documentId)}/extraction`, { method: "GET" });
  const json = await readJson(res);
  assertOk(res, json, "Get extraction failed");

  const obj = json as Record<string, unknown>;
  return (obj.extraction as ApiExtractionRow | null) ?? null;
}

export async function updateLatestExtraction(
  documentId: string,
  patch: { fields?: Record<string, unknown>; needsReview?: boolean; confidence?: number | null }
): Promise<{ extractionId: string }> {
  const res = await fetch(`/api/documents/${encodeURIComponent(documentId)}/extraction`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(patch),
  });

  const json = await readJson(res);
  assertOk(res, json, "Update extraction failed");

  const obj = json as Record<string, unknown>;
  const extractionId = typeof obj.extractionId === "string" ? obj.extractionId : "";
  if (!extractionId) throw new Error("Missing extractionId");
  return { extractionId };
}

export async function verifyExtraction(documentId: string): Promise<{ extractionId: string }> {
  const res = await fetch(`/api/documents/${encodeURIComponent(documentId)}/verify`, { method: "POST" });
  const json = await readJson(res);
  assertOk(res, json, "Verify failed");

  const obj = json as Record<string, unknown>;
  const extractionId = typeof obj.extractionId === "string" ? obj.extractionId : "";
  if (!extractionId) throw new Error("Missing extractionId");
  return { extractionId };
}
export async function runExtraction(documentId: string): Promise<{ extraction: ApiExtractionRow | null }> {
  const res = await fetch(`/api/documents/${encodeURIComponent(documentId)}/extraction`, { method: "POST" });
  const json = await readJson(res);
  assertOk(res, json, "Extraction request failed");

  const obj = json as Record<string, unknown>;
  return { extraction: (obj.extraction as ApiExtractionRow | null) ?? null };
}

