import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServerClient";
import { requireOcrKind } from "../_shared/ocrGuard";
import { validateForVerifyMachtigingsregistratieFieldsV1 } from "@/features/documents/machtigingsregistratieSchema";
import { trackProductRoute } from "@/features/observability/productTelemetry";
import { assertValidActiveringscode, markAuthorizationVerifiedFromDocument } from "@/features/authorization";

const __FINHUB_TELEMETRY_ROUTE = "/api/documents/:id/verify";
const __FINHUB_TELEMETRY_PAIR = { success: "product.doc.verify.success", fail: "product.doc.verify.fail" } as const;


export const dynamic = "force-dynamic";

async function getIdFromParams(context: { params: Promise<{ id: string }> }) {
  const p = await context.params;
  return (p?.id ?? "").toString().trim();
}

export async function POST(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const __t0 = Date.now();
  try {
    const documentId = await getIdFromParams(context);
    if (!documentId) return trackProductRoute(__FINHUB_TELEMETRY_PAIR, { route: __FINHUB_TELEMETRY_ROUTE }, __t0, NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 }));

    const supabase = await createSupabaseServerClient();

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr) return trackProductRoute(__FINHUB_TELEMETRY_PAIR, { route: __FINHUB_TELEMETRY_ROUTE }, __t0, NextResponse.json({ ok: false, error: userErr.message }, { status: 401 }));
    if (!userData.user) return trackProductRoute(__FINHUB_TELEMETRY_PAIR, { route: __FINHUB_TELEMETRY_ROUTE }, __t0, NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 }));

    const now = new Date().toISOString();

    // Enforce doc type (defensa en profundidad)
    const g = await requireOcrKind({
      supabase,
      documentId,
      userId: userData.user.id,
      required: "machtigingsregistratie",
      select: "id,user_id,status,ocr_kind",
      endpoint: "verify",
    });
    if (!g.ok) return g.response;
    // Latest extraction
    const { data: exRows, error: exErr } = await supabase
      .from("document_extractions")
      .select("id,fields,needs_review")
      .eq("document_id", documentId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (exErr) return trackProductRoute(__FINHUB_TELEMETRY_PAIR, { route: __FINHUB_TELEMETRY_ROUTE }, __t0, NextResponse.json({ ok: false, error: exErr.message }, { status: 400 }));

    const ex = (exRows ?? [])[0] ?? null;
    if (!ex?.id) return trackProductRoute(__FINHUB_TELEMETRY_PAIR, { route: __FINHUB_TELEMETRY_ROUTE }, __t0, NextResponse.json({ ok: false, error: "No extraction to verify" }, { status: 400 }));

    // Validación estricta (mínimo: activeringscode)
    const validated = validateForVerifyMachtigingsregistratieFieldsV1(ex.fields);
    if (!validated.ok) return trackProductRoute(__FINHUB_TELEMETRY_PAIR, { route: __FINHUB_TELEMETRY_ROUTE }, __t0, NextResponse.json({ ok: false, error: validated.error }, { status: 400 }));

    const extractionId = ex.id as string;
    assertValidActiveringscode(validated.value.activeringscode ?? "");

    const { error: updExErr } = await supabase
      .from("document_extractions")
      .update({ needs_review: false, updated_at: now })
      .eq("id", extractionId);

    if (updExErr) return trackProductRoute(__FINHUB_TELEMETRY_PAIR, { route: __FINHUB_TELEMETRY_ROUTE }, __t0, NextResponse.json({ ok: false, error: updExErr.message }, { status: 400 }));

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

    const updatedCaseIds = await markAuthorizationVerifiedFromDocument(supabase, documentId);

    return trackProductRoute(
      __FINHUB_TELEMETRY_PAIR,
      { route: __FINHUB_TELEMETRY_ROUTE },
      __t0,
      NextResponse.json({ ok: true, extractionId, updatedCaseIds })
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return trackProductRoute(__FINHUB_TELEMETRY_PAIR, { route: __FINHUB_TELEMETRY_ROUTE }, __t0, NextResponse.json({ ok: false, error: msg }, { status: 500 }));
  }
}
