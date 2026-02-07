import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CaseDetail,
  CaseDocumentEntry,
  CaseDocumentStatus,
  CaseEntity,
  CaseStatus,
  CaseTask,
  CaseTaskStatus,
  CaseType,
} from "./casesTypes";
import { defaultTitleForCaseType, initialStepKeyForType } from "./casesConfig";

const CASE_TYPES: ReadonlySet<CaseType> = new Set([
  "toeslagen",
  "taxes",
  "mortgage",
  "credit",
  "insurance",
]);

const TASK_STATUSES: ReadonlySet<CaseTaskStatus> = new Set(["open", "in_progress", "done"]);
const DOC_STATUSES: ReadonlySet<CaseDocumentStatus> = new Set([
  "uploaded",
  "validating",
  "rejected",
  "validated",
  "synced",
]);

export type CreateCaseInput = {
  type: CaseType;
  title?: string | null;
  productSlug?: string | null;
};

export type CreateTaskInput = {
  title: string;
  status?: CaseTaskStatus;
  dueAt?: string | null;
};

export type CreateCaseDocumentInput = {
  documentId: string;
  status?: CaseDocumentStatus;
};

export type UpdateCaseDocumentInput = {
  status?: CaseDocumentStatus;
  validationReason?: string | null;
  validationMeta?: Record<string, unknown> | null;
};

type CaseRow = {
  id: string;
  type: string;
  product_slug: string | null;
  title: string;
  status: string;
  step_key: string;
  created_at: string;
  updated_at: string;
};

type TaskRow = {
  id: string;
  case_id: string;
  title: string;
  status: string;
  due_at: string | null;
  created_at: string;
  updated_at: string;
};

type DocumentRow = {
  id: string;
  file_name: string;
  type: string;
  status: string;
  created_at: string;
  updated_at: string;
};

type CaseDocumentRow = {
  id: string;
  case_id: string;
  document_id: string;
  status: string;
  validation_reason: string | null;
  validation_meta: Record<string, unknown> | null;
  validated_at: string | null;
  rejected_at: string | null;
  synced_at: string | null;
  created_at: string;
  updated_at: string;
  document?: DocumentRow | DocumentRow[] | null;
};

