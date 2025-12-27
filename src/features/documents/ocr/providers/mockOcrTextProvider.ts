import type { OcrTextProvider, OcrTextInput, OcrTextResult } from "./ocrTextProvider";

function buildDeterministicCode(seed: string, len: number): string {
  const cleaned = (seed ?? "").replace(/[^a-zA-Z0-9]+/g, "").toUpperCase();
  const base = cleaned.length ? cleaned : "FINHUB";
  const padded = (base + "X".repeat(len)).slice(0, len);
  return padded;
}

export class MockOcrTextProvider implements OcrTextProvider {
  public readonly name = "mock";

  async extractText(input: OcrTextInput): Promise<OcrTextResult> {
    const fileName = input.fileName ?? "";
    const activeringscode = buildDeterministicCode(fileName, 8);
    const briefkenmerk = `FINHUB-${buildDeterministicCode(fileName, 6)}`;
    const intrekkingscode = `INT-${buildDeterministicCode(fileName, 6)}`;

    const rawText =
      `Machtigingsregistratie\n` +
      `Activeringscode: ${activeringscode}\n` +
      `Briefkenmerk: ${briefkenmerk}\n` +
      `Intrekkingscode: ${intrekkingscode}\n`;

    return {
      rawText,
      confidence: 0.5,
      rawJson: { mock: true },
    };
  }
}
