import type { LlmProvider, LlmExtractArgs, LlmExtractResult } from "./llmProvider";

function safeString(v: unknown): string {
  return (v ?? "").toString();
}

function extractByHeuristic(schemaName: string, input: string): Record<string, unknown> {
  // Mock determinista: devuelve algo válido (aunque vacío) y, si detecta patrones, los rellena.
  const text = safeString(input);

  if (schemaName.toLowerCase().includes("machtigingsregistratie")) {
    const activeringscode =
      text.match(/activeringscode\s*[:-]?\s*([A-Z0-9]{6,})/i)?.[1]?.toUpperCase() ?? "";
    const briefkenmerk =
      text.match(/briefkenmerk\s*[:-]?\s*([A-Z0-9-]{4,})/i)?.[1]?.toUpperCase() ?? "";
    const intrekkingscode =
      text.match(/intrekkingscode\s*[:-]?\s*([A-Z0-9-]{4,})/i)?.[1]?.toUpperCase() ?? "";

    return {
      activeringscode,
      briefkenmerk,
      intrekkingscode,
      extra: {},
    };
  }

  return { extra: {} };
}

export class MockLlmProvider implements LlmProvider {
  name = "mock";

  async extractJson(args: LlmExtractArgs): Promise<LlmExtractResult> {
    try {
      const data = extractByHeuristic(args.schemaName, args.input);
      const rawText = JSON.stringify(data);
      return { ok: true, provider: this.name, data, rawText };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Mock provider failed";
      return { ok: false, provider: this.name, error: msg };
    }
  }
}
