import type { OcrTextProvider } from "./providers/ocrTextProvider";
import { MockOcrTextProvider } from "./providers/mockOcrTextProvider";
import { AzureDocumentIntelligenceOcrTextProvider } from "./providers/azureDocumentIntelligenceOcrTextProvider";

export function getOcrTextProvider(): OcrTextProvider {
  const v = (process.env.FINHUB_OCR_PROVIDER ?? "mock").toLowerCase().trim();

  if (v === "azure") return new AzureDocumentIntelligenceOcrTextProvider();
  return new MockOcrTextProvider();
}
