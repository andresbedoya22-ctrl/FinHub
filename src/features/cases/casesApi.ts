import type {
  CaseConsentEntry,
  CaseEntity,
  CaseStatus,
  CaseStepKey,
  CaseAuthorizationStatus,
  CaseDetail,
  CaseDocumentEntry,
  CaseTask,
} from "./casesTypes";

export type CreateCaseInput = {
  type: CaseEntity["type"];
  title?: string | null;
  productSlug?: string | null;
};

export async function listCases(): Promise<CaseEntity[]> {
  const res = await fetch("/api/cases", { method: "GET" });
  if (!res.ok) throw new Error(await safeText(res));
  return (await res.json()) as CaseEntity[];
}

export async function createCase(input: CreateCaseInput): Promise<CaseEntity> {
  const res = await fetch("/api/cases", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await safeText(res));
  return (await res.json()) as CaseEntity;
}

export async function getCaseDetail(id: string): Promise<CaseDetail> {
  const res = await fetch(`/api/cases/${encodeURIComponent(id)}`, { method: "GET" });
  if (!res.ok) throw new Error(await safeText(res));
  return (await res.json()) as CaseDetail;
}

export type UpdateCaseInput = {
  status?: CaseStatus;
  stepKey?: CaseStepKey;
  authorizationStatus?: CaseAuthorizationStatus;
};

export async function updateCase(caseId: string, input: UpdateCaseInput): Promise<CaseEntity> {
  const res = await fetch(`/api/cases/${encodeURIComponent(caseId)}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await safeText(res));
  return (await res.json()) as CaseEntity;
}

export type CreateCaseTaskInput = {
  title: string;
  status?: CaseTask["status"];
  dueAt?: string | null;
};

export async function createCaseTask(caseId: string, input: CreateCaseTaskInput): Promise<CaseTask> {
  const res = await fetch(`/api/cases/${encodeURIComponent(caseId)}/tasks`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await safeText(res));
  return (await res.json()) as CaseTask;
}

export type CreateCaseDocumentInput = {
  documentId: string;
  status?: CaseDocumentEntry["status"];
};

export async function createCaseDocument(caseId: string, input: CreateCaseDocumentInput): Promise<CaseDocumentEntry> {
  const res = await fetch(`/api/cases/${encodeURIComponent(caseId)}/documents`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await safeText(res));
  return (await res.json()) as CaseDocumentEntry;
}

export type CreateCaseConsentInput = {
  consentType: "service_authorization" | "data_processing" | "terms_acceptance";
  granted: boolean;
  locale?: string;
  version?: number;
  source?: string;
};

export async function createCaseConsent(
  caseId: string,
  input: CreateCaseConsentInput
): Promise<CaseConsentEntry> {
  const res = await fetch(`/api/cases/${encodeURIComponent(caseId)}/consents`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await safeText(res));
  return (await res.json()) as CaseConsentEntry;
}

async function safeText(res: Response): Promise<string> {
  try {
    const t = await res.text();
    return t || `${res.status} ${res.statusText}`;
  } catch {
    return `${res.status} ${res.statusText}`;
  }
}
