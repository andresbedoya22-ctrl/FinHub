import { NextResponse } from "next/server";
import { supabaseRouteClient } from "@/lib/supabase/routeClient";
import { updateCaseDocument } from "@/features/cases/casesService";
import type { CaseDocumentStatus } from "@/features/cases/casesTypes";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; caseDocumentId: string }> }
) {
  const { id, caseDocumentId } = await params;
  const supabase = await supabaseRouteClient();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as
    | { status?: CaseDocumentStatus; validationReason?: string | null; validationMeta?: Record<string, unknown> | null }
    | null;

  try {
    const entry = await updateCaseDocument(supabase, id, caseDocumentId, {
      status: body?.status,
      validationReason: body?.validationReason ?? null,
      validationMeta: body?.validationMeta ?? null,
    });
    return NextResponse.json(entry);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to update document";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
