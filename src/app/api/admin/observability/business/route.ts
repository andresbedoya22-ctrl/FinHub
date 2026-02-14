import { NextResponse } from "next/server";

import { requireAdmin } from "@/app/api/admin/_lib/requireAdmin";
import { createSupabaseAdminClient } from "@/lib/supabaseAdminClient";
import { loadBusinessMetrics } from "@/features/observability/businessMetricsService";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  try {
    const sinceIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const admin = createSupabaseAdminClient();
    const data = await loadBusinessMetrics(admin, sinceIso);
    return NextResponse.json({
      ok: true,
      sinceIso,
      ...data,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to load business metrics";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
