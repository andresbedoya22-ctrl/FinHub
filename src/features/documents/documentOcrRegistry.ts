import type { DocumentType, OcrKind } from "./documentsTypes";

/**
 * Registro central de reglas OCR:
 * - Define qué documentos tienen OCR estructurado.
 * - Define el ocr_kind por defecto basado en el tipo.
 */

export function inferOcrKindFromType(type: DocumentType): OcrKind | null {
  if (type === "machtigingsregistratie") return "machtigingsregistratie";
  return null;
}

/**
 * Convierte input (string/unknown) a OcrKind válido o null.
 * Sirve para no aceptar valores raros desde el cliente.
 */
export function parseOcrKind(input: unknown): OcrKind | null {
  if (typeof input !== "string") return null;
  const v = input.trim().toLowerCase();
  if (v === "machtigingsregistratie") return "machtigingsregistratie";
  return null;
}