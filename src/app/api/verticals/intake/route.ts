import { NextResponse } from "next/server";

import { supabaseRouteClient } from "@/lib/supabase/routeClient";
import { createSupabaseAdminClient } from "@/lib/supabaseAdminClient";
import { createCase, updateCase } from "@/features/cases/casesService";
import {
  ensureChecklistTasks,
  findLatestActiveCaseByVertical,
  insertProductEventSafe,
  isLeadgenVertical,
  leadgenChecklistTasks,
  LEADGEN_PRODUCT_SLUG,
  parseLeadgenSubmitInput,
  titleForVertical,
  upsertCaseExternalRefSafe,
} from "@/features/verticals/server";

export const dynamic = "force-dynamic";

type Action = "start" | "submit" | "abandon";

function parseAction(input: unknown): Action {
  const action = String(input ?? "").trim();
  if (action === "start" || action === "submit" || action === "abandon") return action;
  throw new Error("Invalid action");
}

function parseVertical(input: unknown) {
  const vertical = String(input ?? "").trim();
  if (!isLeadgenVertical(vertical)) throw new Error("Invalid vertical");
  return vertical;
}

export async function POST(req: Request) {
  const supabase = await supabaseRouteClient();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const raw = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!raw) return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });

  try {
    const action = parseAction(raw.action);
    const vertical = parseVertical(raw.vertical);
    const admin = createSupabaseAdminClient();

    let caseId = await findLatestActiveCaseByVertical(supabase, vertical, auth.user.id);
    if (!caseId && action !== "abandon") {
      const created = await createCase(supabase, auth.user.id, {
        type: vertical,
        title: titleForVertical(vertical),
        productSlug: LEADGEN_PRODUCT_SLUG[vertical],
      });
      caseId = created.id;
    }

    if (action === "start") {
      if (!caseId) throw new Error("Failed to start intake");
      await updateCase(supabase, caseId, { status: "in_progress", stepKey: "eligibility" });
      await insertProductEventSafe(admin, {
        userId: auth.user.id,
        caseId,
        eventName: "leadgen.intake.start",
        data: { vertical },
      });
      return NextResponse.json({ ok: true, caseId });
    }

    if (action === "submit") {
      if (!caseId) throw new Error("Failed to create case");
      const intake = parseLeadgenSubmitInput(raw.payload);

      const saveStep = await supabase.from("case_step_data").upsert(
        {
          case_id: caseId,
          step_key: "eligibility",
          data: {
            kind: "leadgen_intake_v1",
            vertical,
            ...intake,
          },
          updated_at: new Date().toISOString(),
        },
        { onConflict: "case_id,step_key" }
      );
      if (saveStep.error) throw new Error(saveStep.error.message);

      await ensureChecklistTasks(supabase, caseId, leadgenChecklistTasks(vertical));
      await updateCase(supabase, caseId, { status: "waiting_user", stepKey: "eligibility" });

      await insertProductEventSafe(admin, {
        userId: auth.user.id,
        caseId,
        eventName: "leadgen.intake.submit",
        data: { vertical },
      });
      await upsertCaseExternalRefSafe(admin, { caseId, vertical });

      return NextResponse.json({ ok: true, caseId });
    }

    // abandon
    if (caseId) {
      await updateCase(supabase, caseId, { status: "cancelled", stepKey: "eligibility" });
    }

    await insertProductEventSafe(admin, {
      userId: auth.user.id,
      caseId: caseId ?? null,
      eventName: "leadgen.intake.abandon",
      data: { vertical },
    });

    return NextResponse.json({ ok: true, caseId: caseId ?? null });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Vertical intake failed";
    const status = msg.toLowerCase().includes("invalid") || msg.toLowerCase().includes("required") ? 400 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
