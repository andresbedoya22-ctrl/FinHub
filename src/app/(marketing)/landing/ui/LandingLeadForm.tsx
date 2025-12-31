"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { Input } from "@/ui/components/Input";
import { Button } from "@/ui/components/Button";
import { trackProductEvent } from "@/features/observability/productTelemetry";
import { submitMarketingLead } from "@/features/marketing/leadsClient";
import { LEAD_INTERESTS } from "@/features/marketing/leadsStore";
import type { AppLang, LeadInterest } from "@/features/marketing/leadsTypes";

type Strings = {
  title: string;
  subtitle: string;
  name: string;
  email: string;
  phone: string;
  interests: string;
  consent: string;
  submit: string;
  successTitle: string;
  successBody: string;
  fail: string;
  ctaCreateAccount: string;

  interestLabels: Record<LeadInterest, string>;
};

function getLocaleFromHtml(): AppLang {
  const raw = typeof document !== "undefined" ? document.documentElement.lang : "en";
  const v = (raw || "en").toLowerCase();
  if (v.startsWith("es")) return "es";
  if (v.startsWith("pl")) return "pl";
  if (v.startsWith("ro")) return "ro";
  return "en";
}

function readUtm(): Record<string, string | null> {
  if (typeof window === "undefined") return {};
  const p = new URLSearchParams(window.location.search);
  return {
    utmSource: p.get("utm_source"),
    utmMedium: p.get("utm_medium"),
    utmCampaign: p.get("utm_campaign"),
    utmTerm: p.get("utm_term"),
    utmContent: p.get("utm_content"),
  };
}

export default function LandingLeadForm({ strings }: { strings: Strings }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [hp, setHp] = useState(""); // honeypot
  const [selected, setSelected] = useState<LeadInterest[]>([]);
  const [busy, setBusy] = useState(false);
  const [doneId, setDoneId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return (
      !busy &&
      fullName.trim().length >= 2 &&
      email.trim().includes("@") &&
      consent === true &&
      selected.length >= 1
    );
  }, [busy, fullName, email, consent, selected.length]);

  async function submit() {
    setError(null);

    trackProductEvent("product.marketing.cta.click", {
      route: "/landing",
      intent: "lead_form",
    });

    if (!canSubmit) {
      setError(strings.fail);
      return;
    }

    setBusy(true);
    const locale = getLocaleFromHtml();
    const utm = readUtm();

    try {
      const res = await submitMarketingLead({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim() ? phone.trim() : null,
        locale,
        source: "landing",
        interestedIn: selected,
        consentMarketing: consent,
        hp: hp || null,
        ...utm,
      });

      if (res.ok) {
        setDoneId(res.id);
        trackProductEvent("product.marketing.lead.submit.success", {
          route: "/landing",
          interested_count: selected.length,
        });
      } else {
        setError(res.error || strings.fail);
        trackProductEvent("product.marketing.lead.submit.fail", {
          route: "/landing",
          reason: res.code ?? "server",
        });
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : strings.fail);
      trackProductEvent("product.marketing.lead.submit.fail", {
        route: "/landing",
        reason: "server",
      });
    } finally {
      setBusy(false);
    }
  }

  function toggleInterest(k: LeadInterest) {
    setSelected((prev) =>
      prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]
    );
  }

  if (doneId) {
    return (
      <div className="rounded-2xl border border-fh-border bg-white p-6">
        <div className="text-lg font-semibold">{strings.successTitle}</div>
        <div className="mt-2 text-sm opacity-80">{strings.successBody}</div>
        <div className="mt-5">
          <Link href="/register" className="underline text-sm">
            {strings.ctaCreateAccount}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-fh-border bg-white p-6 space-y-4">
      <div>
        <div className="text-lg font-semibold">{strings.title}</div>
        <div className="text-sm opacity-75">{strings.subtitle}</div>
      </div>

      {/* honeypot (hidden) */}
      <div className="hidden">
        <Input value={hp} onChange={(e) => setHp(e.target.value)} placeholder="Leave empty" />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <div className="text-sm font-medium">{strings.name}</div>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Doe" />
        </div>
        <div className="space-y-2">
          <div className="text-sm font-medium">{strings.email}</div>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
        </div>
        <div className="space-y-2 md:col-span-2">
          <div className="text-sm font-medium">{strings.phone}</div>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+31 6 ..." />
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-sm font-medium">{strings.interests}</div>
        <div className="flex flex-wrap gap-2">
          {LEAD_INTERESTS.sort((a, b) => a.order - b.order).map(({ key }) => {
            const active = selected.includes(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleInterest(key)}
                className={[
                  "px-3 py-2 rounded-xl border text-sm",
                  active ? "bg-[#0D1B2A] text-white border-[#0D1B2A]" : "bg-white hover:bg-gray-50",
                ].join(" ")}
              >
                {strings.interestLabels[key]}
              </button>
            );
          })}
        </div>
      </div>

      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-1"
        />
        <span className="opacity-85">{strings.consent}</span>
      </label>

      {error ? <div className="text-sm text-red-600">{error}</div> : null}

      <div className="flex items-center gap-3">
        <Button onClick={submit} disabled={!canSubmit}>
          {busy ? "…" : strings.submit}
        </Button>
        <Link href="/register" className="text-sm underline opacity-80 hover:opacity-100">
          {strings.ctaCreateAccount}
        </Link>
      </div>
    </div>
  );
}
