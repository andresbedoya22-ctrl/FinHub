import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServerClient";
import type { DocumentEntity, DocumentStatus, DocumentType } from "@/features/documents/documentsTypes";

export const dynamic = "force-dynamic";

type DocumentRow = {
  id: string;
  user_id: string;
  case_id: string | null;
  file_name: string;
  type: DocumentType;
  status: DocumentStatus;
  notes: string | null;
  storage_path: string | null;
  created_at: string;
  updated_at: string;
};

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
    caseId: r.case_id ?? undefined,
    notes: r.notes ?? "",
    storagePath: r.storage_path ? normalizeStoragePath(r.storage_path) : undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr) return NextResponse.json({ ok: false, error: userErr.message }, { status: 401 });
    if (!userData.user) return NextResponse.json({ ok: true, docs: [] });

    const { data, error } = await supabase
      .from("documents")
      .select("id,user_id,case_id,file_name,type,status,notes,storage_path,created_at,updated_at")
      .eq("user_id", userData.user.id)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

    return NextResponse.json({ ok: true, docs: (data ?? []).map((r) => toEntity(r as DocumentRow)) });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
