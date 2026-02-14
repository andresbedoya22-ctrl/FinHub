import { NextResponse } from "next/server";

import { requireAdmin } from "@/app/api/admin/_lib/requireAdmin";

export const dynamic = "force-dynamic";

type CampaignRow = {
  key: string;
  name: string;
  enabled: boolean;
  throttle_minutes: number;
  channel: string;
  updated_at: string;
};

type DeliveryRow = {
  campaign_key: string;
  status: string;
  created_at: string;
  user_id: string;
};

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const campaignsQ = await auth.supabase
    .from("lifecycle_campaigns")
    .select("key,name,enabled,throttle_minutes,channel,updated_at")
    .order("key", { ascending: true });

  if (campaignsQ.error) {
    return NextResponse.json({ ok: false, error: campaignsQ.error.message }, { status: 500 });
  }

  const since7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const deliveriesQ = await auth.supabase
    .from("lifecycle_deliveries")
    .select("campaign_key,status,created_at,user_id")
    .gte("created_at", since30);

  if (deliveriesQ.error) {
    return NextResponse.json({ ok: false, error: deliveriesQ.error.message }, { status: 500 });
  }

  const deliveries = (deliveriesQ.data ?? []) as DeliveryRow[];
  const deliveries7 = deliveries.filter((d) => d.created_at >= since7);
  const sent7 = deliveries7.filter((d) => d.status === "sent_mock").length;
  const throttled7 = deliveries7.filter((d) => d.status === "throttled").length;
  const disabled7 = deliveries7.filter((d) => d.status === "disabled").length;
  const activeUsers30 = new Set(deliveries.map((d) => d.user_id)).size;

  const byCampaign = Object.create(null) as Record<string, { sent: number; throttled: number; disabled: number }>;
  for (const row of deliveries7) {
    if (!byCampaign[row.campaign_key]) {
      byCampaign[row.campaign_key] = { sent: 0, throttled: 0, disabled: 0 };
    }
    const bucket = byCampaign[row.campaign_key];
    if (!bucket) continue;
    if (row.status === "sent_mock") bucket.sent += 1;
    else if (row.status === "throttled") bucket.throttled += 1;
    else if (row.status === "disabled") bucket.disabled += 1;
  }

  return NextResponse.json({
    ok: true,
    campaigns: (campaignsQ.data ?? []) as CampaignRow[],
    metrics: {
      windowDays: 7,
      sent: sent7,
      throttled: throttled7,
      disabled: disabled7,
      activeUsers30,
      byCampaign,
    },
  });
}
