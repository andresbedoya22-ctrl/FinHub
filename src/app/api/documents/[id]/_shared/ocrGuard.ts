import { NextResponse } from "next/server";

type SupabaseError = { message: string };

type RequireOcrKindArgs = {
  supabase: unknown; // IMPORTANTE: evitar que TS intente comparar el tipo enorme del cliente Supabase
  documentId: string;
  userId: string;
  required: "machtigingsregistratie";
  select: string;
  endpoint: "ocr" | "extraction" | "verify";
};

export type DocMin = {
  user_id?: string;
  ocr_kind?: string | null;
} & Record<string, unknown>;

type SupabaseLikeMinimal = {
  from: (table: string) => {
    select: (cols: string) => {
      eq: (col: string, val: string) => {
        maybeSingle: () => Promise<{ data: unknown | null; error: SupabaseError | null }>;
      };
    };
    insert: (row: Record<string, unknown>) => Promise<{ error?: SupabaseError | null }>;
  };
};

export async function requireOcrKind(
  args: RequireOcrKindArgs
): Promise<{ ok: true; doc: DocMin } | { ok: false; response: NextResponse }> {
  const { documentId, userId, required, select, endpoint } = args;

  // Cast mínimo a lo que realmente usamos (sin tipado profundo)
  const supabase = args.supabase as SupabaseLikeMinimal;

  const { data: doc, error: docErr } = await supabase
    .from("documents")
    .select(select)
    .eq("id", documentId)
    .maybeSingle();

  if (docErr) {
    return { ok: false, response: NextResponse.json({ ok: false, error: docErr.message }, { status: 400 }) };
  }

  if (!doc) {
    return { ok: false, response: NextResponse.json({ ok: false, error: "Document not found" }, { status: 404 }) };
  }

  const d = doc as DocMin;

  if (d.user_id !== userId) {
    return { ok: false, response: NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 }) };
  }

  const ocrKind = d.ocr_kind ?? null;
  if (ocrKind !== required) {
    const err = `${endpoint.toUpperCase()} solo soporta ocr_kind=${required}`;
    const now = new Date().toISOString();

    try {
      await supabase.from("document_reviews").insert({
        document_id: documentId,
        user_id: userId,
        actor_id: userId,
        actor_role: "user",
        action: "ocr_failed",
        payload: { error: err, required_ocr_kind: required, ocr_kind: ocrKind, endpoint },
        created_at: now,
      });
    } catch (e: unknown) {
      void e;
    }

    return { ok: false, response: NextResponse.json({ ok: false, error: err }, { status: 400 }) };
  }

  return { ok: true, doc: d };
}