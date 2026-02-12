import { NextResponse } from "next/server";
import { processElementsReverseSync } from "@/features/integrations/elements/elementsReverseSyncService";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const secret = process.env.ELEMENTS_WEBHOOK_SECRET;
  if (!secret || secret.trim().length === 0) {
    return NextResponse.json({ ok: false, error: "Elements webhook not configured" }, { status: 503 });
  }

  const incoming = req.headers.get("x-elements-webhook-secret") ?? "";
  if (incoming !== secret) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await req.json().catch(() => null)) as {
    externalCaseId?: string;
    status?: string;
    eventType?: string;
    occurredAt?: string;
    metadata?: Record<string, unknown>;
  } | null;

  if (!payload?.externalCaseId || !payload?.status) {
    return NextResponse.json({ ok: false, error: "externalCaseId and status are required" }, { status: 400 });
  }

  try {
    const result = await processElementsReverseSync({
      externalCaseId: payload.externalCaseId,
      status: payload.status,
      eventType: payload.eventType,
      occurredAt: payload.occurredAt,
      metadata: payload.metadata,
    });

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Reverse sync failed";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
