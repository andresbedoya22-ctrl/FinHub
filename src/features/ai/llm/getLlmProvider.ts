import type { LlmProvider } from "./llmProvider";
import { MockLlmProvider } from "./mockLlmProvider";
import { OpenAiLlmProvider } from "./openaiLlmProvider";

export function getLlmProvider(): LlmProvider {
  const v = (process.env.LLM_PROVIDER ?? "mock").toLowerCase().trim();

  if (v === "openai") return new OpenAiLlmProvider();
  return new MockLlmProvider();
}