function toCaseEntity(row: CaseRow): CaseEntity {
  return {
    id: row.id,
    type: row.type as CaseType,
    productSlug: row.product_slug ?? null,
    title: row.title,
    status: row.status as CaseStatus,
    stepKey: row.step_key as CaseEntity["stepKey"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toTask(row: TaskRow): CaseTask {
  return {
    id: row.id,
    caseId: row.case_id,
    title: row.title,
    status: row.status as CaseTaskStatus,
    dueAt: row.due_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeDocument(row: CaseDocumentRow): DocumentRow | null {
  if (!row.document) return null;
  if (Array.isArray(row.document)) return row.document[0] ?? null;
  return row.document;
}

function toCaseDocument(row: CaseDocumentRow): CaseDocumentEntry {
  const doc = normalizeDocument(row);
  return {
    id: row.id,
    caseId: row.case_id,
    documentId: row.document_id,
    status: row.status as CaseDocumentStatus,
    validationReason: row.validation_reason ?? null,
    validationMeta: row.validation_meta ?? null,
    validatedAt: row.validated_at ?? null,
    rejectedAt: row.rejected_at ?? null,
    syncedAt: row.synced_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    document: doc
      ? {
          id: doc.id,
          fileName: doc.file_name,
          type: doc.type,
          status: doc.status,
          createdAt: doc.created_at,
          updatedAt: doc.updated_at,
        }
      : null,
  };
}

export function parseCreateCaseInput(input: unknown): CreateCaseInput {
  if (!input || typeof input !== "object") throw new Error("Invalid body");
  const raw = input as Record<string, unknown>;
  const typeRaw = String(raw.type ?? "").trim();
  if (!typeRaw || !CASE_TYPES.has(typeRaw as CaseType)) throw new Error("Invalid case type");
  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  const productSlug = typeof raw.productSlug === "string" ? raw.productSlug.trim() : "";
  return {
    type: typeRaw as CaseType,
    title: title || null,
    productSlug: productSlug || null,
  };
}

export function parseCreateTaskInput(input: unknown): CreateTaskInput {
  if (!input || typeof input !== "object") throw new Error("Invalid body");
  const raw = input as Record<string, unknown>;
  const title = String(raw.title ?? "").trim();
  if (title.length < 2) throw new Error("Task title required");
  const statusRaw = typeof raw.status === "string" ? raw.status.trim() : "";
  const status = TASK_STATUSES.has(statusRaw as CaseTaskStatus) ? (statusRaw as CaseTaskStatus) : undefined;
  const dueAt = typeof raw.dueAt === "string" ? raw.dueAt.trim() : null;
  return { title, status, dueAt };
}

export function parseCreateCaseDocumentInput(input: unknown): CreateCaseDocumentInput {
  if (!input || typeof input !== "object") throw new Error("Invalid body");
  const raw = input as Record<string, unknown>;
  const documentId = String(raw.documentId ?? "").trim();
  if (!documentId) throw new Error("documentId required");
  const statusRaw = typeof raw.status === "string" ? raw.status.trim() : "";
  const status = DOC_STATUSES.has(statusRaw as CaseDocumentStatus) ? (statusRaw as CaseDocumentStatus) : undefined;
  return { documentId, status };
}

export async function createCase(
  supabase: SupabaseClient,
  userId: string,
  input: CreateCaseInput
): Promise<CaseEntity> {
  const title = input.title?.trim() ? input.title.trim() : defaultTitleForCaseType(input.type);
  const stepKey = initialStepKeyForType(input.type);

  const { data, error } = await supabase
    .from("cases")
    .insert({
      user_id: userId,
      type: input.type,
      product_slug: input.productSlug ?? null,
      title,
      status: "created",
      step_key: stepKey,
    })
    .select("id,type,product_slug,title,status,step_key,created_at,updated_at")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Insert failed");
  return toCaseEntity(data as CaseRow);
}

export async function listCases(supabase: SupabaseClient): Promise<CaseEntity[]> {
  const { data, error } = await supabase
    .from("cases")
    .select("id,type,product_slug,title,status,step_key,created_at,updated_at")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => toCaseEntity(row as CaseRow));
}

export async function getCaseDetail(supabase: SupabaseClient, id: string): Promise<CaseDetail | null> {
  const { data: caseRow, error } = await supabase
    .from("cases")
    .select("id,type,product_slug,title,status,step_key,created_at,updated_at")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!caseRow) return null;

  const { data: tasksRaw, error: tasksErr } = await supabase
    .from("case_tasks")
    .select("id,case_id,title,status,due_at,created_at,updated_at")
    .eq("case_id", id)
    .order("created_at", { ascending: true });

  if (tasksErr) throw new Error(tasksErr.message);

  const { data: docsRaw, error: docsErr } = await supabase
    .from("case_documents")
    .select(
      "id,case_id,document_id,status,validation_reason,validation_meta,validated_at,rejected_at,synced_at,created_at,updated_at,document:documents(id,file_name,type,status,created_at,updated_at)"
    )
    .eq("case_id", id)
    .order("created_at", { ascending: true });

  if (docsErr) throw new Error(docsErr.message);

  return {
    ...toCaseEntity(caseRow as CaseRow),
    tasks: (tasksRaw ?? []).map((row) => toTask(row as TaskRow)),
    documents: (docsRaw ?? []).map((row) => toCaseDocument(row as CaseDocumentRow)),
  };
}

export async function createCaseTask(
  supabase: SupabaseClient,
  caseId: string,
  input: CreateTaskInput
): Promise<CaseTask> {
  const { data, error } = await supabase
    .from("case_tasks")
    .insert({
      case_id: caseId,
      title: input.title,
      status: input.status ?? "open",
      due_at: input.dueAt ?? null,
    })
    .select("id,case_id,title,status,due_at,created_at,updated_at")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Insert failed");
  return toTask(data as TaskRow);
}

export async function createCaseDocument(
  supabase: SupabaseClient,
  caseId: string,
  input: CreateCaseDocumentInput
): Promise<CaseDocumentEntry> {
  const { data, error } = await supabase
    .from("case_documents")
    .insert({
      case_id: caseId,
      document_id: input.documentId,
      status: input.status ?? "uploaded",
    })
    .select(
      "id,case_id,document_id,status,validation_reason,validation_meta,validated_at,rejected_at,synced_at,created_at,updated_at,document:documents(id,file_name,type,status,created_at,updated_at)"
    )
    .single();

  if (error || !data) throw new Error(error?.message ?? "Insert failed");
  return toCaseDocument(data as CaseDocumentRow);
}

export async function updateCaseDocument(
  supabase: SupabaseClient,
  caseId: string,
  caseDocumentId: string,
  input: UpdateCaseDocumentInput
): Promise<CaseDocumentEntry> {
  const { data: existing, error: existingErr } = await supabase
    .from("case_documents")
    .select("id,case_id,status,validated_at,rejected_at,synced_at")
    .eq("id", caseDocumentId)
    .eq("case_id", caseId)
    .maybeSingle();

  if (existingErr) throw new Error(existingErr.message);
  if (!existing) throw new Error("Case document not found");

  const nextStatus = input.status ?? (existing.status as CaseDocumentStatus);
  if (!DOC_STATUSES.has(nextStatus)) throw new Error("Invalid status");

  if (input.status === "synced" && existing.status !== "validated") {
    throw new Error("Cannot sync before validation");
  }

  const now = new Date().toISOString();
  const update: Record<string, unknown> = {
    updated_at: now,
  };

  if (input.status) update.status = input.status;
  if (input.validationReason !== undefined) update.validation_reason = input.validationReason;
  if (input.validationMeta !== undefined) update.validation_meta = input.validationMeta;

  if (input.status === "validated") {
    update.validated_at = now;
    update.rejected_at = null;
  }

  if (input.status === "rejected") {
    update.rejected_at = now;
    update.validated_at = null;
  }

  if (input.status === "synced") {
    update.synced_at = now;
  }

  const { data, error } = await supabase
    .from("case_documents")
    .update(update)
    .eq("id", caseDocumentId)
    .eq("case_id", caseId)
    .select(
      "id,case_id,document_id,status,validation_reason,validation_meta,validated_at,rejected_at,synced_at,created_at,updated_at,document:documents(id,file_name,type,status,created_at,updated_at)"
    )
    .single();

  if (error || !data) throw new Error(error?.message ?? "Update failed");
  return toCaseDocument(data as CaseDocumentRow);
}