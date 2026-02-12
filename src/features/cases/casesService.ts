import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CaseAuthorizationStatus,
  CaseConsentEntry,
  CaseConsentType,
  CaseDetail,
  CaseDocumentEntry,
  CaseDocumentStatus,
  CaseEntity,
  CaseStatus,
  CaseStepKey,
  CaseTask,
  CaseTaskStatus,
  CaseType,
} from "./casesTypes";
import { defaultTitleForCaseType, initialStepKeyForType } from "./casesConfig";
import { ensureStatusTransitionAuthorization } from "./authorization";

const CASE_TYPES: ReadonlySet<CaseType> = new Set(["toeslagen", "taxes", "mortgage", "credit", "insurance"]);
const CASE_STATUSES: ReadonlySet<CaseStatus> = new Set([
  "created",
  "in_progress",
  "waiting_user",
  "ready_for_review",
  "submitted",
  "under_review",
  "completed",
  "cancelled",
]);
const CASE_STEP_KEYS: ReadonlySet<CaseStepKey> = new Set([
  "intake",
  "eligibility",
  "result",
  "checkout",
  "authorization",
  "documents",
  "review",
  "submitted",
  "done",
]);
const AUTHORIZATION_STATUSES: ReadonlySet<CaseAuthorizationStatus> = new Set([
  "not_started",
  "pending",
  "received",
  "verified",
]);
const TASK_STATUSES: ReadonlySet<CaseTaskStatus> = new Set(["open", "in_progress", "done"]);
const DOC_STATUSES: ReadonlySet<CaseDocumentStatus> = new Set(["uploaded", "validating", "rejected", "validated", "synced"]);
const CONSENT_TYPES: ReadonlySet<CaseConsentType> = new Set([
  "service_authorization",
  "data_processing",
  "terms_acceptance",
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

export type UpdateCaseInput = {
  status?: CaseStatus;
  stepKey?: CaseStepKey;
  authorizationStatus?: CaseAuthorizationStatus;
};

export type CreateCaseConsentInput = {
  consentType: CaseConsentType;
  granted: boolean;
  locale?: string | null;
  version?: number | null;
  source?: string | null;
};

type CaseRow = {
  id: string;
  type: string;
  product_slug: string | null;
  title: string;
  status: string;
  step_key: string;
  authorization_status?: string | null;
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

type ConsentRow = {
  id: string;
  case_id: string | null;
  consent_type: string | null;
  granted: boolean;
  accepted_at: string | null;
  locale: string | null;
  version: number | null;
  source: string;
  created_at: string;
  updated_at: string;
};

function toCaseEntity(row: CaseRow): CaseEntity {
  return {
    id: row.id,
    type: row.type as CaseType,
    productSlug: row.product_slug ?? null,
    title: row.title,
    status: row.status as CaseStatus,
    stepKey: row.step_key as CaseEntity["stepKey"],
    authorizationStatus: AUTHORIZATION_STATUSES.has((row.authorization_status ?? "") as CaseAuthorizationStatus)
      ? ((row.authorization_status ?? "not_started") as CaseAuthorizationStatus)
      : "not_started",
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


function isMissingAuthorizationStatusColumn(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const msg = "message" in error ? String((error as { message?: unknown }).message ?? "") : "";
  const lower = msg.toLowerCase();
  return lower.includes("authorization_status") && lower.includes("does not exist");
}

function withDefaultAuthorizationStatus(rows: Array<Record<string, unknown>>): CaseRow[] {
  return rows.map((row) => ({
    ...row,
    authorization_status: (row.authorization_status as string | null | undefined) ?? "not_started",
  })) as CaseRow[];
}

async function selectCasesCompat(
  supabase: SupabaseClient,
  opts?: { id?: string; orderAsc?: boolean; single?: boolean }
): Promise<CaseRow[] | CaseRow | null> {
  let query = supabase
    .from("cases")
    .select("id,type,product_slug,title,status,step_key,authorization_status,created_at,updated_at");

  if (opts?.id) query = query.eq("id", opts.id);
  if (opts?.orderAsc !== undefined) query = query.order("created_at", { ascending: opts.orderAsc });

  if (opts?.single) {
    const { data, error } = await query.maybeSingle();
    if (error && isMissingAuthorizationStatusColumn(error)) {
      let fallback = supabase
        .from("cases")
        .select("id,type,product_slug,title,status,step_key,created_at,updated_at");
      if (opts?.id) fallback = fallback.eq("id", opts.id);
      const f = await fallback.maybeSingle();
      if (f.error) throw new Error(f.error.message);
      if (!f.data) return null;
      return withDefaultAuthorizationStatus([f.data as Record<string, unknown>])[0] ?? null;
    }
    if (error) throw new Error(error.message);
    return (data as CaseRow | null) ?? null;
  }

  const { data, error } = await query;
  if (error && isMissingAuthorizationStatusColumn(error)) {
    let fallback = supabase
      .from("cases")
      .select("id,type,product_slug,title,status,step_key,created_at,updated_at");
    if (opts?.id) fallback = fallback.eq("id", opts.id);
    if (opts?.orderAsc !== undefined) fallback = fallback.order("created_at", { ascending: opts.orderAsc });
    const f = await fallback;
    if (f.error) throw new Error(f.error.message);
    return withDefaultAuthorizationStatus((f.data ?? []) as Array<Record<string, unknown>>);
  }
  if (error) throw new Error(error.message);
  return (data ?? []) as CaseRow[];
}

function toConsent(row: ConsentRow): CaseConsentEntry {
  return {
    id: row.id,
    caseId: row.case_id ?? "",
    consentType: (row.consent_type ?? "service_authorization") as CaseConsentType,
    granted: row.granted,
    acceptedAt: row.accepted_at,
    locale: row.locale,
    version: row.version ?? 1,
    source: row.source,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
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

export function parseUpdateCaseInput(input: unknown): UpdateCaseInput {
  if (!input || typeof input !== "object") throw new Error("Invalid body");
  const raw = input as Record<string, unknown>;

  const statusRaw = typeof raw.status === "string" ? raw.status.trim() : "";
  const stepKeyRaw = typeof raw.stepKey === "string" ? raw.stepKey.trim() : "";
  const authorizationStatusRaw =
    typeof raw.authorizationStatus === "string" ? raw.authorizationStatus.trim() : "";

  const status = CASE_STATUSES.has(statusRaw as CaseStatus) ? (statusRaw as CaseStatus) : undefined;
  const stepKey = CASE_STEP_KEYS.has(stepKeyRaw as CaseStepKey) ? (stepKeyRaw as CaseStepKey) : undefined;
  const authorizationStatus = AUTHORIZATION_STATUSES.has(authorizationStatusRaw as CaseAuthorizationStatus)
    ? (authorizationStatusRaw as CaseAuthorizationStatus)
    : undefined;

  if (!status && !stepKey && !authorizationStatus) {
    throw new Error("At least one valid case field is required");
  }

  return { status, stepKey, authorizationStatus };
}

export function parseCreateCaseConsentInput(input: unknown): CreateCaseConsentInput {
  if (!input || typeof input !== "object") throw new Error("Invalid body");
  const raw = input as Record<string, unknown>;

  const consentTypeRaw = typeof raw.consentType === "string" ? raw.consentType.trim() : "";
  if (!CONSENT_TYPES.has(consentTypeRaw as CaseConsentType)) {
    throw new Error("Invalid consent type");
  }

  if (typeof raw.granted !== "boolean") {
    throw new Error("granted is required");
  }

  const locale = typeof raw.locale === "string" ? raw.locale.trim() : null;
  const version = typeof raw.version === "number" ? raw.version : 1;
  const source = typeof raw.source === "string" && raw.source.trim() ? raw.source.trim() : "case_ui";

  return {
    consentType: consentTypeRaw as CaseConsentType,
    granted: raw.granted,
    locale,
    version,
    source,
  };
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
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Insert failed");

  const created = (await selectCasesCompat(supabase, { id: String((data as { id?: unknown }).id ?? ""), single: true })) as
    | CaseRow
    | null;
  if (!created) throw new Error("Case not found after insert");
  return toCaseEntity(created);
}

export async function listCases(supabase: SupabaseClient): Promise<CaseEntity[]> {
  const rows = (await selectCasesCompat(supabase, { orderAsc: false })) as CaseRow[];
  return rows.map((row) => toCaseEntity(row));
}

export async function getCaseDetail(supabase: SupabaseClient, id: string): Promise<CaseDetail | null> {
  const caseRow = (await selectCasesCompat(supabase, { id, single: true })) as CaseRow | null;
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

  const { data: consentsRaw, error: consentsErr } = await supabase
    .from("consents")
    .select("id,case_id,consent_type,granted,accepted_at,locale,version,source,created_at,updated_at")
    .eq("case_id", id)
    .eq("granted", true)
    .order("created_at", { ascending: false });

  if (consentsErr) throw new Error(consentsErr.message);

  return {
    ...toCaseEntity(caseRow as CaseRow),
    tasks: (tasksRaw ?? []).map((row) => toTask(row as TaskRow)),
    documents: (docsRaw ?? []).map((row) => toCaseDocument(row as CaseDocumentRow)),
    consents: (consentsRaw ?? []).map((row) => toConsent(row as ConsentRow)).filter((row) => row.caseId.length > 0),
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

async function hasServiceAuthorizationConsent(supabase: SupabaseClient, caseId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("consents")
    .select("id")
    .eq("case_id", caseId)
    .eq("consent_type", "service_authorization")
    .eq("granted", true)
    .limit(1);

  if (error) throw new Error(error.message);
  return (data ?? []).length > 0;
}

export async function updateCase(
  supabase: SupabaseClient,
  caseId: string,
  input: UpdateCaseInput
): Promise<CaseEntity> {
  const existing = (await selectCasesCompat(supabase, { id: caseId, single: true })) as CaseRow | null;
  if (!existing) throw new Error("Case not found");

  const nextStatus = input.status ?? (existing.status as CaseStatus);
  const hasConsent = await hasServiceAuthorizationConsent(supabase, caseId);
  ensureStatusTransitionAuthorization(nextStatus, hasConsent);

  const now = new Date().toISOString();
  const update: Record<string, unknown> = { updated_at: now };

  if (input.status) update.status = input.status;
  if (input.stepKey) update.step_key = input.stepKey;
  if (input.authorizationStatus) update.authorization_status = input.authorizationStatus;

  const { error } = await supabase
    .from("cases")
    .update(update)
    .eq("id", caseId);

  if (error) throw new Error(error.message);

  const refreshed = (await selectCasesCompat(supabase, { id: caseId, single: true })) as CaseRow | null;
  if (!refreshed) throw new Error("Case not found after update");
  return toCaseEntity(refreshed);
}

export async function createCaseConsent(
  supabase: SupabaseClient,
  userId: string,
  caseId: string,
  input: CreateCaseConsentInput
): Promise<CaseConsentEntry> {
  const acceptedAt = input.granted ? new Date().toISOString() : null;

  const { data, error } = await supabase
    .from("consents")
    .insert({
      user_id: userId,
      case_id: caseId,
      consent_type: input.consentType,
      type: "in_app_offers",
      granted: input.granted,
      source: input.source ?? "case_ui",
      accepted_at: acceptedAt,
      locale: input.locale ?? null,
      version: input.version ?? 1,
    })
    .select("id,case_id,consent_type,granted,accepted_at,locale,version,source,created_at,updated_at")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Consent insert failed");

  if (input.consentType === "service_authorization" && input.granted) {
    const upd = await supabase
      .from("cases")
      .update({ authorization_status: "received", updated_at: new Date().toISOString() })
      .eq("id", caseId);
    if (upd.error) throw new Error(upd.error.message);
  }

  return toConsent(data as ConsentRow);
}
