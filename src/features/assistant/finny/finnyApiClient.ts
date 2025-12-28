export type FinnyChatResponse = {
  ok: boolean;
  mode?: "faq" | "llm";
  answer?: string; // markdown/plain
  error?: string;
};

export async function finnyChat(message: string): Promise<FinnyChatResponse> {
  const res = await fetch("/api/assistant/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message }),
  });

  const json = (await res.json().catch(() => null)) as FinnyChatResponse | null;
  if (!json) return { ok: false, error: "Respuesta inválida del servidor" };
  return json;
}
