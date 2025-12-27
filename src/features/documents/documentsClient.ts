import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { DocumentEntity, DocumentStatus, DocumentType, OcrKind } from "./documentsTypes";

type DocumentRow = {
  id: string;
  user_id: string;
  case_id: string | null;
  file_name: string;
  type: DocumentType;
  status: DocumentStatus;
  notes: string | null;
  storage_path: string;
  created_at: string;
  updated_at: string;
};

function normalizeStoragePath(p: string) {
  const s = (p ?? "").toString().trim();
  // Si alguien pasa "vault/xxx", lo normalizamos a "xxx"
  return s.startsWith("vault/") ? s.slice("vault/".length) : s;
}

function toEntity(r: DocumentRow): DocumentEntity {
  return {
    id: r.id,
    fileName: r.file_name,
    type: r.type,
    status: r.status,
    caseId: r.case_id ?? undefined,
    notes: r.notes ?? "",
    storagePath: normalizeStoragePath(r.storage_path),
    ocrKind: ((r as { ocr_kind?: string | null }).ocr_kind === "machtigingsregistratie" ? ("machtigingsregistratie" as OcrKind) : null),
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
    .select("id,user_id,case_id,file_name,type,status,notes,storage_path,ocr_kind,created_at,updated_at")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => toEntity(r as DocumentRow));
}

export async function createDocument(args: {
  fileName: string;
  type: DocumentType;
  ocrKind?: (import("./documentsTypes").OcrKind) | null;
  caseId?: string;
  notes?: string;
  storagePath?: string; // ruta relativa dentro del bucket (ej: userId/123_file.pdf)
}): Promise<DocumentEntity> {
  const supabase = createSupabaseBrowserClient();

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw new Error(userErr.message);
  if (!userData.user) throw new Error("No authenticated user");

  const now = new Date().toISOString();

  const storagePath =
    normalizeStoragePath(
      args.storagePath ??
        `${userData.user.id}/${Date.now()}_${args.fileName.trim().replace(/[^a-zA-Z0-9._-]/g, "_")}`
    ) || `${userData.user.id}/${Date.now()}_document`;

  const { data, error } = await supabase
    .from("documents")
    .insert({
      storage_path: storagePath,
      ocr_kind: args.ocrKind ?? null,
      user_id: userData.user.id,
      case_id: args.caseId ?? null,
      file_name: args.fileName.trim(),
      type: args.type,
      status: "uploaded",
      notes: (args.notes ?? "").trim(),
      created_at: now,
      updated_at: now,
    })
    .select("id,user_id,case_id,file_name,type,status,notes,storage_path,ocr_kind,created_at,updated_at")
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

  // 1) obtener storage_path
  const { data: row, error: selErr } = await supabase
    .from("documents")
    .select("id,storage_path")
    .eq("id", id)
    .maybeSingle();

  if (selErr) throw new Error(selErr.message);

  const storagePath = row?.storage_path ? normalizeStoragePath(String(row.storage_path)) : null;

  // 2) borrar objeto en Storage (si existe)
  if (storagePath) {
    const rm = await supabase.storage.from("vault").remove([storagePath]);
    // Si falla, preferimos abortar para no dejar DB apuntando a nada raro o viceversa
    if (rm.error) throw new Error(rm.error.message);
  }

  // 3) borrar fila
  const { error } = await supabase.from("documents").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
