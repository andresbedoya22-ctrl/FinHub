import { NextResponse } from "next/server";
import { supabaseRouteClient } from "@/lib/supabase/routeClient";
import { createCase, createCaseTask } from "@/features/cases/casesService";
import {
  buildToeslagenCaseTitle,
  buildToeslagenTaskTitles,
  parseToeslagenContractStartInput,
} from "@/features/toeslagen/contractStart";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const supabase = await supabaseRouteClient();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const raw = (await req.json().catch(() => null)) as unknown;

  try {
    const input = parseToeslagenContractStartInput(raw);
    const caseEntity = await createCase(supabase, auth.user.id, {
      type: "toeslagen",
      productSlug: input.selectedSlugs.length === 1 ? input.selectedSlugs[0] : "toeslagen_bundle",
      title: buildToeslagenCaseTitle(input.selectedSlugs),
    });

    const tasks = buildToeslagenTaskTitles(input.selectedSlugs);
    await Promise.all(tasks.map((title) => createCaseTask(supabase, caseEntity.id, { title, status: "open" })));

    // Persist intake and estimate snapshot for operators at the intake step.
    const { error: snapshotError } = await supabase.from("case_step_data").upsert(
      {
        case_id: caseEntity.id,
        // "intake" is currently locked by DB trigger until payment; keep pre-checkout
        // snapshot on an unlocked step.
        step_key: "eligibility",
        data: {
          selectedSlugs: input.selectedSlugs,
          intakeSnapshot: input.intakeSnapshot ?? null,
          estimates: input.estimates ?? [],
          source: "toeslagen_unified_intake_v3",
          createdAt: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "case_id,step_key" }
    );

    if (snapshotError) {
      throw new Error(snapshotError.message);
    }

    return NextResponse.json({ ok: true, caseId: caseEntity.id });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to start contract";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
