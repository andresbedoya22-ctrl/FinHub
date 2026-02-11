export type AdminCaseRow = {
  id: string;
  type: string;
  title: string;
  status: string;
  step_key: string;
  authorization_status: string;
  created_at: string;
  updated_at: string;
  sla_bucket: "ok" | "warning" | "overdue";
};

export type AdminCaseTask = {
  id: string;
  case_id: string;
  title: string;
  status: "open" | "in_progress" | "done";
  due_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminCaseDocument = {
  id: string;
  case_id: string;
  document_id: string;
  status: string;
  validation_reason: string | null;
  validated_at: string | null;
  rejected_at: string | null;
  synced_at: string | null;
  created_at: string;
  updated_at: string;
  document?: {
    id: string;
    file_name: string;
    type: string;
    status: string;
    created_at: string;
    updated_at: string;
  } | null;
};

export type AdminCaseNote = {
  id: string;
  case_id: string;
  author_user_id: string;
  note: string;
  created_at: string;
  updated_at: string;
};

export type AdminCaseDetailResponse = {
  ok: true;
  case: {
    id: string;
    type: string;
    title: string;
    status: string;
    step_key: string;
    authorization_status: string;
    created_at: string;
    updated_at: string;
  };
  tasks: AdminCaseTask[];
  documents: AdminCaseDocument[];
  notes: AdminCaseNote[];
};

export async function listAdminCases(filters: Record<string, string | undefined>) {
  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (v && v.trim()) query.set(k, v.trim());
  }
  const res = await fetch(`/api/admin/cases?${query.toString()}`, { method: "GET" });
  if (!res.ok) throw new Error(await res.text());
  const data = (await res.json()) as { ok: boolean; rows: AdminCaseRow[] };
  return data.rows ?? [];
}

export async function getAdminCaseDetail(id: string) {
  const res = await fetch(`/api/admin/cases/${encodeURIComponent(id)}`, { method: "GET" });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as AdminCaseDetailResponse;
}

export async function updateAdminCaseTaskStatus(caseId: string, taskId: string, status: AdminCaseTask["status"]) {
  const res = await fetch(`/api/admin/cases/${encodeURIComponent(caseId)}/tasks/${encodeURIComponent(taskId)}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as { ok: true; task: AdminCaseTask };
}

export async function createAdminCaseNote(caseId: string, note: string) {
  const res = await fetch(`/api/admin/cases/${encodeURIComponent(caseId)}/notes`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ note }),
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as { ok: true; note: AdminCaseNote };
}
