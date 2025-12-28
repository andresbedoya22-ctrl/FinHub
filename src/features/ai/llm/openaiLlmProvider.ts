import OpenAI from "openai";
import type { LlmProvider, LlmExtractArgs, LlmExtractResult } from "./llmProvider";

function safeJsonParse(raw: string): { ok: true; value: unknown } | { ok: false; error: string } {
  const t = (raw ?? "").toString().trim();
  if (!t) return { ok: false, error: "Empty model output" };
  try {
    return { ok: true, value: JSON.parse(t) };
  } catch {
    // fallback: intenta extraer el primer objeto JSON si el modelo devolvió texto extra
    const firstBrace = t.indexOf("{");
    const lastBrace = t.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      const slice = t.slice(firstBrace, lastBrace + 1);
      try {
        return { ok: true, value: JSON.parse(slice) };
      } catch {
        /* ignore parse fallback */
      }
    }
    return { ok: false, error: "Invalid JSON from model" };
  }
}

export class OpenAiLlmProvider implements LlmProvider {
  name = "openai";
  private client: OpenAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("Missing env: OPENAI_API_KEY");
    this.client = new OpenAI({ apiKey });
  }

  async extractJson(args: LlmExtractArgs): Promise<LlmExtractResult> {
    // Default estable para structured extraction (puedes sobreescribir con OPENAI_MODEL)
    const model = args.model || process.env.OPENAI_MODEL || "gpt-4o-mini";

    try {
      const response = await this.client.responses.create({
        model,
        input: [
          { role: "system", content: args.instructions },
          { role: "user", content: args.input },
        ],
        text: {
          format: {
            type: "json_schema",
            name: args.schemaName,
            strict: true,
            schema: args.jsonSchema,
          },
        },
      });

      const rawText = (response as unknown as { output_text?: string }).output_text ?? "";
      const parsed = safeJsonParse(rawText);
      if (!parsed.ok) return { ok: false, provider: this.name, error: parsed.error, rawText };

      return { ok: true, provider: this.name, data: parsed.value, rawText };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "OpenAI request failed";
      return { ok: false, provider: this.name, error: msg };
    }
  }
}
