import { AppLang } from "@/features/i18n/lang";

export type FinnyChatMode = "faq" | "llm";
export type FinnyTier = "lite" | "premium";

export type ApiOk = {
  ok: true;
  mode: FinnyChatMode;
  answer: string;
  lang?: string;
  tier?: FinnyTier;
};

export type ApiErr = {
  ok: false;
  error: string;
  code?: string;
  tier?: FinnyTier;
};

export type ApiResp = ApiOk | ApiErr;

export async function finnyChat(message: string, lang: AppLang): Promise<ApiResp> {
  const res = await fetch("/api/assistant/chat", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-finhub-lang": lang,
    },
    body: JSON.stringify({ message, lang }),
  });

  const json = (await res.json().catch(() => null)) as unknown;

  if (!res.ok || !json || typeof json !== "object") {
    return { ok: false, error: "No pude procesar tu mensaje." };
  }

  const r = json as Record<string, unknown>;
  if (r.ok === true) {
    const tierRaw = (r.tier ?? "").toString();
    return {
      ok: true,
      mode: (r.mode === "faq" ? "faq" : "llm") as FinnyChatMode,
      answer: (r.answer ?? "").toString(),
      lang: (r.lang ?? "").toString(),
      tier: tierRaw === "premium" ? "premium" : tierRaw === "lite" ? "lite" : undefined,
    };
  }

  const e = r.error;
  const code = typeof r.code === "string" ? r.code : undefined;
  const tierRaw = (r.tier ?? "").toString();
  return {
    ok: false,
    error: typeof e === "string" ? e : "No pude procesar tu mensaje.",
    code,
    tier: tierRaw === "premium" ? "premium" : tierRaw === "lite" ? "lite" : undefined,
  };
}
