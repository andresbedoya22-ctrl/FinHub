import type { SupabaseClient } from "@supabase/supabase-js";
import type { DocumentEntity, DocumentType, OcrKind } from "./documentsTypes";
import { inferOcrKindFromType, parseOcrKind } from "./documentOcrRegistry";
import { getOcrTextProvider } from "./ocr/getOcrTextProvider";

const ALLOWED_MIME = new Set(["application/pdf", "image/png", "image/jpeg"]);

export type UploadDocumentInput = {
  fileName: string;
  type: DocumentType;
  ocrKind?: string | null;
  notes?: string | null;
};

export type UploadDocumentResult = {
  doc: DocumentEntity;
  bucket: string;
  path: string;
  token: string;
};

export type UploadToSignedInput = {
  bucket: string;
  path: string;
  token: string;
  file: File;
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

type DocumentRow = {
  id: string;
  user_id: string;
  case_id: string | null;
  file_name: string;
  type: DocumentType;
  status: string;
  ocr_kind?: string | null;
  notes: string | null;
  storage_path: string | null;
  created_at: string;
  updated_at: string;
};

function getMaxFileBytes(): number {
  return Number(process.env.FINHUB_DOC_MAX_BYTES ?? 10 * 1024 * 1024);
}

function getMinOcrConfidence(): number {
  return Number(process.env.FINHUB_OCR_MIN_CONFIDENCE ?? 0.45);
}

function safeFileSlug(input: string) {
  return input.toString().trim().replace(/[^a-zA-Z0-9._-]/g, "_");
}

function normalizeStoragePath(p: string | null | undefined) {
  const s = (p ?? "").toString().trim();
  return s.startsWith("vault/") ? s.slice("vault/".length) : s;
}

function parseStorageRef(storagePath: string): { bucket: string; path: string } {
  const p = (storagePath ?? "").replace(/^\/+/, "");
  if (!p) return { bucket: "vault", path: "" };
  if (p.startsWith("vault/")) return { bucket: "vault", path: p.slice("vault/".length) };
  return { bucket: "vault", path: p };
}

function inferMimeFromName(fileName: string): string | null {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  return null;
}

function toEntity(r: DocumentRow): DocumentEntity {
  return {
    id: r.id,
    fileName: r.file_name,
    type: r.type,
    status: r.status as DocumentEntity["status"],
    ocrKind: (r.ocr_kind === "machtigingsregistratie" ? ("machtigingsregistratie" as OcrKind) : null),
    caseId: r.case_id ?? undefined,
    notes: r.notes ?? "",
    storagePath: r.storage_path ? normalizeStoragePath(r.storage_path) : undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function buildMeta(input: {
  mime: string | null;
  fileSize: number | null;
  docType: string;
  provider: string | null;
  confidence: number | null;
}): DocumentValidationMeta {
  return {
    mime: input.mime ?? null,
    file_size: input.fileSize ?? null,
    doc_type: input.docType,
    provider: input.provider ?? null,
    ocr_confidence: input.confidence ?? null,
  };
}

export async function createDocumentForUpload(
  supabase: SupabaseClient,
  userId: string,
  input: UploadDocumentInput
): Promise<UploadDocumentResult> {
  const fileName = input.fileName.trim();
  if (fileName.length < 3) throw new Error("fileName invalid");
  if (!input.type) throw new Error("type required");

  const ocrKind = parseOcrKind(input.ocrKind) ?? inferOcrKindFromType(input.type);
  const storagePath = `${userId}/${Date.now()}_${safeFileSlug(fileName)}`;
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("documents")
    .insert({
      user_id: userId,
      case_id: null,
      file_name: fileName,
      type: input.type,
      ocr_kind: ocrKind,
      status: "uploaded",
      notes: (input.notes ?? "").toString().trim(),
      storage_path: storagePath,
      created_at: now,
      updated_at: now,
    })
    .select("id,user_id,case_id,file_name,type,status,notes,storage_path,ocr_kind,created_at,updated_at")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Insert failed");

  const upload = await supabase.storage.from("vault").createSignedUploadUrl(storagePath);
  if (upload.error || !upload.data?.token || !upload.data?.path) {
    throw new Error(upload.error?.message ?? "Failed to create upload token");
  }

  return {
    doc: toEntity(data as DocumentRow),
    bucket: "vault",
    path: upload.data.path,
    token: upload.data.token,
  };
}

export async function uploadToSignedUrl(
  supabase: SupabaseClient,
  input: UploadToSignedInput
): Promise<void> {
  const bucket = input.bucket.trim() || "vault";
  const path = input.path.trim();
  const token = input.token.trim();
  if (!path || !token) throw new Error("Missing upload data");

  const res = await supabase.storage
    .from(bucket)
    .uploadToSignedUrl(path, token, input.file, {
      contentType: input.file.type || "application/octet-stream",
    });

  if (res.error) throw new Error(res.error.message);
}

export async function validateDocument(
  supabase: SupabaseClient,
  userId: string,
  documentId: string
): Promise<DocumentValidationResult> {
  const { data, error } = await supabase
    .from("documents")
    .select("id,user_id,file_name,type,storage_path")
    .eq("id", documentId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Document not found");
  if (data.user_id !== userId) throw new Error("Forbidden");

  const storagePath = typeof data.storage_path === "string" ? data.storage_path : "";
  if (!storagePath) throw new Error("storage_path missing");

  const { bucket, path } = parseStorageRef(storagePath);
  const fetched = await supabase.storage.from(bucket).download(path);
  if (fetched.error || !fetched.data) {
    throw new Error(fetched.error?.message ?? "Failed to read file from Storage");
  }

  const docType = data.type ?? "unknown";
  const maxBytes = getMaxFileBytes();
  const blobSize = typeof fetched.data.size === "number" ? fetched.data.size : null;
  const contentType = (fetched.data as unknown as { type?: string }).type ?? null;
  const inferred = inferMimeFromName(data.file_name ?? "");
  const mime = contentType ?? inferred;

  if (Number.isFinite(maxBytes) && blobSize !== null && blobSize > maxBytes) {
    return {
      status: "rejected",
      reason: "file_too_large",
      meta: buildMeta({
        mime,
        fileSize: blobSize,
        docType,
        provider: null,
        confidence: null,
      }),
    };
  }

  const ab = await fetched.data.arrayBuffer();
  const bytes = new Uint8Array(ab);
  const fileSize = bytes.length;

  if (Number.isFinite(maxBytes) && fileSize > maxBytes) {
    return {
      status: "rejected",
      reason: "file_too_large",
      meta: buildMeta({
        mime,
        fileSize,
        docType,
        provider: null,
        confidence: null,
      }),
    };
  }

  if (!mime || !ALLOWED_MIME.has(mime)) {
    return {
      status: "rejected",
      reason: "unsupported_mime",
      meta: buildMeta({
        mime,
        fileSize,
        docType,
        provider: null,
        confidence: null,
      }),
    };
  }

  const provider = getOcrTextProvider();
  let confidence = 0;

  try {
    const ocr = await provider.extractText({
      bytes,
      contentType: mime,
      fileName: data.file_name ?? null,
    });
    confidence = typeof ocr.confidence === "number" ? ocr.confidence : 0;
  } catch {
    return {
      status: "rejected",
      reason: "unknown",
      meta: buildMeta({
        mime,
        fileSize,
        docType,
        provider: provider.name,
        confidence: null,
      }),
    };
  }

  const meta = buildMeta({
    mime,
    fileSize,
    docType,
    provider: provider.name,
    confidence,
  });

  const minConfidence = getMinOcrConfidence();
  if (Number.isFinite(minConfidence) && confidence < minConfidence) {
    return {
      status: "rejected",
      reason: "ocr_low_confidence",
      meta,
    };
  }

  return {
    status: "validated",
    reason: null,
    meta,
  };
}
