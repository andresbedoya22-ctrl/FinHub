import type { SupabaseClient } from "@supabase/supabase-js";

export type FinnyTier = "lite" | "premium";

export type FinnyUserSettings = {
  tierOverride: FinnyTier | null;
  quietHoursEnabled: boolean;
  quietStartHour: number;
  quietEndHour: number;
  timezone: string;
};

export type FinnyContextSnapshot = {
  latestCaseId: string | null;
  latestCaseType: string | null;
  latestCaseStatus: string | null;
  latestCaseStep: string | null;
  latestAuthorizationStatus: string | null;
  caseCountOpen: number;
  docsUploaded: number;
  docsValidated: number;
  docsRejected: number;
};

function hashFNV1a(input: string): string {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

export function hashUserMessage(input: string): string {
  return hashFNV1a(input.trim().toLowerCase());
}

function hourInTimezone(now: Date, tz: string): number {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      hour12: false,
      timeZone: tz,
    }).formatToParts(now);
    const hourText = parts.find((p) => p.type === "hour")?.value ?? "0";
    const hour = Number(hourText);
    if (Number.isInteger(hour) && hour >= 0 && hour <= 23) return hour;
  } catch {
    // ignore invalid timezone and fallback below
  }
  return now.getUTCHours();
}

export function isWithinQuietHours(now: Date, settings: FinnyUserSettings): boolean {
  if (!settings.quietHoursEnabled) return false;
  const hour = hourInTimezone(now, settings.timezone);
  const start = settings.quietStartHour;
  const end = settings.quietEndHour;
  if (start === end) return true;
  if (start < end) return hour >= start && hour < end;
  return hour >= start || hour < end;
}

function isMissingRelation(error: unknown, relation: string): boolean {
  if (!error || typeof error !== "object") return false;
  const msg = "message" in error ? String((error as { message?: unknown }).message ?? "") : "";
  const code = "code" in error ? String((error as { code?: unknown }).code ?? "") : "";
  const lower = msg.toLowerCase();
  if (lower.includes(`relation "${relation}" does not exist`)) return true;
  if (lower.includes(`table 'public.${relation}'`) && lower.includes("schema cache")) return true;
  if (code.toUpperCase().startsWith("PGRST") && lower.includes(relation) && lower.includes("schema cache")) return true;
  return false;
}

export async function getFinnyUserSettings(supabase: SupabaseClient, userId: string): Promise<FinnyUserSettings> {
  const q = await supabase
    .from("finny_user_settings")
    .select("tier_override,quiet_hours_enabled,quiet_start_hour,quiet_end_hour,timezone")
    .eq("user_id", userId)
    .maybeSingle();

  if (q.error && !isMissingRelation(q.error, "finny_user_settings")) {
    throw new Error(q.error.message);
  }

  const row = q.data as Record<string, unknown> | null;
  return {
    tierOverride: row?.tier_override === "premium" || row?.tier_override === "lite"
      ? (row.tier_override as FinnyTier)
      : null,
    quietHoursEnabled: row?.quiet_hours_enabled === true,
    quietStartHour: Number.isInteger(row?.quiet_start_hour) ? Number(row?.quiet_start_hour) : 22,
    quietEndHour: Number.isInteger(row?.quiet_end_hour) ? Number(row?.quiet_end_hour) : 7,
    timezone: typeof row?.timezone === "string" && row.timezone.trim() ? row.timezone : "Europe/Amsterdam",
  };
}

export async function resolveFinnyTier(supabase: SupabaseClient, userId: string): Promise<FinnyTier> {
  const settings = await getFinnyUserSettings(supabase, userId);
  if (settings.tierOverride) return settings.tierOverride;

  // Premium heuristic:
  // - has at least one paid payment OR at least one non-cancelled case in advanced verticals.
  const paid = await supabase
    .from("payments")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "paid")
    .limit(1)
    .maybeSingle();
  if (!paid.error && paid.data?.id) return "premium";

  const advanced = await supabase
    .from("cases")
    .select("id")
    .eq("user_id", userId)
    .in("type", ["taxes", "mortgage", "credit", "insurance"])
    .in("status", ["created", "in_progress", "waiting_user", "ready_for_review", "submitted", "under_review", "completed"])
    .limit(1)
    .maybeSingle();
  if (!advanced.error && advanced.data?.id) return "premium";

  return "lite";
}

