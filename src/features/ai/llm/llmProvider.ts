export type LlmExtractArgs = {
  instructions: string;
  input: string;
  schemaName: string;
  jsonSchema: Record<string, unknown>;
  model?: string;
};

export type LlmExtractResult =
  | { ok: true; provider: string; data: unknown; rawText: string }
  | { ok: false; provider: string; error: string; rawText?: string };

export interface LlmProvider {
  name: string;
  extractJson(args: LlmExtractArgs): Promise<LlmExtractResult>;
}
