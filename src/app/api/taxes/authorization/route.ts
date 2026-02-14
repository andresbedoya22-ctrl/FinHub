import { NextResponse } from "next/server";

import { supabaseRouteClient } from "@/lib/supabase/routeClient";
import { findLatestActiveCaseByVertical } from "@/features/verticals/server";

export const dynamic = "force-dynamic";

export type TaxesAuthorizationStatus =
  | "request_initiated"
  | "waiting_letter"
  | "letter_received"
  | "activation_code_captured"
  | "active_user_confirmed";

type AuthorizationPayload = {
  taxYear: number;
  authorizationStatus: TaxesAuthorizationStatus;
  letterDocumentId?: string | null;
  activationCode?: string | null;
};

function isStatus(value: unknown): value is TaxesAuthorizationStatus {
  return (
    value === "request_initiated" ||
    value === "waiting_letter" ||
    value === "letter_received" ||
    value === "activation_code_captured" ||
    value === "active_user_confirmed"
  );
}

function parsePayload(raw: unknown): AuthorizationPayload {
  if (!raw || typeof raw !== "object") throw new Error("Invalid body");
  const body = raw as Record<string, unknown>;
  const taxYear = Number(body.taxYear);
  const authorizationStatus = body.authorizationStatus;
  if (!Number.isInteger(taxYear) || taxYear < 2020 || taxYear > 2035) throw new Error("Invalid taxYear");
  if (!isStatus(authorizationStatus)) throw new Error("Invalid authorizationStatus");

  const letterDocumentId =
    typeof body.letterDocumentId === "string" && body.letterDocumentId.trim()
      ? body.letterDocumentId.trim().slice(0, 64)
      : null;
  const activationCode =
    typeof body.activationCode === "string" && body.activationCode.trim()
      ? body.activationCode.trim().toUpperCase().replace(/\s+/g, "").slice(0, 32)
      : null;

  return { taxYear, authorizationStatus, letterDocumentId, activationCode };
}

async function getLatestTaxesCaseId() {
  const supabase = await supabaseRouteClient();
  const { data: auth, error } = await supabase.auth.getUser();
  if (error || !auth?.user) return { error: "Unauthorized", status: 401 as const, caseId: null, supabase };
  const caseId = await findLatestActiveCaseByVertical(supabase, "taxes", auth.user.id);
  if (!caseId) return { error: "No active taxes case", status: 404 as const, caseId: null, supabase };
  return { error: null, status: 200 as const, caseId, supabase };
}

export async function GET() {
  const context = await getLatestTaxesCaseId();
  if (!context.caseId) return NextResponse.json({ ok: false, error: context.error }, { status: context.status });

  const row = await context.supabase
    .from("case_step_data")
    .select("data,updated_at")
    .eq("case_id", context.caseId)
    .eq("step_key", "authorization")
    .maybeSingle();

  if (row.error) return NextResponse.json({ ok: false, error: row.error.message }, { status: 500 });
  return NextResponse.json({ ok: true, caseId: context.caseId, authorization: row.data?.data ?? null });
}

export async function POST(req: Request) {
  const context = await getLatestTaxesCaseId();
  if (!context.caseId) return NextResponse.json({ ok: false, error: context.error }, { status: context.status });

  const body = (await req.json().catch(() => null)) as unknown;
  let payload: AuthorizationPayload;
  try {
    payload = parsePayload(body);
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Invalid body" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const save = await context.supabase.from("case_step_data").upsert(
    {
      case_id: context.caseId,
      step_key: "authorization",
      data: {
        kind: "taxes_authorization_v1",
        ...payload,
        updatedAt: now,
      },
      updated_at: now,
    },
    { onConflict: "case_id,step_key" }
  );
  if (save.error) return NextResponse.json({ ok: false, error: save.error.message }, { status: 500 });

  const patch = await context.supabase
    .from("cases")
    .update({
      authorization_status:
        payload.authorizationStatus === "active_user_confirmed"
          ? "verified"
          : payload.authorizationStatus === "letter_received" || payload.authorizationStatus === "activation_code_captured"
            ? "received"
            : "pending",
      updated_at: now,
    })
    .eq("id", context.caseId);
  if (patch.error) return NextResponse.json({ ok: false, error: patch.error.message }, { status: 500 });

  return NextResponse.json({ ok: true, caseId: context.caseId });
}
