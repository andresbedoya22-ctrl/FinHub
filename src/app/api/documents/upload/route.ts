import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServerClient";
import { createDocumentForUpload } from "@/features/documents/documentPipelineService";
import type { DocumentType } from "@/features/documents/documentsTypes";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await req.json().catch(() => null)) as
      | { fileName?: string; type?: DocumentType | string; ocrKind?: string | null; notes?: string | null }
      | null;

    const fileName = (body?.fileName ?? "").toString().trim();
    const type = (body?.type ?? "").toString().trim() as DocumentType;
    const ocrKind = (body?.ocrKind ?? null) as string | null;
    const notes = (body?.notes ?? null) as string | null;

    const result = await createDocumentForUpload(supabase, userData.user.id, {
      fileName,
      type,
      ocrKind,
      notes,
    });

    return NextResponse.json(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Upload preparation failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}