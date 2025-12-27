import { validateForSaveMachtigingsregistratieFieldsV1, type MachtigingsregistratieFieldsV1 } from "@/features/documents/machtigingsregistratieSchema";

export function extractMachtigingsregistratieFieldsFromText(rawText: string): {
  ok: true;
  fields: MachtigingsregistratieFieldsV1;
} | {
  ok: false;
  error: string;
} {
  const text = (rawText ?? "").toString();

  const activeringscode =
    text.match(/activeringscode\s*[:-]?\s*([A-Z0-9]{6,})/i)?.[1]?.toUpperCase() ?? "";

  const briefkenmerk =
    text.match(/briefkenmerk\s*[:-]?\s*([A-Z0-9-]{4,})/i)?.[1]?.toUpperCase() ?? "";

  const intrekkingscode =
    text.match(/intrekkingscode\s*[:-]?\s*([A-Z0-9-]{4,})/i)?.[1]?.toUpperCase() ?? "";

  const candidate: MachtigingsregistratieFieldsV1 = {
    activeringscode,
    briefkenmerk,
    intrekkingscode,
    extra: {},
  };

  const validated = validateForSaveMachtigingsregistratieFieldsV1(candidate);
  if (!validated.ok) return { ok: false, error: validated.error };

  return { ok: true, fields: validated.value };
}

