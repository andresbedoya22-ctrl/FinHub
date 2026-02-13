import { NextResponse } from "next/server";

import { supabaseRouteClient } from "@/lib/supabase/routeClient";
import { createSupabaseAdminClient } from "@/lib/supabaseAdminClient";
import { createCase, getCaseDetail, updateCase } from "@/features/cases/casesService";
import {
  ensureChecklistTasks,
  findLatestActiveCaseByVertical,
  insertProductEventSafe,
  parseTaxesIntakeInput,
  taxesChecklistTasks,
  titleForVertical,
} from "@/features/verticals/server";

export const dynamic = "force-dynamic";

async function loadEligibilityData(caseId: string) {
  const supabase = await supabaseRouteClient();
  const row = await supabase
    .from("case_step_data")
    .select("data")
    .eq("case_id", caseId)
    .eq("step_key", "eligibility")
    .maybeSingle();

  if (row.error) throw new Error(row.error.message);
  return row.data?.data ?? null;
}

export async function GET() {
  const supabase = await supabaseRouteClient();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  try {
    const caseId = await findLatestActiveCaseByVertical(supabase, "taxes", auth.user.id);
    if (!caseId) return NextResponse.json({ ok: true, case: null, intake: null });

    const detail = await getCaseDetail(supabase, caseId);
    const intake = await loadEligibilityData(caseId);
    return NextResponse.json({ ok: true, case: detail, intake });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to load taxes intake";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const supabase = await supabaseRouteClient();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const raw = (await req.json().catch(() => null)) as unknown;

  try {
    const input = parseTaxesIntakeInput(raw);
    const admin = createSupabaseAdminClient();

    let caseId = await findLatestActiveCaseByVertical(supabase, "taxes", auth.user.id);
    if (!caseId) {
      const created = await createCase(supabase, auth.user.id, {
        type: "taxes",
        title: `${titleForVertical("taxes")} ${input.fiscalYear}`,
        productSlug: "taxes_pro_v1",
      });
      caseId = created.id;
    }

    const saveStep = await supabase.from("case_step_data").upsert(
      {
        case_id: caseId,
        step_key: "eligibility",
        data: {
          kind: "taxes_intake_v1",
          ...input,
        },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "case_id,step_key" }
    );
    if (saveStep.error) throw new Error(saveStep.error.message);

    await ensureChecklistTasks(supabase, caseId, taxesChecklistTasks(input));
    await updateCase(supabase, caseId, { status: "in_progress", stepKey: "eligibility" });

    await insertProductEventSafe(admin, {
      userId: auth.user.id,
      caseId,
      eventName: "taxes.intake.submit",
      data: { fiscalYear: input.fiscalYear },
    });

    const detail = await getCaseDetail(supabase, caseId);
    return NextResponse.json({ ok: true, case: detail });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to save taxes intake";
    const status = msg.toLowerCase().includes("invalid") ? 400 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