export async function getFinnyContextSnapshot(supabase: SupabaseClient, userId: string): Promise<FinnyContextSnapshot> {
  const latestCaseQ = await supabase
    .from("cases")
    .select("id,type,status,step_key,authorization_status")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestCaseQ.error) throw new Error(latestCaseQ.error.message);

  const caseCountQ = await supabase
    .from("cases")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .in("status", ["created", "in_progress", "waiting_user", "ready_for_review", "submitted", "under_review"]);
  if (caseCountQ.error) throw new Error(caseCountQ.error.message);

  const docsQ = await supabase
    .from("documents")
    .select("id,status")
    .eq("user_id", userId)
    .limit(500);
  if (docsQ.error) throw new Error(docsQ.error.message);

  const docs = (docsQ.data ?? []) as Array<{ status?: string | null }>;
  const docsUploaded = docs.length;
  const docsValidated = docs.filter((d) => String(d.status ?? "").toLowerCase() === "approved").length;
  const docsRejected = docs.filter((d) => String(d.status ?? "").toLowerCase() === "rejected").length;

  return {
    latestCaseId: latestCaseQ.data?.id ?? null,
    latestCaseType: latestCaseQ.data?.type ?? null,
    latestCaseStatus: latestCaseQ.data?.status ?? null,
    latestCaseStep: latestCaseQ.data?.step_key ?? null,
    latestAuthorizationStatus: latestCaseQ.data?.authorization_status ?? null,
    caseCountOpen: caseCountQ.count ?? 0,
    docsUploaded,
    docsValidated,
    docsRejected,
  };
}

export function buildFinnyContextForPrompt(ctx: FinnyContextSnapshot): string {
  const lines = [
    "User context snapshot (internal):",
    `- open_cases: ${ctx.caseCountOpen}`,
    `- latest_case_id: ${ctx.latestCaseId ?? "none"}`,
    `- latest_case_type: ${ctx.latestCaseType ?? "none"}`,
    `- latest_case_status: ${ctx.latestCaseStatus ?? "none"}`,
    `- latest_case_step: ${ctx.latestCaseStep ?? "none"}`,
    `- latest_authorization_status: ${ctx.latestAuthorizationStatus ?? "none"}`,
    `- docs_uploaded: ${ctx.docsUploaded}`,
    `- docs_validated: ${ctx.docsValidated}`,
    `- docs_rejected: ${ctx.docsRejected}`,
    "Use this only to personalize navigation guidance; never reveal raw internal data unless user asks.",
  ];
  return lines.join("\n");
}

export async function readRecentFinnyEvents(
  supabase: SupabaseClient,
  userId: string,
  sinceIso: string
): Promise<Array<{ input_hash: string; created_at: string; mode: string; blocked_reason: string | null }>> {
  const q = await supabase
    .from("finny_chat_events")
    .select("input_hash,created_at,mode,blocked_reason")
    .eq("user_id", userId)
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: false })
    .limit(200);

  if (q.error && isMissingRelation(q.error, "finny_chat_events")) return [];
  if (q.error) throw new Error(q.error.message);
  return (q.data ?? []) as Array<{ input_hash: string; created_at: string; mode: string; blocked_reason: string | null }>;
}

export async function recordFinnyChatEvent(
  supabase: SupabaseClient,
  input: {
    userId: string;
    caseId?: string | null;
    tier: FinnyTier;
    mode: "faq" | "llm" | "blocked" | "error";
    blockedReason?: "rate_limit" | "repeat_spam" | "quiet_hours" | null;
    messageHash: string;
    inputLength: number;
    outputLength?: number;
    estimatedTokens?: number;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  const ins = await supabase.from("finny_chat_events").insert({
    user_id: input.userId,
    case_id: input.caseId ?? null,
    tier: input.tier,
    mode: input.mode,
    blocked_reason: input.blockedReason ?? null,
    input_hash: input.messageHash,
    input_length: input.inputLength,
    output_length: input.outputLength ?? 0,
    estimated_tokens: input.estimatedTokens ?? 0,
    metadata: input.metadata ?? {},
  });
  if (ins.error && !isMissingRelation(ins.error, "finny_chat_events")) {
    throw new Error(ins.error.message);
  }
}

export function exceedsFinnyRateLimit(
  tier: FinnyTier,
  recentEvents: Array<{ mode: string; blocked_reason: string | null }>
): boolean {
  const limit = tier === "premium" ? 25 : 10;
  const meaningful = recentEvents.filter((e) => e.mode === "faq" || e.mode === "llm").length;
  return meaningful >= limit;
}

export function isRepeatSpam(messageHash: string, recentEvents: Array<{ input_hash: string }>): boolean {
  const same = recentEvents.filter((e) => e.input_hash === messageHash).length;
  return same >= 3;
}
