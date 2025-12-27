export type OcrTextResult = {
  rawText: string;
  confidence: number | null;
  rawJson: unknown | null;
};

export type OcrTextInput = {
  bytes: Uint8Array;
  contentType: string | null;
  fileName: string | null;
};

export interface OcrTextProvider {
  readonly name: string;
  extractText(input: OcrTextInput): Promise<OcrTextResult>;
}
