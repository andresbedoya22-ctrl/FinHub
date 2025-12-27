import { describe, expect, it } from "vitest";
import { requireOcrKind } from "../app/api/documents/[id]/_shared/ocrGuard";

type SupabaseErr = { message: string };

function makeSupabase(args: {
  doc: unknown | null;
  docErr?: SupabaseErr | null;
  onInsert?: (table: string, row: Record<string, unknown>) => void;
}) {
  return {
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: args.doc, error: args.docErr ?? null }),
        }),
      }),
      insert: async (row: Record<string, unknown>) => {
        args.onInsert?.(table, row);
        return { error: null as SupabaseErr | null };
      },
    }),
  };
}

describe("ocrGuard.requireOcrKind", () => {
  it("400 cuando hay error leyendo documents", async () => {
    const supabase = makeSupabase({ doc: null, docErr: { message: "boom" } });
    const r = await requireOcrKind({
      supabase,
      documentId: "d1",
      userId: "u1",
      required: "machtigingsregistratie",
      select: "id,user_id,ocr_kind",
      endpoint: "ocr",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.response.status).toBe(400);
  });

  it("404 cuando el documento no existe", async () => {
    const supabase = makeSupabase({ doc: null });
    const r = await requireOcrKind({
      supabase,
      documentId: "d1",
      userId: "u1",
      required: "machtigingsregistratie",
      select: "id,user_id,ocr_kind",
      endpoint: "ocr",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.response.status).toBe(404);
  });

  it("403 cuando user_id no coincide", async () => {
    const supabase = makeSupabase({ doc: { id: "d1", user_id: "u2", ocr_kind: "machtigingsregistratie" } });
    const r = await requireOcrKind({
      supabase,
      documentId: "d1",
      userId: "u1",
      required: "machtigingsregistratie",
      select: "id,user_id,ocr_kind",
      endpoint: "verify",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.response.status).toBe(403);
  });

  it("400 cuando ocr_kind no coincide y escribe auditoría (best-effort)", async () => {
    const inserts: Array<{ table: string; row: Record<string, unknown> }> = [];
    const supabase = makeSupabase({
      doc: { id: "d1", user_id: "u1", ocr_kind: null },
      onInsert: (table, row) => inserts.push({ table, row }),
    });

    const r = await requireOcrKind({
      supabase,
      documentId: "d1",
      userId: "u1",
      required: "machtigingsregistratie",
      select: "id,user_id,ocr_kind",
      endpoint: "extraction",
    });

    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.response.status).toBe(400);
    expect(inserts.some((x) => x.table === "document_reviews")).toBe(true);
  });

  it("ok=true cuando todo coincide", async () => {
    const supabase = makeSupabase({ doc: { id: "d1", user_id: "u1", ocr_kind: "machtigingsregistratie" } });
    const r = await requireOcrKind({
      supabase,
      documentId: "d1",
      userId: "u1",
      required: "machtigingsregistratie",
      select: "id,user_id,ocr_kind",
      endpoint: "ocr",
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect((r.doc as { id?: string }).id).toBe("d1");
  });
});