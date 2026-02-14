import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { matchFinnyFaq } from "@/features/assistant/finny/faqRegistry";
import { buildFinnySystemPrompt } from "@/features/assistant/finny/finnyPrompt";
import {
  buildFinnyContextForPrompt,
  exceedsFinnyRateLimit,
  getFinnyContextSnapshot,
  getFinnyUserSettings,
  hashUserMessage,
  isRepeatSpam,
  isWithinQuietHours,
  readRecentFinnyEvents,
  recordFinnyChatEvent,
  resolveFinnyTier,
} from "@/features/assistant/finny/guardrails";
import { normalizeLang, pickLangForText, type AppLang } from "@/features/i18n/lang";
import { trackProductRoute } from "@/features/observability/productTelemetry";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Body = { message?: string; lang?: string };

const __FINHUB_TELEMETRY_ROUTE = "/api/assistant/chat";
const __FINHUB_TELEMETRY_PAIR = { success: "product.assistant.chat.success", fail: "product.assistant.chat.fail" } as const;

function bad(msg: string, status = 400, t0?: number) {
  const res = NextResponse.json({ ok: false as const, error: msg }, { status });
  return typeof t0 === "number"
    ? trackProductRoute(__FINHUB_TELEMETRY_PAIR, { route: __FINHUB_TELEMETRY_ROUTE }, t0, res)
    : res;
}

function clampMessage(s: string) {
  const t = (s ?? "").toString().trim();
  return t.length > 1200 ? t.slice(0, 1200) : t;
}

function assistantError(lang: "es" | "en") {
  return lang === "es"
    ? "No pude generar una respuesta útil. Intenta reformular tu pregunta."
    : "I couldn't generate a useful answer. Please rephrase your question.";
}

