import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServerClient";
import {
  MACHTIGINGSREGISTRATIE_SCHEMA_VERSION,
  validateForSaveMachtigingsregistratieFieldsV1,
  type MachtigingsregistratieFieldsV1,
} from "@/features/documents/machtigingsregistratieSchema";

export const dynamic = "force-dynamic";

async function getIdFromParams(context: { params: Promise<{ id: string }> }) {
  const p = await context.params;
  return (p?.id ?? "").toString().trim();
}

function buildDeterministicCode(seed: string, len: number): string {
  const cleaned = seed.replace(/[^a-zA-Z0-9]+/g, "").toUpperCase();
  const base = cleaned.length ? cleaned : "FINHUB";
  const padded = (base + "X".repeat(len)).slice(0, len);
  return padded;
}

function mockOcrMachtigingsregistratie(fileName: string): {
  rawText: string;
  fields: MachtigingsregistratieFieldsV1;
  confidence: number | null;
} {
  // Mock v1: determinista por filename. NO pretende reflejar formato real de la carta aún.
  const activeringscode = buildDeterministicCode(fileName, 8); // >= 6 chars
  const briefkenmerk = `FINHUB-${buildDeterministicCode(fileName, 6)}`;
  const intrekkingscode = `INT-${buildDeterministicCode(fileName, 6)}`;

  const rawText =
    `Machtigingsregistratie\n` +
    `Activeringscode: ${activeringscode}\n` +
    `Briefkenmerk: ${briefkenmerk}\n` +
    `Intrekkingscode: ${intrekkingscode}\n`;

  return {
    rawText,
    fields: {
      activeringscode,
      briefkenmerk,
      intrekkingscode,
      extra: {},
    },
    confidence: 0.5,
  };
}

export async function POST(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const supabase = await createSupabaseServerClient();

  try {
    const documentId = await getIdFromParams(context);
    if (!documentId) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr) return NextResponse.json({ ok: false, error: userErr.message }, { status: 401 });
    if (!userData.user) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });

    // Doc (RLS debe filtrar, pero además verificamos por seguridad)
    const { data: doc, error: docErr } = await supabase
      .from("documents")
      .select("id,user_id,type,file_name")
      .eq("id", documentId)
      .maybeSingle();

    if (docErr) return NextResponse.json({ ok: false, error: docErr.message }, { status: 400 });
    if (!doc) return NextResponse.json({ ok: false, error: "Document not found" }, { status: 404 });

    if (doc.user_id !== userData.user.id) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    if (doc.type !== "machtigingsregistratie") {
      return NextResponse.json({ ok: false, error: "OCR solo está habilitado para machtigingsregistratie" }, { status: 400 });
    }

    const now = new Date().toISOString();

    // Audit: requested
    await supabase.from("document_reviews").insert({
      document_id: documentId,
      user_id: userData.user.id,
      actor_id: userData.user.id,
      actor_role: "user",
      action: "ocr_requested",
      payload: { provider: "mock" },
      created_at: now,
    });

    // Create run = processing
    const { data: runCreated, error: runCreateErr } = await supabase
      .from("document_ocr_runs")
      .insert({
        document_id: documentId,
        user_id: userData.user.id,
        provider: "mock",
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

    // Mock OCR produce fields
    const mocked = mockOcrMachtigingsregistratie(doc.file_name ?? "");
    const validated = validateForSaveMachtigingsregistratieFieldsV1(mocked.fields);
    if (!validated.ok) {
      // Mark run failed
      await supabase.from("document_ocr_runs").update({ status: "failed", error: validated.error, updated_at: now }).eq("id", runCreated.id);
      await supabase.from("document_reviews").insert({
        document_id: documentId,
        user_id: userData.user.id,
        actor_id: userData.user.id,
        actor_role: "user",
        action: "ocr_failed",
        payload: { error: validated.error },
        created_at: now,
      });
      return NextResponse.json({ ok: false, error: validated.error }, { status: 400 });
    }

    // Update run -> succeeded (store raw)
    const { data: run, error: runUpdErr } = await supabase
      .from("document_ocr_runs")
      .update({
        status: "succeeded",
        raw_text: mocked.rawText,
        raw_json: { fields: validated.value, schema_version: MACHTIGINGSREGISTRATIE_SCHEMA_VERSION },
        error: null,
        updated_at: now,
      })
      .eq("id", runCreated.id)
      .select("id,document_id,status,provider,created_at,updated_at")
      .single();

    if (runUpdErr) return NextResponse.json({ ok: false, error: runUpdErr.message }, { status: 400 });

    // Create extraction
    const { data: extraction, error: exErr } = await supabase
      .from("document_extractions")
      .insert({
        document_id: documentId,
        run_id: run.id,
        user_id: userData.user.id,
        extraction_type: "machtigingsregistratie",
        schema_version: MACHTIGINGSREGISTRATIE_SCHEMA_VERSION,
        fields: validated.value,
        needs_review: true,
        confidence: mocked.confidence,
        created_at: now,
        updated_at: now,
      })
      .select("id,document_id,run_id,extraction_type,schema_version,fields,needs_review,confidence,created_at,updated_at")
      .single();

    if (exErr) return NextResponse.json({ ok: false, error: exErr.message }, { status: 400 });

    // Audit: succeeded
    await supabase.from("document_reviews").insert({
      document_id: documentId,
      user_id: userData.user.id,
      actor_id: userData.user.id,
      actor_role: "user",
      action: "ocr_succeeded",
      payload: { runId: run.id, extractionId: extraction.id },
      created_at: now,
    });

    return NextResponse.json({ ok: true, run, extraction });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
