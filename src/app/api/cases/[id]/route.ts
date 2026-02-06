import { NextResponse } from "next/server";
import { supabaseRouteClient } from "@/lib/supabase/routeClient";
import { getCaseDetail } from "@/features/cases/casesService";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
