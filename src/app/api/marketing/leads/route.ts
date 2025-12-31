import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServerClient";

type Body = {
  fullName?: unknown;
  email?: unknown;
  phone?: unknown;
  locale?: unknown;
  source?: unknown;
  interestedIn?: unknown;
  consentMarketing?: unknown;

  utmSource?: unknown;
  utmMedium?: unknown;
  utmCampaign?: unknown;
  utmTerm?: unknown;
  utmContent?: unknown;

  hp?: unknown;
};

function isString(x: unknown): x is string {
  return typeof x === "string";
}

function asString(x: unknown): string | null {
  return isString(x) ? x : null;
}

function asBool(x: unknown): boolean {
  return x === true;
}

function asStringArray(x: unknown): string[] {
  if (!Array.isArray(x)) return [];
  return x.filter((v) => typeof v === "string") as string[];
}

export async function POST(req: Request) {
  const t0 = Date.now();

  try {
    const bodyUnknown = (await req.json().catch(() => null)) as Body | null;
    if (!bodyUnknown) {
      return NextResponse.json({ ok: false, error: "Invalid JSON", code: "validation" }, { status: 400 });
    }

    // honeypot spam trap
    const hp = asString(bodyUnknown.hp);
    if (hp && hp.trim().length > 0) {
      return NextResponse.json({ ok: false, error: "Rejected", code: "validation" }, { status: 400 });
    }

    const fullName = (asString(bodyUnknown.fullName) ?? "").trim();
    const email = (asString(bodyUnknown.email) ?? "").trim();
    const phone = (asString(bodyUnknown.phone) ?? "").trim() || null;
    const locale = (asString(bodyUnknown.locale) ?? "en").trim();
    const source = "landing";

    const interestedIn = asStringArray(bodyUnknown.interestedIn).slice(0, 12);
    const consentMarketing = asBool(bodyUnknown.consentMarketing);

    if (fullName.length < 2) {
      return NextResponse.json({ ok: false, error: "fullName required", code: "validation" }, { status: 400 });
    }
    if (!email.includes("@") || email.length < 6) {
      return NextResponse.json({ ok: false, error: "email invalid", code: "validation" }, { status: 400 });
    }
    if (!consentMarketing) {
      return NextResponse.json({ ok: false, error: "consent required", code: "validation" }, { status: 400 });
    }
    if (interestedIn.length < 1) {
      return NextResponse.json({ ok: false, error: "interestedIn required", code: "validation" }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();

    const payload = {
      full_name: fullName,
      email,
      phone,
      locale,
      source,
      interested_in: interestedIn,
      consent_marketing: true,
      consent_ts: new Date().toISOString(),

      utm_source: asString(bodyUnknown.utmSource),
      utm_medium: asString(bodyUnknown.utmMedium),
      utm_campaign: asString(bodyUnknown.utmCampaign),
      utm_term: asString(bodyUnknown.utmTerm),
      utm_content: asString(bodyUnknown.utmContent),
    };

    const { data, error } = await supabase
      .from("marketing_leads")
      .insert(payload)
      .select("id")
      .single();

    if (error || !data) {
      return NextResponse.json({ ok: false, error: error?.message ?? "Insert failed", code: "server" }, { status: 500 });
    }

    const ms = Date.now() - t0;

    return NextResponse.json({ ok: true, id: data.id, latencyMs: ms }, { status: 200 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: msg, code: "server" }, { status: 500 });
  }
}
