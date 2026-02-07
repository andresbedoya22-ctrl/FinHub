import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServerClient";
import { validateDocument } from "@/features/documents/documentPipelineService";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await req.json().catch(() => null)) as { documentId?: string } | null;
    const documentId = (body?.documentId ?? "").toString().trim();
    if (!documentId) return NextResponse.json({ error: "documentId required" }, { status: 400 });

    const result = await validateDocument(supabase, userData.user.id, documentId);
    return NextResponse.json(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Validation failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}