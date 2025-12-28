import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { matchFinnyFaq } from "@/features/assistant/finny/faqRegistry";
import { buildFinnySystemPrompt } from "@/features/assistant/finny/finnyPrompt";
import { normalizeLang, pickLangForText, type AppLang } from "@/features/i18n/lang";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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

  // Idioma activo: preferimos body.lang; si no, Accept-Language.
  const headerLang = req.headers.get("accept-language") ?? "";
  const rawLang = (body?.lang ?? headerLang).toString();
  const appLang: AppLang = normalizeLang(rawLang, "es");
  const textLang = pickLangForText(appLang); // hoy: es/en; resto => en

  // 1) FAQ match (respuesta automática)
  const faq = matchFinnyFaq(message, textLang);
  if (faq) {
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

  const system = buildFinnySystemPrompt(textLang);
  const user = message;

  try {
    const resp = await client.responses.create({
      model,
      input: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });

    const text =
      (resp.output_text ?? "").toString().trim() ||
      (textLang === "es"
        ? "No pude generar una respuesta útil. Intenta reformular tu pregunta."
        : "I couldn't generate a useful answer. Please rephrase your question.");

    return NextResponse.json({ ok: true as const, mode: "llm" as const, lang: textLang, answer: text });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return NextResponse.json({ ok: false as const, error: msg }, { status: 500 });
  }
}
