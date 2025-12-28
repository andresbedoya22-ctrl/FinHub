import {
  MACHTIGINGSREGISTRATIE_SCHEMA_VERSION,
  validateForSaveMachtigingsregistratieFieldsV1,
} from "@/features/documents/machtigingsregistratieSchema";

export const EXTRACTION_TYPE = "machtigingsregistratie" as const;
export const SCHEMA_VERSION = MACHTIGINGSREGISTRATIE_SCHEMA_VERSION;

export const SCHEMA_NAME = "machtigingsregistratie_v1";

export const JSON_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  properties: {
    activeringscode: { type: "string" },
    briefkenmerk: { type: "string" },
    intrekkingscode: { type: "string" },
    naam: { type: "string" },
    geboortedatum: { type: "string", description: "YYYY-MM-DD cuando aplique" },
    bsn: { type: "string", description: "9 dígitos cuando aplique" },
    extra: { type: "object", additionalProperties: true },
  },
  required: [],
};

export const INSTRUCTIONS = [
  "Eres un extractor de campos.",
  "Devuelve SOLO JSON válido que cumpla el JSON Schema (sin texto adicional).",
  "Extrae los campos si aparecen en el texto OCR:",
  "- activeringscode: código de activación (normaliza quitando espacios/guiones, MAYÚSCULAS).",
  "- briefkenmerk: identificador/briefkenmerk si aparece.",
  "- intrekkingscode: código de revocación si aparece.",
  "- naam, geboortedatum (YYYY-MM-DD), bsn (9 dígitos) si aparecen.",
  "Si un campo no existe, devuélvelo como string vacío o no lo incluyas; pero no inventes datos.",
  "Coloca cualquier hallazgo adicional en extra (objeto).",
].join("\n");

export function validateForSave(input: unknown) {
  return validateForSaveMachtigingsregistratieFieldsV1(input);
}
