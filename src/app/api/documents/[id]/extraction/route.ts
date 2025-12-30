import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServerClient";
import { requireOcrKind } from "../_shared/ocrGuard";
import { getLlmProvider } from "@/features/ai/llm/getLlmProvider";
import { getExtractionSpec } from "@/features/documents/document-schemas/registry";
import {
  MACHTIGINGSREGISTRATIE_SCHEMA_VERSION,
  validateForSaveMachtigingsregistratieFieldsV1,
} from "@/features/documents/machtigingsregistratieSchema";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function getIdFromParams(context: { params: Promise<{ id: string }> }) {
  const p = await context.params;
  return (p?.id ?? "").toString().trim();
}

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const documentId = await getIdFromParams(context);
    if (!documentId) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });

    const supabase = await createSupabaseServerClient();

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr) return NextResponse.json({ ok: false, error: userErr.message }, { status: 401 });
    if (!userData.user) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });

    const { data, error } = await supabase
      .from("document_extractions")
      .select("id,document_id,run_id,extraction_type,schema_version,fields,needs_review,confidence,created_at,updated_at")
      .eq("document_id", documentId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

    return NextResponse.json({ ok: true, extraction: (data ?? [])[0] ?? null });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

/**
 * POST: Ejecuta extracción IA desde el último OCR run (raw_text) y crea un nuevo document_extractions.
 * Nota: hoy solo soporta ocr_kind=machtigingsregistratie (Fase 7.E v1).
 */
export async function POST(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const supabase = await createSupabaseServerClient();
  const llm = getLlmProvider();

  try {
    const documentId = await getIdFromParams(context);
    if (!documentId) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr) return NextResponse.json({ ok: false, error: userErr.message }, { status: 401 });
    if (!userData.user) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });

    const now = new Date().toISOString();

    // Enforce doc type / ocr_kind (defensa en profundidad)
    const g = await requireOcrKind({
      supabase,
      documentId,
      userId: userData.user.id,
      required: "machtigingsregistratie",
      select: "id,user_id,ocr_kind",
      endpoint: "extraction",
    });
    if (!g.ok) return g.response;

    const spec = getExtractionSpec("machtigingsregistratie");

    await supabase.from("document_reviews").insert({
      document_id: documentId,
      user_id: userData.user.id,
      actor_id: userData.user.id,
      actor_role: "user",
      action: "extraction_requested",
      payload: { provider: llm.name, extraction_type: spec.extractionType, schema_version: spec.schemaVersion },
      created_at: now,
    });

    // Tomar último OCR run exitoso
    const { data: runRows, error: runErr } = await supabase
      .from("document_ocr_runs")
      .select("id,status,raw_text,provider,created_at")
      .eq("document_id", documentId)
      .eq("status", "succeeded")
      .order("created_at", { ascending: false })
      .limit(1);

    if (runErr) return NextResponse.json({ ok: false, error: runErr.message }, { status: 400 });

    const run = (runRows ?? [])[0] ?? null;
    const rawText = (run?.raw_text ?? "").toString();
    if (!run?.id || !rawText.trim()) {
      const err = "No successful OCR run (raw_text) to extract from";
      await supabase.from("document_reviews").insert({
        document_id: documentId,
        user_id: userData.user.id,
        actor_id: userData.user.id,
        actor_role: "user",
        action: "extraction_failed",
        payload: { error: err },
        created_at: now,
      });
      return NextResponse.json({ ok: false, error: err }, { status: 400 });
    }

    const input = [
      "TEXTO OCR (fuente):",
      rawText,
    ].join("\n\n");

    const result = await llm.extractJson({
      instructions: spec.instructions,
      input,
      schemaName: spec.schemaName,
      jsonSchema: spec.jsonSchema,
    });

    if (!result.ok) {
      await supabase.from("document_reviews").insert({
        document_id: documentId,
        user_id: userData.user.id,
        actor_id: userData.user.id,
        actor_role: "user",
        action: "extraction_failed",
        payload: { error: result.error, provider: llm.name },
        created_at: now,
      });
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    // Validación/normalización con el validador existente
    const validated = spec.validateForSave(result.data);
    if (!validated.ok) {
      await supabase.from("document_reviews").insert({
        document_id: documentId,
        user_id: userData.user.id,
        actor_id: userData.user.id,
        actor_role: "user",
        action: "extraction_failed",
        payload: { error: validated.error, provider: llm.name },
        created_at: now,
      });
      return NextResponse.json({ ok: false, error: validated.error }, { status: 400 });
    }

    const { data: extraction, error: exErr } = await supabase
      .from("document_extractions")
      .insert({
        document_id: documentId,
        run_id: run.id,
        user_id: userData.user.id,
        extraction_type: spec.extractionType,
        schema_version: spec.schemaVersion,
        fields: validated.value as Record<string, unknown>,
        needs_review: true,
        confidence: null,
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
      action: "extraction_succeeded",
      payload: { extractionId: extraction.id, provider: llm.name, schema_version: spec.schemaVersion },
      created_at: now,
    });

    return NextResponse.json({ ok: true, extraction });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

type PatchBody = Partial<{
  fields: Record<string, unknown>;
  needsReview: boolean;
  confidence: number | null;
}>;

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const documentId = await getIdFromParams(context);
    if (!documentId) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });

    const supabase = await createSupabaseServerClient();

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr) return NextResponse.json({ ok: false, error: userErr.message }, { status: 401 });
    if (!userData.user) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });

    let body: PatchBody = {};
    try {
      body = (await req.json()) as PatchBody;
    } catch {
      body = {};
    }

    // Enforce doc type (defensa en profundidad)
    const g = await requireOcrKind({
      supabase,
      documentId,
      userId: userData.user.id,
      required: "machtigingsregistratie",
      select: "id,user_id,ocr_kind",
      endpoint: "extraction",
    });
    if (!g.ok) return g.response;

    // Get latest extraction (create one if missing)
    const { data: existing, error: selErr } = await supabase
      .from("document_extractions")
      .select("id")
      .eq("document_id", documentId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (selErr) return NextResponse.json({ ok: false, error: selErr.message }, { status: 400 });

    const now = new Date().toISOString();
    let extractionId: string | null = (existing ?? [])[0]?.id ?? null;

    let normalizedFields: Record<string, unknown> | undefined = undefined;
    if (typeof body.fields !== "undefined") {
      const validated = validateForSaveMachtigingsregistratieFieldsV1(body.fields);
      if (!validated.ok) return NextResponse.json({ ok: false, error: validated.error }, { status: 400 });
      normalizedFields = validated.value as unknown as Record<string, unknown>;
    }

    if (!extractionId) {
      const { data: created, error: insErr } = await supabase
        .from("document_extractions")
        .insert({
          document_id: documentId,
          run_id: null,
          user_id: userData.user.id,
          extraction_type: "machtigingsregistratie",
          schema_version: MACHTIGINGSREGISTRATIE_SCHEMA_VERSION,
          fields: normalizedFields ?? {},
          needs_review: typeof body.needsReview === "boolean" ? body.needsReview : true,
          confidence: body.confidence === null || typeof body.confidence === "number" ? body.confidence : null,
          created_at: now,
          updated_at: now,
        })
        .select("id")
        .single();

      if (insErr) return NextResponse.json({ ok: false, error: insErr.message }, { status: 400 });
      extractionId = created.id as string;
    } else {
      const update: Record<string, unknown> = { updated_at: now };
      if (typeof normalizedFields !== "undefined") update.fields = normalizedFields;
      if (typeof body.needsReview === "boolean") update.needs_review = body.needsReview;
      if (body.confidence === null || typeof body.confidence === "number") update.confidence = body.confidence;

      const { error: updErr } = await supabase.from("document_extractions").update(update).eq("id", extractionId);
      if (updErr) return NextResponse.json({ ok: false, error: updErr.message }, { status: 400 });
    }

    // Audit: edited
    await supabase.from("document_reviews").insert({
      document_id: documentId,
      user_id: userData.user.id,
      actor_id: userData.user.id,
      actor_role: "user",
      action: "edited",
      payload: { edited: true },
      created_at: now,
    });

    return NextResponse.json({ ok: true, extractionId });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
