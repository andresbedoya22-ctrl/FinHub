"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { LandingCard } from "./LandingCard";
import { Input } from "@/ui/components/Input";
import { Button } from "@/ui/components/Button";
import { trackProductEvent } from "@/features/observability/productTelemetry";

export type LeadInterestKey =
  | "personal_finance"
  | "taxes"
  | "voorlopige_aanslag"
  | "toeslagen"
  | "mortgage"
  | "personal_loan"
  | "insurance";

const LEAD_INTEREST_KEYS: readonly LeadInterestKey[] = [
  "personal_finance",
  "taxes",
  "voorlopige_aanslag",
  "toeslagen",
  "mortgage",
  "personal_loan",
  "insurance",
] as const;

type ApiOk = { ok: true };
type ApiFail = { ok: false; error?: string };
type ApiResponse = ApiOk | ApiFail;

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}
function readApiResponse(x: unknown): ApiResponse | null {
  if (!isRecord(x) || typeof x.ok !== "boolean") return null;
  if (x.ok === true) return { ok: true };
  const err = typeof x.error === "string" ? x.error : undefined;
  return { ok: false, error: err };
}

function getLangFromDom(): LeadInterestKey extends never ? never : string {
  // NOTE: el tipo de retorno real es string porque el API espera string;
  // internamente normalizamos a los locales soportados.
  if (typeof document === "undefined") return "en";
  const raw = (document.documentElement.lang || "en").toLowerCase().trim();
  const base = (raw.split("-")[0] || "en").trim();

  const SUPPORTED = ["en", "es", "pl", "ro"] as const;
  type Supported = (typeof SUPPORTED)[number];

  function isSupported(x: string): x is Supported {
    return (SUPPORTED as readonly string[]).includes(x);
  }

  return isSupported(base) ? base : "en";
}export default function LandingLeadForm() {
  const t = useTranslations("landing");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [selected, setSelected] = useState<LeadInterestKey[]>([]);
  const [consent, setConsent] = useState(false);

  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return (
      !busy &&
      fullName.trim().length >= 2 &&
      email.trim().includes("@") &&
      selected.length >= 1 &&
      consent === true
    );
  }, [busy, fullName, email, selected.length, consent]);

  function toggle(k: LeadInterestKey) {
    setSelected((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));
  }

  function interestLabel(k: LeadInterestKey): string {
    // Template literal type => sin any y sin hardcodes.
    return t(`lead.interestLabels.${k}`);
  }

  async function submit() {
    setError(null);

    if (!canSubmit) {
      trackProductEvent("product.marketing.lead.submit.fail", { route: "/landing", reason: "validation" });
      setError(t("lead.error"));
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/marketing/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          locale: getLangFromDom(),
          interestedIn: selected,
          consentMarketing: consent,
          hp: "", // honeypot
        }),
      });

      const json = await res.json().catch(() => null);
      const api = readApiResponse(json);

      if (!res.ok || api?.ok !== true) {
        trackProductEvent("product.marketing.lead.submit.fail", { route: "/landing", reason: "server", status: res.status });
        setError(api && api.ok === false && api.error ? api.error : "Request failed");
        setOk(false);
      } else {
        trackProductEvent("product.marketing.lead.submit.success", { route: "/landing" });
        setOk(true);
      }
    } catch (e: unknown) {
      trackProductEvent("product.marketing.lead.submit.fail", { route: "/landing", reason: "exception" });
      setError(e instanceof Error ? e.message : "Unknown error");
      setOk(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <LandingCard className="border-white/10 bg-white/5 p-6 text-white shadow-[0_12px_40px_-18px_rgba(0,0,0,0.65)] backdrop-blur-sm">
      <div className="space-y-2">
        <div className="text-xl font-semibold">{t("lead.title")}</div>
        <div className="text-sm text-white/70">{t("lead.subtitle")}</div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <Input label={t("lead.fullName")} value={fullName} onChange={(e) => setFullName(e.target.value)} />
        <Input label={t("lead.email")} value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input label={t("lead.phone")} value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>

      <div className="mt-5">
        <div className="text-sm font-semibold">{t("lead.interests")}</div>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {LEAD_INTEREST_KEYS.map((k) => {
            const active = selected.includes(k);
            return (
              <button
                key={k}
                type="button"
                onClick={() => toggle(k)}
                aria-pressed={active}
                className={[
                  "rounded-2xl border px-4 py-3 text-left transition",
                  "border-white/10 bg-white/0 hover:bg-white/5",
                  "focus:outline-none focus:ring-2 focus:ring-[#4CAF50]/35",
                  active ? "border-[#4CAF50]/60 bg-[#4CAF50]/10" : "",
                ].join(" ")}
              >
                <div className="text-sm font-semibold text-white">{interestLabel(k)}</div>
                <div className="mt-1 text-xs text-white/60">{active ? "✓" : ""}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-5 flex items-start gap-3">
        <input
          id="consent"
          type="checkbox"
          className="mt-1 h-4 w-4 accent-[#4CAF50]"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
        />
        <label htmlFor="consent" className="text-sm text-white/70">
          {t("lead.consent")}
        </label>
      </div>

      {error ? <div className="mt-4 text-sm text-red-300">{error}</div> : null}

      {ok ? (
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="font-semibold text-white">{t("lead.successTitle")}</div>
          <div className="mt-1 text-sm text-white/70">{t("lead.successBody")}</div>
          <div className="mt-3">
            <Link className="text-sm underline text-white/90 hover:text-white" href="/register">
              {t("lead.createAccount")}
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-5 flex flex-wrap gap-3">
          <Button onClick={submit} disabled={!canSubmit}>
            {busy ? "…" : t("lead.submit")}
          </Button>
          <Link
            href="/register"
            className="rounded-xl border border-white/15 bg-white/0 px-4 py-2 text-sm text-white/90 hover:bg-white/5"
            onClick={() => trackProductEvent("product.marketing.cta.click", { route: "/landing", intent: "create_account" })}
          >
            {t("lead.createAccount")}
          </Link>
        </div>
      )}
    </LandingCard>
  );
}



