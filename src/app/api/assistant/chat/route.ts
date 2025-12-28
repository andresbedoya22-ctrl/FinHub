import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { matchFinnyFaq, renderFinnyFaqAnswer } from "@/features/assistant/finny/faqRegistry";
import { buildFinnySystemPrompt } from "@/features/assistant/finny/finnyPrompt";
import { AppLang, normalizeLang } from "@/features/i18n/lang";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Body = { message?: string; lang?: string };

function bad(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Body | null;
  const message = (body?.message ?? "").toString().trim();
  if (message.length < 2) return bad("message requerido");

  const headerLang = req.headers.get("x-finhub-lang");
  const lang: AppLang = normalizeLang(body?.lang ?? headerLang ?? "es", "es");

  // 1) FAQ match (respuesta automática)
  const faq = matchFinnyFaq(message);
  if (faq) {
    const answer = renderFinnyFaqAnswer(faq, lang);
    return NextResponse.json({ ok: true, mode: "faq", answer, lang });
  }

  // 2) IA fallback
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return bad("OPENAI_API_KEY no está configurada en el servidor", 501);
  }

  const client = new OpenAI({ apiKey });

  // Modelo configurable (si no existe en env, usamos un default conservador)
  const model = (process.env.FINNY_OPENAI_MODEL ?? "gpt-4.1-mini").toString();

  const system = buildFinnySystemPrompt(lang);
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
      (lang === "es"
        ? "No pude generar una respuesta útil. Intenta reformular tu pregunta."
        : "I could not generate a useful answer. Please try rephrasing your question.");

    return NextResponse.json({ ok: true, mode: "llm", answer: text, lang });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
