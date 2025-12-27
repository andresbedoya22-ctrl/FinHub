import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServerClient";
import { validateForVerifyMachtigingsregistratieFieldsV1 } from "@/features/documents/machtigingsregistratieSchema";

export const dynamic = "force-dynamic";

async function getIdFromParams(context: { params: Promise<{ id: string }> }) {
  const p = await context.params;
  return (p?.id ?? "").toString().trim();
}

export async function POST(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const documentId = await getIdFromParams(context);
    if (!documentId) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });

    const supabase = await createSupabaseServerClient();

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr) return NextResponse.json({ ok: false, error: userErr.message }, { status: 401 });
    if (!userData.user) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });

    const now = new Date().toISOString();

    // Enforce doc type (defensa en profundidad)
    const { data: doc, error: docErr } = await supabase.from("documents").select("id,user_id,status,ocr_kind").eq("id", documentId).maybeSingle();
    if (docErr) return NextResponse.json({ ok: false, error: docErr.message }, { status: 400 });
    if (!doc) return NextResponse.json({ ok: false, error: "Document not found" }, { status: 404 });
    if (doc.user_id !== userData.user.id) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    const ocrKind = (doc as { ocr_kind?: string | null }).ocr_kind ?? null;
    if (ocrKind !== "machtigingsregistratie") {
      return NextResponse.json({ ok: false, error: "Verify solo soporta ocr_kind=machtigingsregistratie" }, { status: 400 });
    }
// Latest extraction
    const { data: exRows, error: exErr } = await supabase
      .from("document_extractions")
      .select("id,fields,needs_review")
      .eq("document_id", documentId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (exErr) return NextResponse.json({ ok: false, error: exErr.message }, { status: 400 });

    const ex = (exRows ?? [])[0] ?? null;
    if (!ex?.id) return NextResponse.json({ ok: false, error: "No extraction to verify" }, { status: 400 });

    // Validación estricta (mínimo: activeringscode)
    const validated = validateForVerifyMachtigingsregistratieFieldsV1(ex.fields);
    if (!validated.ok) return NextResponse.json({ ok: false, error: validated.error }, { status: 400 });

    const extractionId = ex.id as string;

    const { error: updExErr } = await supabase
      .from("document_extractions")
      .update({ needs_review: false, updated_at: now })
      .eq("id", extractionId);

    if (updExErr) return NextResponse.json({ ok: false, error: updExErr.message }, { status: 400 });

    // Optional: move document status uploaded -> under_review
    await supabase
      .from("documents")
      .update({ status: "under_review", updated_at: now })
      .eq("id", documentId)
      .eq("status", "uploaded");

    // Audit: user_verified
    await supabase.from("document_reviews").insert({
      document_id: documentId,
      user_id: userData.user.id,
      actor_id: userData.user.id,
      actor_role: "user",
      action: "user_verified",
      payload: { extractionId },
      created_at: now,
    });

    return NextResponse.json({ ok: true, extractionId });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
