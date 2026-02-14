import { NextResponse } from "next/server";
import { supabaseRouteClient } from "@/lib/supabase/routeClient";
import { getCaseDetail, parseUpdateCaseInput, updateCase } from "@/features/cases/casesService";
import { syncCaseToElementsIfConfigured } from "@/features/integrations/elements";
import { emitLifecycleEvent } from "@/features/lifecycle/lifecycleService";

export const dynamic = "force-dynamic";

function isElementsSyncTrigger(status: string): boolean {
  return status === "ready_for_review" || status === "submitted" || status === "completed";
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseRouteClient();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const detail = await getCaseDetail(supabase, id);
    if (!detail) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(detail);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to load case";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseRouteClient();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const raw = (await req.json().catch(() => null)) as unknown;

  try {
    const input = parseUpdateCaseInput(raw);
    const updated = await updateCase(supabase, id, input);

    // Lifecycle campaigns: case update + pending auth + docs missing.
    try {
      void emitLifecycleEvent({
        userId: auth.user.id,
        caseId: updated.id,
        campaignKey: "case_update",
        eventName: "case.updated",
        payload: { status: updated.status, stepKey: updated.stepKey, type: updated.type },
      });

      if (updated.authorizationStatus !== "verified") {
        void emitLifecycleEvent({
          userId: auth.user.id,
          caseId: updated.id,
          campaignKey: "authorization_pending",
          eventName: "case.authorization_pending",
          payload: { authorizationStatus: updated.authorizationStatus, status: updated.status },
        });
      }

      const openUploadTask = await supabase
        .from("case_tasks")
        .select("id,title")
        .eq("case_id", updated.id)
        .in("status", ["open", "in_progress"])
        .ilike("title", "Upload %")
        .limit(1)
        .maybeSingle();

      if (!openUploadTask.error && openUploadTask.data?.id) {
        void emitLifecycleEvent({
          userId: auth.user.id,
          caseId: updated.id,
          campaignKey: "docs_missing",
          eventName: "case.docs_missing",
          payload: { taskTitle: openUploadTask.data.title },
        });
      }
    } catch {
      // lifecycle must never block case update API
    }

    if (isElementsSyncTrigger(updated.status)) {
      try {
        await syncCaseToElementsIfConfigured(updated.id);
      } catch (syncError) {
        const message = syncError instanceof Error ? syncError.message : "Elements sync failed";
        console.error(`[elements-sync] case=${updated.id} ${message}`);
      }
    }

    return NextResponse.json(updated);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to update case";
    const status = msg.toLowerCase().includes("required") ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
