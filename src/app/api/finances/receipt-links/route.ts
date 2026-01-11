import { NextResponse } from "next/server";

import { supabaseRouteClient } from "@/lib/supabase/routeClient";

type Body = {
  documentId: string;
  transactionId: string;
};

function isUuid(s: string): boolean {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(s);
}

function isBody(x: unknown): x is Body {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return typeof o.documentId === "string" && typeof o.transactionId === "string";
}

export async function POST(req: Request) {
  const supabase = await supabaseRouteClient();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const raw = (await req.json().catch(() => null)) as unknown;
  if (!isBody(raw)) return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });

  const documentId = raw.documentId.trim();
  const transactionId = raw.transactionId.trim();

  if (!isUuid(documentId)) return NextResponse.json({ error: "documentId must be UUID" }, { status: 400 });
  if (!isUuid(transactionId)) return NextResponse.json({ error: "transactionId must be UUID" }, { status: 400 });

  const uid = auth.user.id;

  const { data, error } = await supabase
    .from("finance_receipt_links")
    .insert({
      user_id: uid,
      document_id: documentId,
      transaction_id: transactionId,
    })
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "INSERT_FAILED" }, { status: 500 });

  return NextResponse.json({ ok: true, id: String(data.id) }, { status: 200 });
}