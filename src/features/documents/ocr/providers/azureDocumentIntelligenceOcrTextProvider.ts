import type { OcrTextProvider, OcrTextInput, OcrTextResult } from "./ocrTextProvider";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function mustEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function normalizeEndpoint(endpoint: string): string {
  return endpoint.replace(/\/+$/, "");
}

function getString(obj: unknown, path: string[]): string {
  let cur: unknown = obj;
  for (const k of path) {
    if (!cur || typeof cur !== "object") return "";
    cur = (cur as Record<string, unknown>)[k];
  }
  return typeof cur === "string" ? cur : "";
}

export class AzureDocumentIntelligenceOcrTextProvider implements OcrTextProvider {
  public readonly name = "azure-document-intelligence";

  async extractText(input: OcrTextInput): Promise<OcrTextResult> {
    const endpoint = normalizeEndpoint(mustEnv("AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT"));
    const key = mustEnv("AZURE_DOCUMENT_INTELLIGENCE_KEY");
    const apiVersion = process.env.AZURE_DOCUMENT_INTELLIGENCE_API_VERSION ?? "2024-11-30";
    const modelId = process.env.AZURE_DOCUMENT_INTELLIGENCE_MODEL_ID ?? "prebuilt-read";

    const url = `${endpoint}/documentintelligence/documentModels/${encodeURIComponent(modelId)}:analyze?api-version=${encodeURIComponent(apiVersion)}`;

    const postRes = await fetch(url, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": key,
        "Content-Type": input.contentType ?? "application/octet-stream",
      },
      body: input.bytes,
    });

    if (postRes.status !== 202) {
      const txt = await postRes.text().catch(() => "");
      throw new Error(`Azure OCR analyze failed (${postRes.status}): ${txt.slice(0, 400)}`);
    }

    const opLoc = postRes.headers.get("operation-location") ?? postRes.headers.get("Operation-Location");
    if (!opLoc) throw new Error("Azure OCR: missing Operation-Location header");

    const maxAttempts = 30;
    const intervalMs = 1000;

    for (let i = 0; i < maxAttempts; i++) {
      await sleep(intervalMs);

      const pollRes = await fetch(opLoc, {
        method: "GET",
        headers: { "Ocp-Apim-Subscription-Key": key },
      });

      const json: unknown = await pollRes.json().catch(() => ({}));
      const status = getString(json, ["status"]).toLowerCase();

      if (status === "succeeded") {
        const content = getString(json, ["analyzeResult", "content"]);
        return {
          rawText: content,
          confidence: null,
          rawJson: json,
        };
      }

      if (status === "failed") {
        const msg = getString(json, ["error", "message"]);
        throw new Error(msg || "Azure OCR failed");
      }
    }

    throw new Error("Azure OCR timed out (polling exceeded)");
  }
}
