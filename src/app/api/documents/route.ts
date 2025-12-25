import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServerClient";

export const dynamic = "force-dynamic";

function safeFileSlug(input: string) {
  return input.toString().trim().replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr) return NextResponse.json({ ok: false, error: userErr.message }, { status: 401 });
    if (!userData.user) return NextResponse.json({ ok: false, error: "No authenticated user" }, { status: 401 });

    const body = (await req.json().catch(() => null)) as
      | { fileName?: string; type?: string; caseId?: string | null; notes?: string | null }
      | null;

    const fileName = body?.fileName?.toString().trim() ?? "";
    const type = body?.type?.toString().trim() ?? "";
    const caseId = body?.caseId ?? null;
    const notes = (body?.notes ?? "").toString().trim();

    if (fileName.length < 3) {
      return NextResponse.json({ ok: false, error: "fileName inválido" }, { status: 400 });
    }
    if (!type) {
      return NextResponse.json({ ok: false, error: "type requerido" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const storagePath = `vault/${Date.now()}_${safeFileSlug(fileName)}`;

    const { data, error } = await supabase
      .from("documents")
      .insert({
        user_id: userData.user.id,
        case_id: caseId,
        file_name: fileName,
        type,
        status: "uploaded",
        notes,
        storage_path: storagePath,
        created_at: now,
        updated_at: now,
      })
      .select("id,user_id,case_id,file_name,type,status,notes,created_at,updated_at")
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true, doc: data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}