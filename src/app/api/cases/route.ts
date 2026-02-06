import { NextResponse } from "next/server";
import { supabaseRouteClient } from "@/lib/supabase/routeClient";
import { createCase, listCases, parseCreateCaseInput } from "@/features/cases/casesService";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await supabaseRouteClient();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const rows = await listCases(supabase);
    return NextResponse.json(rows);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to list cases";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const supabase = await supabaseRouteClient();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const raw = (await req.json().catch(() => null)) as unknown;

  try {
    const input = parseCreateCaseInput(raw);
    const created = await createCase(supabase, auth.user.id, input);
    return NextResponse.json(created);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to create case";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
