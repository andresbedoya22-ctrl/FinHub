export type LifecycleCampaign = {
  key: "welcome" | "docs_missing" | "authorization_pending" | "case_update";
  name: string;
  enabled: boolean;
  throttle_minutes: number;
  channel: "in_app" | "email";
  updated_at: string;
};

export type LifecycleMetrics = {
  windowDays: number;
  sent: number;
  throttled: number;
  disabled: number;
  activeUsers30: number;
  byCampaign: Record<string, { sent: number; throttled: number; disabled: number }>;
};

export async function getAdminLifecycle() {
  const res = await fetch("/api/admin/lifecycle", { method: "GET" });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as { ok: true; campaigns: LifecycleCampaign[]; metrics: LifecycleMetrics };
}

export async function updateLifecycleCampaign(
  key: LifecycleCampaign["key"],
  input: { enabled: boolean; throttleMinutes: number }
) {
  const res = await fetch(`/api/admin/lifecycle/campaigns/${encodeURIComponent(key)}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as { ok: true; campaign: LifecycleCampaign };
}
