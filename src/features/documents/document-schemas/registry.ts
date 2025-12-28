import type { OcrKind } from "@/features/documents/documentsTypes";
import * as MR1 from "./machtigingsregistratie.v1";

export type ExtractionSpec = {
  extractionType: string;
  schemaVersion: number;
  schemaName: string;
  jsonSchema: Record<string, unknown>;
  instructions: string;
  validateForSave: (input: unknown) => { ok: true; value: unknown } | { ok: false; error: string };
};

export function getExtractionSpec(kind: OcrKind): ExtractionSpec {
  if (kind === "machtigingsregistratie") {
    return {
      extractionType: MR1.EXTRACTION_TYPE,
      schemaVersion: MR1.SCHEMA_VERSION,
      schemaName: MR1.SCHEMA_NAME,
      jsonSchema: MR1.JSON_SCHEMA,
      instructions: MR1.INSTRUCTIONS,
      validateForSave: MR1.validateForSave,
    };
  }
  // Exhaustivo por tipo
  const _exhaustive: never = kind;
  throw new Error(`No extraction spec for kind: ${_exhaustive}`);
}
