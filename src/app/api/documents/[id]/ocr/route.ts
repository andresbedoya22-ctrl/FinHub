import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServerClient";
import { requireOcrKind } from "../_shared/ocrGuard";
import { MACHTIGINGSREGISTRATIE_SCHEMA_VERSION } from "@/features/documents/machtigingsregistratieSchema";
import { getOcrTextProvider } from "@/features/documents/ocr/getOcrTextProvider";
import { extractMachtigingsregistratieFieldsFromText } from "@/features/documents/ocr/machtigingsregistratieTextParser";

export const dynamic = "force-dynamic";

async function getIdFromParams(context: { params: Promise<{ id: string }> }) {
  const p = await context.params;
  return (p?.id ?? "").toString().trim();
}

function parseStorageRef(storagePath: string): { bucket: string; path: string } {
  const p = (storagePath ?? "").replace(/^\/+/, "");
  const parts = p.split("/");
  if (parts.length >= 2) return { bucket: parts[0]!, path: parts.slice(1).join("/") };
  return { bucket: "vault", path: p };
}

async function fetchBytesFromSignedUrl(url: string): Promise<{ bytes: Uint8Array; contentType: string | null }> {
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Fetch file failed (${res.status}): ${t.slice(0, 200)}`);
  }
  const ab = await res.arrayBuffer();
  return { bytes: new Uint8Array(ab), contentType: res.headers.get("content-type") };
}

export async function POST(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const supabase = await createSupabaseServerClient();
  const provider = getOcrTextProvider();

  try {
    const documentId = await getIdFromParams(context);
    if (!documentId) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr) return NextResponse.json({ ok: false, error: userErr.message }, { status: 401 });
    if (!userData.user) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
    const g = await requireOcrKind({
      supabase,
      documentId,
      userId: userData.user.id,
      required: "machtigingsregistratie",
      select: "id,user_id,file_name,storage_path,ocr_kind",
      endpoint: "ocr",
    });
    if (!g.ok) return g.response;
    const doc = g.doc;

    // Canon: DocumentType != extraction_type. OCR v1 trabaja con docKind fijo.
    const extraction_type = "machtigingsregistratie" as const;

    const now = new Date().toISOString();
    await supabase.from("document_reviews").insert({
      document_id: documentId,
      user_id: userData.user.id,
      actor_id: userData.user.id,
      actor_role: "user",
      action: "ocr_requested",
      payload: { provider: provider.name, extraction_type },
      created_at: now,
    });

    const { data: runCreated, error: runCreateErr } = await supabase
      .from("document_ocr_runs")
      .insert({
        document_id: documentId,
        user_id: userData.user.id,
        provider: provider.name,
        status: "processing",
        raw_text: null,
        raw_json: null,
        error: null,
        created_at: now,
        updated_at: now,
      })
      .select("id,document_id,status,provider,created_at,updated_at")
      .single();

    if (runCreateErr) return NextResponse.json({ ok: false, error: runCreateErr.message }, { status: 400 });

    if (!doc.storage_path) {
      const err = "Document has no storage_path";
      await supabase.from("document_ocr_runs").update({ status: "failed", error: err, updated_at: now }).eq("id", runCreated.id);
      await supabase.from("document_reviews").insert({
        document_id: documentId,
        user_id: userData.user.id,
        actor_id: userData.user.id,
        actor_role: "user",
        action: "ocr_failed",
        payload: { error: err },
        created_at: now,
      });
      return NextResponse.json({ ok: false, error: err }, { status: 400 });
    }
    const storagePath = typeof doc.storage_path === "string" ? doc.storage_path : "";
    if (!storagePath) {
      return NextResponse.json({ ok: false, error: "storage_path inválido" }, { status: 400 });
    }
    const { bucket, path } = parseStorageRef(storagePath);
    const { data: signed, error: signErr } = await supabase.storage.from(bucket).createSignedUrl(path, 120);

    if (signErr || !signed?.signedUrl) {
      const err = signErr?.message ?? "Failed to create signed URL";
      await supabase.from("document_ocr_runs").update({ status: "failed", error: err, updated_at: now }).eq("id", runCreated.id);
      await supabase.from("document_reviews").insert({
        document_id: documentId,
        user_id: userData.user.id,
        actor_id: userData.user.id,
        actor_role: "user",
        action: "ocr_failed",
        payload: { error: err },
        created_at: now,
      });
      return NextResponse.json({ ok: false, error: err }, { status: 400 });
    }

    const fetched = await fetchBytesFromSignedUrl(signed.signedUrl);

    const ocr = await provider.extractText({
      bytes: fetched.bytes,
      contentType: fetched.contentType,
      fileName: typeof doc.file_name === "string" ? doc.file_name : null,
    });

    const parsed = extractMachtigingsregistratieFieldsFromText(ocr.rawText);
    if (!parsed.ok) {
      await supabase
        .from("document_ocr_runs")
        .update({ status: "failed", error: parsed.error, raw_text: ocr.rawText, raw_json: ocr.rawJson, updated_at: now })
        .eq("id", runCreated.id);

      await supabase.from("document_reviews").insert({
        document_id: documentId,
        user_id: userData.user.id,
        actor_id: userData.user.id,
        actor_role: "user",
        action: "ocr_failed",
        payload: { error: parsed.error },
        created_at: now,
      });

      return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
    }

    const { data: run, error: runUpdErr } = await supabase
      .from("document_ocr_runs")
      .update({
        status: "succeeded",
        raw_text: ocr.rawText,
        raw_json: ocr.rawJson ?? { provider: provider.name },
        error: null,
        updated_at: now,
      })
      .eq("id", runCreated.id)
      .select("id,document_id,status,provider,created_at,updated_at")
      .single();

    if (runUpdErr) return NextResponse.json({ ok: false, error: runUpdErr.message }, { status: 400 });

    const { data: extraction, error: exErr } = await supabase
      .from("document_extractions")
      .insert({
        document_id: documentId,
        run_id: run.id,
        user_id: userData.user.id,
        extraction_type,
        schema_version: MACHTIGINGSREGISTRATIE_SCHEMA_VERSION,
        fields: parsed.fields,
        needs_review: true,
        confidence: ocr.confidence,
        created_at: now,
        updated_at: now,
      })
      .select("id,document_id,run_id,extraction_type,schema_version,fields,needs_review,confidence,created_at,updated_at")
      .single();

    if (exErr) return NextResponse.json({ ok: false, error: exErr.message }, { status: 400 });

    await supabase.from("document_reviews").insert({
      document_id: documentId,
      user_id: userData.user.id,
      actor_id: userData.user.id,
      actor_role: "user",
      action: "ocr_succeeded",
      payload: { runId: run.id, extractionId: extraction.id, provider: provider.name },
      created_at: now,
    });

    return NextResponse.json({ ok: true, run, extraction });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
