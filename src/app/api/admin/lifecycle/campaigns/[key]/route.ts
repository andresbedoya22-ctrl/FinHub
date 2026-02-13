import { NextResponse } from "next/server";

import { requireAdmin } from "@/app/api/admin/_lib/requireAdmin";
import { createSupabaseAdminClient } from "@/lib/supabaseAdminClient";

export const dynamic = "force-dynamic";

const VALID_KEYS = new Set(["welcome", "docs_missing", "authorization_pending", "case_update"]);

export async function PATCH(req: Request, { params }: { params: Promise<{ key: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const { key } = await params;
  if (!VALID_KEYS.has(key)) return NextResponse.json({ ok: false, error: "Invalid campaign key" }, { status: 400 });

  const body = (await req.json().catch(() => null)) as { enabled?: unknown; throttleMinutes?: unknown } | null;
  if (!body || typeof body.enabled !== "boolean") {
    return NextResponse.json({ ok: false, error: "enabled is required" }, { status: 400 });
  }

  const throttleRaw = Number(body.throttleMinutes);
  const throttleMinutes = Number.isFinite(throttleRaw) ? Math.max(0, Math.min(60 * 24 * 30, Math.floor(throttleRaw))) : null;
  if (throttleMinutes === null) {
    return NextResponse.json({ ok: false, error: "throttleMinutes is required" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const update = await admin
    .from("lifecycle_campaigns")
    .update({
      enabled: body.enabled,
      throttle_minutes: throttleMinutes,
      updated_at: new Date().toISOString(),
    })
    .eq("key", key)
    .select("key,name,enabled,throttle_minutes,channel,updated_at")
    .single();

  if (update.error || !update.data) {
    return NextResponse.json({ ok: false, error: update.error?.message ?? "Failed to update campaign" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, campaign: update.data });
}
