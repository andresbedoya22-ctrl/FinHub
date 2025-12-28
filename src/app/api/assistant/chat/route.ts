import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getFaqAnswer, matchFinnyFaq, normalizeLang } from "@/features/assistant/finny/faqRegistry";
import { buildFinnySystemPrompt } from "@/features/assistant/finny/finnyPrompt";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Body = { message?: string; lang?: string };

function bad(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Body | null;
  const message = (body?.message ?? "").toString().trim();
  const lang = normalizeLang(body?.lang);

  const t = {
    es: {
      msgRequired: "message requerido",
      noKey: "OPENAI_API_KEY no está configurada en el servidor",
      fallback: "No pude generar una respuesta útil. Intenta reformular tu pregunta.",
      unknown: "Error desconocido",
    },
    en: {
      msgRequired: "message is required",
      noKey: "OPENAI_API_KEY is not configured on the server",
      fallback: "I could not generate a useful answer. Please try rephrasing your question.",
      unknown: "Unknown error",
    },
  } as const;

  if (message.length < 2) return bad(t[lang].msgRequired);

  // 1) FAQ match (respuesta automática)
  const faq = matchFinnyFaq(message);
  if (faq) {
    return NextResponse.json({ ok: true, mode: "faq", answer: getFaqAnswer(faq, lang) });
  }

  // 2) IA fallback
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return bad(t[lang].noKey, 501);
  }

  const client = new OpenAI({ apiKey });

  // Modelo configurable (si no existe en env, usamos un default conservador)
  const model = (process.env.FINNY_OPENAI_MODEL ?? "gpt-4.1-mini").toString();

  const system = buildFinnySystemPrompt(lang);

  try {
    const resp = await client.responses.create({
      model,
      input: [
        { role: "system", content: system },
        { role: "user", content: message },
      ],
    });

    const text = (resp.output_text ?? "").toString().trim() || t[lang].fallback;

    return NextResponse.json({ ok: true, mode: "llm", answer: text });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : t[lang].unknown;
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
