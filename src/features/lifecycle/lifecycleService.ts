import { createSupabaseAdminClient } from "@/lib/supabaseAdminClient";

export type LifecycleCampaignKey = "welcome" | "docs_missing" | "authorization_pending" | "case_update";

export type EmitLifecycleInput = {
  userId: string;
  caseId?: string | null;
  campaignKey: LifecycleCampaignKey;
  eventName: string;
  payload?: Record<string, unknown>;
};

type CampaignRow = {
  key: string;
  enabled: boolean;
  throttle_minutes: number;
  channel: "in_app" | "email";
};

type EmitResult =
  | { ok: true; outcome: "sent_mock" | "skipped_disabled" | "skipped_throttled" | "schema_missing"; eventId?: string }
  | { ok: false; error: string };

function isMissingLifecycleSchema(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const message = "message" in error ? String((error as { message?: unknown }).message ?? "") : "";
  const code = "code" in error ? String((error as { code?: unknown }).code ?? "") : "";
  const lower = message.toLowerCase();
  if (lower.includes("schema cache") && lower.includes("lifecycle_")) return true;
  if (lower.includes("relation") && lower.includes("lifecycle_") && lower.includes("does not exist")) return true;
  if (code.toUpperCase().startsWith("PGRST") && lower.includes("lifecycle_")) return true;
  return false;
}

function nowIso() {
  return new Date().toISOString();
}

export async function emitLifecycleEvent(input: EmitLifecycleInput): Promise<EmitResult> {
  const admin = createSupabaseAdminClient();
  const now = nowIso();

  const campaignRes = await admin
    .from("lifecycle_campaigns")
    .select("key,enabled,throttle_minutes,channel")
    .eq("key", input.campaignKey)
    .maybeSingle();

  if (campaignRes.error) {
    if (isMissingLifecycleSchema(campaignRes.error)) return { ok: true, outcome: "schema_missing" };
    return { ok: false, error: campaignRes.error.message };
  }

  const campaign = campaignRes.data as CampaignRow | null;
  if (!campaign) return { ok: false, error: `Campaign not found: ${input.campaignKey}` };

  const eventInsert = await admin
    .from("lifecycle_events")
    .insert({
      user_id: input.userId,
      case_id: input.caseId ?? null,
      campaign_key: input.campaignKey,
      event_name: input.eventName,
      payload: input.payload ?? {},
      status: "accepted",
      emitted_at: now,
      updated_at: now,
    })
    .select("id")
    .single();

  if (eventInsert.error || !eventInsert.data) {
    if (eventInsert.error && isMissingLifecycleSchema(eventInsert.error)) return { ok: true, outcome: "schema_missing" };
    return { ok: false, error: eventInsert.error?.message ?? "Failed to insert lifecycle event" };
  }

  const eventId = String(eventInsert.data.id);

  if (!campaign.enabled) {
    await admin.from("lifecycle_events").update({ status: "skipped_disabled", updated_at: now }).eq("id", eventId);
    await admin.from("lifecycle_deliveries").insert({
      event_id: eventId,
      user_id: input.userId,
      case_id: input.caseId ?? null,
      campaign_key: input.campaignKey,
      channel: campaign.channel,
      status: "disabled",
      reason: "campaign_disabled",
      payload: input.payload ?? {},
      updated_at: now,
    });
    return { ok: true, outcome: "skipped_disabled", eventId };
  }

  const throttleMinutes = Math.max(0, Number(campaign.throttle_minutes || 0));
  if (throttleMinutes > 0) {
    const cutoff = new Date(Date.now() - throttleMinutes * 60 * 1000).toISOString();
    const last = await admin
      .from("lifecycle_deliveries")
      .select("id")
      .eq("user_id", input.userId)
      .eq("campaign_key", input.campaignKey)
      .eq("status", "sent_mock")
      .gte("created_at", cutoff)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (last.error && !isMissingLifecycleSchema(last.error)) {
      return { ok: false, error: last.error.message };
    }

    if (last.data?.id) {
      await admin.from("lifecycle_events").update({ status: "skipped_throttled", updated_at: now }).eq("id", eventId);
      await admin.from("lifecycle_deliveries").insert({
        event_id: eventId,
        user_id: input.userId,
        case_id: input.caseId ?? null,
        campaign_key: input.campaignKey,
        channel: campaign.channel,
        status: "throttled",
        reason: `throttle_${throttleMinutes}m`,
        payload: input.payload ?? {},
        updated_at: now,
      });
      return { ok: true, outcome: "skipped_throttled", eventId };
    }
  }

  const delivery = await admin.from("lifecycle_deliveries").insert({
    event_id: eventId,
    user_id: input.userId,
    case_id: input.caseId ?? null,
    campaign_key: input.campaignKey,
    channel: campaign.channel,
    status: "sent_mock",
    reason: "mock_dispatch",
    payload: input.payload ?? {},
    delivered_at: now,
    updated_at: now,
  });

  if (delivery.error) {
    if (isMissingLifecycleSchema(delivery.error)) return { ok: true, outcome: "schema_missing" };
    await admin
      .from("lifecycle_events")
      .update({ status: "error", error: delivery.error.message, updated_at: now })
      .eq("id", eventId);
    return { ok: false, error: delivery.error.message };
  }

  await admin.from("lifecycle_events").update({ status: "sent_mock", updated_at: now }).eq("id", eventId);
  return { ok: true, outcome: "sent_mock", eventId };
}
