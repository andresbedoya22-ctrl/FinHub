import { NextResponse } from "next/server";
import { supabaseRouteClient } from "@/lib/supabase/routeClient";
import { createCaseTask, parseCreateTaskInput } from "@/features/cases/casesService";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await supabaseRouteClient();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const raw = (await req.json().catch(() => null)) as unknown;

  try {
    const input = parseCreateTaskInput(raw);
    const task = await createCaseTask(supabase, id, input);
    return NextResponse.json(task);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to create task";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
