import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServerClient";
import type { DocumentEntity, DocumentStatus, DocumentType, OcrKind } from "@/features/documents/documentsTypes";

export const dynamic = "force-dynamic";

type DocumentRow = {
  id: string;
  user_id: string;
  case_id: string | null;
  file_name: string;
  type: DocumentType;
  status: DocumentStatus;
  ocr_kind?: string | null;
  notes: string | null;
  storage_path: string | null;
  created_at: string;
  updated_at: string;
};

function safeFileSlug(input: string) {
  return input.toString().trim().replace(/[^a-zA-Z0-9._-]/g, "_");
}

function normalizeStoragePath(p: string | null | undefined) {
  const s = (p ?? "").toString().trim();
  return s.startsWith("vault/") ? s.slice("vault/".length) : s;
}

function toEntity(r: DocumentRow): DocumentEntity {
  return {
    id: r.id,
    fileName: r.file_name,
    type: r.type,
    status: r.status,
    ocrKind: (r.ocr_kind === "machtigingsregistratie" ? ("machtigingsregistratie" as OcrKind) : null),
    caseId: r.case_id ?? undefined,
    notes: r.notes ?? "",
    storagePath: r.storage_path ? normalizeStoragePath(r.storage_path) : undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr) return NextResponse.json({ ok: false, error: userErr.message }, { status: 401 });
    if (!userData.user) return NextResponse.json({ ok: false, error: "No authenticated user" }, { status: 401 });

    const body = (await req.json().catch(() => null)) as
      | { fileName?: string; type?: DocumentType | string; caseId?: string | null; notes?: string | null; storagePath?: string | null; ocrKind?: string | null }
      | null;

    const fileName = body?.fileName?.toString().trim() ?? "";
    const type = (body?.type?.toString().trim() ?? "") as DocumentType;
    const caseId = body?.caseId ?? null;
    const notes = (body?.notes ?? "").toString().trim();


    const ocrKindRaw = (body?.ocrKind ?? null);
    const ocrKind =
      typeof ocrKindRaw === "string" && ocrKindRaw.trim().toLowerCase() === "machtigingsregistratie"
        ? "machtigingsregistratie"
        : null;
    if (fileName.length < 3) return NextResponse.json({ ok: false, error: "fileName inv�lido" }, { status: 400 });
    if (!type) return NextResponse.json({ ok: false, error: "type requerido" }, { status: 400 });

    const now = new Date().toISOString();

    const storagePathRaw = (body?.storagePath ?? "").toString().trim();
    const storagePath =
      normalizeStoragePath(storagePathRaw) ||
      `${userData.user.id}/${Date.now()}_${safeFileSlug(fileName)}`;

    const { data, error } = await supabase
      .from("documents")
      .insert({
        user_id: userData.user.id,
        case_id: caseId,
        file_name: fileName,
        type,
        ocr_kind: ocrKind,
        status: "uploaded",
        notes,
        storage_path: storagePath,
        created_at: now,
        updated_at: now,
      })
      .select("id,user_id,case_id,file_name,type,status,notes,storage_path,ocr_kind,created_at,updated_at")
      .single();

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

    return NextResponse.json({ ok: true, doc: toEntity(data as DocumentRow) });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