export async function POST(req: NextRequest) {
  const __t0 = Date.now();
  const body = (await req.json().catch(() => null)) as Body | null;

  const message = clampMessage(body?.message ?? "");
  if (message.length < 2) return bad("message requerido", 400, __t0);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return bad("Supabase env missing (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)", 500);
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // noop
        }
      },
    },
  });

  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr) return bad(authErr.message, 401);
  if (!user) return bad("No autorizado", 401);

  const headerLang = req.headers.get("accept-language") ?? "";
  const rawLang = (body?.lang ?? headerLang).toString();
  const appLang: AppLang = normalizeLang(rawLang, "es");
  const textLang = pickLangForText(appLang); // es/en
  const messageHash = hashUserMessage(message);

  const tier = await resolveFinnyTier(supabase, user.id);
  const settings = await getFinnyUserSettings(supabase, user.id);

  // Quiet hours guardrail (only for lite by default to reduce friction on premium).
  if (tier === "lite" && isWithinQuietHours(new Date(), settings)) {
    await recordFinnyChatEvent(supabase, {
      userId: user.id,
      tier,
      mode: "blocked",
      blockedReason: "quiet_hours",
      messageHash,
      inputLength: message.length,
      metadata: { route: __FINHUB_TELEMETRY_ROUTE, timezone: settings.timezone },
    });
    const msg = textLang === "es"
      ? "Finny Lite está en quiet hours. Intenta nuevamente más tarde o desactívalo en settings."
      : "Finny Lite is in quiet hours. Please try later or disable it in settings.";
    return trackProductRoute(__FINHUB_TELEMETRY_PAIR, { route: __FINHUB_TELEMETRY_ROUTE }, __t0, NextResponse.json(
      { ok: false as const, error: msg, code: "quiet_hours", tier },
      { status: 429 }
    ));
  }

  const recent1m = await readRecentFinnyEvents(supabase, user.id, new Date(Date.now() - 60_000).toISOString());
  if (exceedsFinnyRateLimit(tier, recent1m)) {
    await recordFinnyChatEvent(supabase, {
      userId: user.id,
      tier,
      mode: "blocked",
      blockedReason: "rate_limit",
      messageHash,
      inputLength: message.length,
      metadata: { route: __FINHUB_TELEMETRY_ROUTE },
    });
    const msg = textLang === "es" ? "Rate limit de Finny excedido. Intenta en 1 minuto." : "Finny rate limit exceeded. Try again in 1 minute.";
    return trackProductRoute(__FINHUB_TELEMETRY_PAIR, { route: __FINHUB_TELEMETRY_ROUTE }, __t0, NextResponse.json(
      { ok: false as const, error: msg, code: "rate_limit", tier },
      { status: 429, headers: { "Retry-After": "60" } }
    ));
  }

  const recent2m = await readRecentFinnyEvents(supabase, user.id, new Date(Date.now() - 120_000).toISOString());
  if (isRepeatSpam(messageHash, recent2m)) {
    await recordFinnyChatEvent(supabase, {
      userId: user.id,
      tier,
      mode: "blocked",
      blockedReason: "repeat_spam",
      messageHash,
      inputLength: message.length,
      metadata: { route: __FINHUB_TELEMETRY_ROUTE },
    });
    const msg = textLang === "es"
      ? "Detectamos mensajes repetidos. Reformula tu pregunta para continuar."
      : "We detected repeated messages. Please rephrase your question.";
    return trackProductRoute(__FINHUB_TELEMETRY_PAIR, { route: __FINHUB_TELEMETRY_ROUTE }, __t0, NextResponse.json(
      { ok: false as const, error: msg, code: "repeat_spam", tier },
      { status: 429 }
    ));
  }

  const faq = matchFinnyFaq(message, textLang);
  if (faq) {
    await recordFinnyChatEvent(supabase, {
      userId: user.id,
      tier,
      mode: "faq",
      messageHash,
      inputLength: message.length,
      outputLength: faq.answerMd.length,
      estimatedTokens: Math.ceil((message.length + faq.answerMd.length) / 4),
      metadata: { faqId: faq.id },
    });
    return trackProductRoute(__FINHUB_TELEMETRY_PAIR, { route: __FINHUB_TELEMETRY_ROUTE }, __t0, NextResponse.json({
      ok: true as const,
      mode: "faq" as const,
      lang: textLang,
      answer: faq.answerMd,
      tier,
    }));
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return bad("OPENAI_API_KEY no está configurada en el servidor", 501);
  }

  const configuredModel = (process.env.FINNY_OPENAI_MODEL ?? "gpt-4.1-mini").toString();
  const ALLOWED_MODELS = new Set(["gpt-4.1-mini", "gpt-4.1", "gpt-4o-mini"]);
  if (!ALLOWED_MODELS.has(configuredModel)) {
    return bad("FINNY_OPENAI_MODEL no permitido por política del servidor", 500);
  }

  // Cost/risk control: Lite always uses mini model + lower max tokens.
  const model = tier === "lite" ? "gpt-4.1-mini" : configuredModel;
  const maxOutputTokens = tier === "lite" ? 220 : 550;

  let contextBlock = "";
  let latestCaseId: string | null = null;
  if (tier === "premium") {
    const ctx = await getFinnyContextSnapshot(supabase, user.id);
    contextBlock = buildFinnyContextForPrompt(ctx);
    latestCaseId = ctx.latestCaseId;
  }

  const system = buildFinnySystemPrompt(textLang, {
    tier,
    contextBlock: contextBlock || undefined,
  });

  const client = new OpenAI({ apiKey });
  try {
    const resp = await client.responses.create({
      model,
      max_output_tokens: maxOutputTokens,
      input: [
        { role: "system", content: system },
        { role: "user", content: message },
      ],
    });

    const text = (resp.output_text ?? "").toString().trim() || assistantError(textLang === "es" ? "es" : "en");
    const estimatedTokens = Math.ceil((message.length + text.length) / 4);

    await recordFinnyChatEvent(supabase, {
      userId: user.id,
      caseId: latestCaseId,
      tier,
      mode: "llm",
      messageHash,
      inputLength: message.length,
      outputLength: text.length,
      estimatedTokens,
      metadata: {
        model,
        maxOutputTokens,
        contextUsed: tier === "premium",
      },
    });

    return trackProductRoute(__FINHUB_TELEMETRY_PAIR, { route: __FINHUB_TELEMETRY_ROUTE }, __t0, NextResponse.json({
      ok: true as const,
      mode: "llm" as const,
      lang: textLang,
      answer: text,
      tier,
    }));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    await recordFinnyChatEvent(supabase, {
      userId: user.id,
      tier,
      mode: "error",
      messageHash,
      inputLength: message.length,
      metadata: { error: msg, model, maxOutputTokens },
    });
    return trackProductRoute(__FINHUB_TELEMETRY_PAIR, { route: __FINHUB_TELEMETRY_ROUTE }, __t0, NextResponse.json({
      ok: false as const,
      error: msg,
      tier,
    }, { status: 500 }));
  }
}
