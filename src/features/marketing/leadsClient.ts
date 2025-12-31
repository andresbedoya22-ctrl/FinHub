import type { MarketingLeadInput, MarketingLeadResult } from "./leadsTypes";

export async function submitMarketingLead(input: MarketingLeadInput): Promise<MarketingLeadResult> {
  const res = await fetch("/api/marketing/leads", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });

  const json = (await res.json().catch(() => null)) as unknown;

  if (!res.ok || !json || typeof json !== "object") {
    return { ok: false, error: "Request failed", code: "server" };
  }

  const anyJson = json as { ok?: unknown; id?: unknown; error?: unknown; code?: unknown };
  if (anyJson.ok === true && typeof anyJson.id === "string") return { ok: true, id: anyJson.id };

  return {
    ok: false,
    error: typeof anyJson.error === "string" ? anyJson.error : "Unknown error",
    code: anyJson.code === "validation" ? "validation" : "server",
  };
}
