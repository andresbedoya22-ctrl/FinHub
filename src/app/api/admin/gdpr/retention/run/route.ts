import { NextResponse } from "next/server";

import { requireAdmin } from "@/app/api/admin/_lib/requireAdmin";
import { createSupabaseAdminClient } from "@/lib/supabaseAdminClient";

export const dynamic = "force-dynamic";

type PolicyRow = {
  tenant_id: string;
  enabled: boolean;
  retention_days: number;
  delete_grace_days: number;
};

export async function POST() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  try {
    const admin = createSupabaseAdminClient();
    const now = Date.now();
    const policiesQ = await admin
      .from("gdpr_retention_policies")
      .select("tenant_id,enabled,retention_days,delete_grace_days");

    if (policiesQ.error) throw new Error(policiesQ.error.message);
    const policies = (policiesQ.data ?? []) as PolicyRow[];

    let deletedEvents = 0;
    let deletedDeliveries = 0;
    let hardDeletedUsers = 0;

    for (const p of policies) {
      if (!p.enabled) continue;
      const retentionCutoff = new Date(now - p.retention_days * 24 * 60 * 60 * 1000).toISOString();
      const deleteCutoff = new Date(now - p.delete_grace_days * 24 * 60 * 60 * 1000).toISOString();

      const deliveriesDel = await admin
        .from("lifecycle_deliveries")
        .delete()
        .eq("tenant_id", p.tenant_id)
        .lt("created_at", retentionCutoff)
        .select("id");
      if (!deliveriesDel.error) deletedDeliveries += deliveriesDel.data?.length ?? 0;

      const eventsDel = await admin
        .from("product_events")
        .delete()
        .eq("tenant_id", p.tenant_id)
        .lt("created_at", retentionCutoff)
        .select("id");
      if (!eventsDel.error) deletedEvents += eventsDel.data?.length ?? 0;

      const oldDeletedUsers = await admin
        .from("profiles")
        .select("id")
        .lt("deleted_at", deleteCutoff)
        .limit(500);

      if (!oldDeletedUsers.error) {
        for (const u of oldDeletedUsers.data ?? []) {
          const userId = String((u as { id: string }).id);
          const byTenant = await admin
            .from("tenant_members")
            .select("id")
            .eq("tenant_id", p.tenant_id)
            .eq("user_id", userId)
            .limit(1)
            .maybeSingle();
          if (byTenant.error || !byTenant.data) continue;
          await admin.from("documents").delete().eq("user_id", userId);
          await admin.from("cases").delete().eq("user_id", userId);
          hardDeletedUsers += 1;
        }
      }
    }

    return NextResponse.json({
      ok: true,
      summary: {
        policies: policies.length,
        deletedDeliveries,
        deletedEvents,
        hardDeletedUsers,
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Retention run failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
