import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { matchFinnyFaq } from "@/features/assistant/finny/faqRegistry";
import { buildFinnySystemPrompt } from "@/features/assistant/finny/finnyPrompt";
import { normalizeLang, pickLangForText, type AppLang } from "@/features/i18n/lang";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";


/** RATE_LIMIT: per-user (MVP)
 * - Ventana: 60s
 * - Límite: 20 req/min por usuario autenticado
 * - Nota: en producción multi-instancia, migrar a Redis/Upstash.
 */
type RateBucket = { count: number; resetAt: number };
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 20;
const __rateBuckets = new Map<string, RateBucket>();

function rateLimitCheck(userId: string) {
  const now = Date.now();
  const b = __rateBuckets.get(userId);
  if (!b || b.resetAt <= now) {
    __rateBuckets.set(userId, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return { ok: true as const };
  }
  b.count += 1;
  if (b.count > RATE_LIMIT) {
    const retryAfterSec = Math.max(1, Math.ceil((b.resetAt - now) / 1000));
    return { ok: false as const, retryAfterSec };
  }
  return { ok: true as const };
}
type Body = { message?: string; lang?: string };

function bad(msg: string, status = 400) {
  return NextResponse.json({ ok: false as const, error: msg }, { status });
}

function clampMessage(s: string) {
  const t = (s ?? "").toString().trim();
  // límite defensivo para evitar prompts gigantes
  return t.length > 1200 ? t.slice(0, 1200) : t;
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Body | null;

  const message = clampMessage(body?.message ?? "");
  if (message.length < 2) return bad("message requerido");
  // AUTH_GUARD: require logged-in user (avoid public LLM abuse)
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



  // RATE_LIMIT enforcement (MVP)
  const rl = rateLimitCheck(user.id);
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false as const, error: "Rate limit excedido" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  // Idioma activo: preferimos body.lang; si no, Accept-Language.
  const headerLang = req.headers.get("accept-language") ?? "";
  const rawLang = (body?.lang ?? headerLang).toString();
  const appLang: AppLang = normalizeLang(rawLang, "es");
  const textLang = pickLangForText(appLang); // hoy: es/en; resto => en

  // 1) FAQ match (respuesta automática)
  const faq = matchFinnyFaq(message, textLang);
  if (faq) {

    // AUDIT_CONSOLE: finny_chat_faq (MVP)
    try {
      console.log(
        JSON.stringify({
          evt: "finny_chat",
          user_id: user?.id ?? null,
          lang: textLang ?? null,
          mode: "faq",
          input_len: typeof message === "string" ? message.length : null,
          output_len: typeof faq?.answerMd === "string" ? faq.answerMd.length : null,
          ts: new Date().toISOString(),
        })
      );
    } catch {
      // noop
    }


    return NextResponse.json({ ok: true as const, mode: "faq" as const, lang: textLang, answer: faq.answerMd });
  }

  // 2) IA fallback
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return bad("OPENAI_API_KEY no está configurada en el servidor", 501);
  }

  const client = new OpenAI({ apiKey });

  // Modelo configurable
  const model = (process.env.FINNY_OPENAI_MODEL ?? "gpt-4.1-mini").toString();


  // FINNY_HARDENING: allowlist models + max_output_tokens
  const ALLOWED_MODELS = new Set([
    "gpt-4.1-mini",
    "gpt-4.1",
    "gpt-4o-mini",
  ]);
  if (!ALLOWED_MODELS.has(model)) {
    return bad("FINNY_OPENAI_MODEL no permitido por política del servidor", 500);
  }

  const system = buildFinnySystemPrompt(textLang);
  const userMessage = message;

  try {
    const resp = await client.responses.create({
      model,
      input: [
        { role: "system", content: system },
        { role: "user", content: userMessage },
      ],
    });

    const text =
      (resp.output_text ?? "").toString().trim() ||
      (textLang === "es"
        ? "No pude generar una respuesta útil. Intenta reformular tu pregunta."
        : "I couldn't generate a useful answer. Please rephrase your question.");


    // AUDIT_CONSOLE: finny_chat_llm (MVP)
    try {
      console.log(
        JSON.stringify({
          evt: "finny_chat",
          user_id: user?.id ?? null,
          lang: textLang ?? null,
          mode: "llm",
          input_len: typeof message === "string" ? message.length : null,
      output_len: typeof (text) === "string" ? (text).length : null,
          ts: new Date().toISOString(),
        })
      );
    } catch {
      // noop
    }

    return NextResponse.json({ ok: true as const, mode: "llm" as const, lang: textLang, answer: text });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return NextResponse.json({ ok: false as const, error: msg }, { status: 500 });
  }
}


