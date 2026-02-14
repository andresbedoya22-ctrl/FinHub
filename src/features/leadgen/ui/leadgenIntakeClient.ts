"use client";

import type { LeadgenVertical } from "@/features/verticals/server";

type StartResponse = { ok: boolean; caseId?: string | null; error?: string };
type SubmitResponse = { ok: boolean; caseId?: string | null; error?: string };
type MarketingLeadResponse = { ok: boolean; id?: string; error?: string };

export type LeadContact = {
  fullName: string;
  email: string;
  phone?: string;
  consent: boolean;
};

export async function startLeadgenCase(vertical: LeadgenVertical): Promise<string> {
  const res = await fetch("/api/verticals/intake", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "start", vertical }),
  });
  const json = (await res.json().catch(() => null)) as StartResponse | null;
  if (!res.ok || !json?.ok || !json.caseId) throw new Error(json?.error ?? "No se pudo iniciar el caso.");
  return json.caseId;
}

export async function submitLeadgenCase(
  vertical: LeadgenVertical,
  caseId: string,
  payload: Record<string, unknown>
): Promise<string> {
  const res = await fetch("/api/verticals/intake", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      action: "submit",
      vertical,
      caseId,
      payload,
    }),
  });
  const json = (await res.json().catch(() => null)) as SubmitResponse | null;
  if (!res.ok || !json?.ok || !json.caseId) throw new Error(json?.error ?? "No se pudo enviar la solicitud.");
  return json.caseId;
}

export async function createMarketingLead(input: {
  contact: LeadContact;
  interestedIn: string[];
  locale?: string;
}): Promise<string> {
  const res = await fetch("/api/marketing/leads", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      fullName: input.contact.fullName,
      email: input.contact.email,
      phone: input.contact.phone ?? "",
      locale: input.locale ?? "es",
      interestedIn: input.interestedIn,
      consentMarketing: input.contact.consent,
      source: "dashboard",
    }),
  });

  const json = (await res.json().catch(() => null)) as MarketingLeadResponse | null;
  if (!res.ok || !json?.ok || !json.id) throw new Error(json?.error ?? "No se pudo crear el lead.");
  return json.id;
}

