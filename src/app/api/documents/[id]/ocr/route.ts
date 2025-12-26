import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServerClient";
import { emptyMachtigingsregistratieFieldsV1 } from "@/features/documents/machtigingsregistratieSchema";

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

    const { data: doc, error: docErr } = await supabase
      .from("documents")
      .select("id,user_id,type,file_name")
      .eq("id", documentId)
      .maybeSingle();

    if (docErr) return NextResponse.json({ ok: false, error: docErr.message }, { status: 400 });
    if (!doc) return NextResponse.json({ ok: false, error: "Document not found" }, { status: 404 });

    if (doc.type !== "machtigingsregistratie") {
      return NextResponse.json({ ok: false, error: "OCR v1 solo soporta type=machtigingsregistratie" }, { status: 400 });
    }

    const now = new Date().toISOString();

    await supabase.from("document_reviews").insert({
      document_id: documentId,
      user_id: userData.user.id,
      actor_id: userData.user.id,
      actor_role: "user",
      action: "ocr_requested",
      payload: { provider: "mock" },
      created_at: now,
    });

    const { data: run, error: runErr } = await supabase
      .from("document_ocr_runs")
      .insert({
        document_id: documentId,
        user_id: userData.user.id,
        provider: "mock",
        status: "succeeded",
        raw_text: "",
        raw_json: {},
        error: null,
        created_at: now,
        updated_at: now,
      })
      .select("id,document_id,status,provider,created_at")
      .single();

    if (runErr) return NextResponse.json({ ok: false, error: runErr.message }, { status: 400 });

    const { data: extraction, error: exErr } = await supabase
      .from("document_extractions")
      .insert({
        document_id: documentId,
        run_id: run.id,
        user_id: userData.user.id,
        extraction_type: "machtigingsregistratie",
        schema_version: 1,
        fields: emptyMachtigingsregistratieFieldsV1(),
        needs_review: true,
        confidence: null,
        created_at: now,
        updated_at: now,
      })
      .select("id,document_id,extraction_type,needs_review,created_at")
      .single();

    if (exErr) return NextResponse.json({ ok: false, error: exErr.message }, { status: 400 });

    const extractionId = (extraction as unknown as { id: string }).id;

    await supabase.from("document_reviews").insert({
      document_id: documentId,
      user_id: userData.user.id,
      actor_id: userData.user.id,
      actor_role: "user",
      action: "ocr_succeeded",
      payload: { provider: "mock", runId: run.id, extractionId },
      created_at: now,
    });

    return NextResponse.json({ ok: true, run, extraction });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
