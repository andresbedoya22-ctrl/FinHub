import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { DocumentEntity, DocumentStatus, DocumentType } from "./documentsTypes";

type DocumentRow = {
  id: string;
  user_id: string;
  case_id: string | null;
  file_name: string;
  type: DocumentType;
  status: DocumentStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

function toEntity(r: DocumentRow): DocumentEntity {
  return {
    id: r.id,
    fileName: r.file_name,
    type: r.type,
    status: r.status,
    caseId: r.case_id ?? undefined,
    notes: r.notes ?? "",
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function listMyDocuments(): Promise<DocumentEntity[]> {
  const supabase = createSupabaseBrowserClient();

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw new Error(userErr.message);
  if (!userData.user) return [];

  const { data, error } = await supabase
    .from("documents")
    .select("id,user_id,case_id,file_name,type,status,notes,created_at,updated_at")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => toEntity(r as DocumentRow));
}

export async function createDocument(args: {
  fileName: string;
  type: DocumentType;
  caseId?: string;
  notes?: string;
}): Promise<DocumentEntity> {
  const supabase = createSupabaseBrowserClient();

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw new Error(userErr.message);
  if (!userData.user) throw new Error("No authenticated user");

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("documents")
    .insert({
      user_id: userData.user.id,
      case_id: args.caseId ?? null,
      file_name: args.fileName.trim(),
      type: args.type,
      status: "pending",
      notes: (args.notes ?? "").trim(),
      created_at: now,
      updated_at: now,
    })
    .select("id,user_id,case_id,file_name,type,status,notes,created_at,updated_at")
    .single();

  if (error) throw new Error(error.message);
  return toEntity(data as DocumentRow);
}

export async function updateDocument(
  id: string,
  patch: Partial<{ status: DocumentStatus; caseId: string | null; notes: string }>
): Promise<void> {
  const supabase = createSupabaseBrowserClient();

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw new Error(userErr.message);
  if (!userData.user) throw new Error("No authenticated user");

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.status) update.status = patch.status;
  if ("caseId" in patch) update.case_id = patch.caseId;
  if ("notes" in patch) update.notes = patch.notes ?? "";

  const { error } = await supabase.from("documents").update(update).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteDocumentById(id: string): Promise<void> {
  const supabase = createSupabaseBrowserClient();

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw new Error(userErr.message);
  if (!userData.user) throw new Error("No authenticated user");

  const { error } = await supabase.from("documents").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
