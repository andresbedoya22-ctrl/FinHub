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

function getLocaleFromDom(): "en" | "es" | "pl" | "ro" {
  if (typeof document === "undefined") return "en";
  const raw = (document.documentElement.lang || "en").toLowerCase().trim();
  const base = (raw.split("-")[0] || "en").trim();
  return base === "es" || base === "pl" || base === "ro" ? base : "en";
}

export default function LandingLeadForm() {
  const t = useTranslations("landing");

  const [email, setEmail] = useState("");
  const [selected, setSelected] = useState<LeadInterestKey[]>([]);
  const [consent, setConsent] = useState(false);

  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return !busy && email.trim().includes("@") && selected.length >= 1 && consent === true;
  }, [busy, email, selected.length, consent]);

  function toggle(k: LeadInterestKey) {
    setSelected((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));
  }

  function interestLabel(k: LeadInterestKey): string {
    return t(`lead.interestLabels.${k}`);
  }

  async function submit() {
    setError(null);

    const locale = getLocaleFromDom();
    trackProductEvent("product.marketing.lead.submit.attempt", { route: "/landing", interestsCount: selected.length, locale });

    if (!canSubmit) {
      trackProductEvent("product.marketing.lead.submit.fail", { locale, reason: "validation" });
      trackProductEvent("product.marketing.lead.submit.fail", { route: "/landing", reason: "validation", locale });
      setError(t("lead.error"));
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/marketing/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          locale,
          interestedIn: selected,
          consentMarketing: consent,
          hp: "", // honeypot
        }),
      });

      const json = await res.json().catch(() => null);
      const api = readApiResponse(json);

      if (!res.ok || api?.ok !== true) {
        trackProductEvent("product.marketing.lead.submit.fail", { locale, reason: "server" });
        trackProductEvent("product.marketing.lead.submit.fail", { route: "/landing", reason: "server", status: res.status, locale });
        setError(api && api.ok === false && api.error ? api.error : "Request failed");
        setOk(false);
      } else {
        trackProductEvent("product.marketing.lead.submit.success", { locale });
        trackProductEvent("product.marketing.lead.submit.success", { route: "/landing", locale });
        setOk(true);
      }
    } catch (e: unknown) {
      const locale2 = getLocaleFromDom();
      trackProductEvent("product.marketing.lead.submit.fail", { locale: locale2, reason: "server" });
      trackProductEvent("product.marketing.lead.submit.fail", { route: "/landing", reason: "exception", locale: locale2 });
      setError(e instanceof Error ? e.message : "Unknown error");
      setOk(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <LandingCard className="border-fh-border bg-fh-surface/60 p-6 text-fh-text shadow-soft backdrop-blur-sm">
      <div className="space-y-2">
        <div className="text-xl font-semibold">{t("lead.title")}</div>
        <div className="text-sm text-fh-muted">{t("lead.subtitle")}</div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <Input label={t("lead.email")} value={email} onChange={(e) => setEmail(e.target.value)} />
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
                  "border-fh-border bg-fh-surface hover:bg-fh-surface-2",
                  "focus:outline-none focus:ring-2 focus:ring-fh-focus/60",
                  active ? "border-fh-primary/60 bg-fh-primary/10" : "",
                ].join(" ")}
              >
                <div className="text-sm font-semibold text-fh-text">{interestLabel(k)}</div>
                <div className="mt-1 text-xs text-fh-muted">{active ? "âœ“" : ""}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-5 flex items-start gap-3">
        <input
          id="consent"
          type="checkbox"
          className="mt-1 h-4 w-4 accent-[var(--fh-primary)]"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
        />
        <label htmlFor="consent" className="text-sm text-fh-muted">
          {t("lead.consent")}
        </label>
      </div>

      {error ? <div className="mt-4 text-sm text-red-300">{error}</div> : null}

      {ok ? (
        <div className="mt-5 rounded-2xl border border-fh-border bg-fh-surface p-4">
          <div className="font-semibold text-fh-text">{t("lead.successTitle")}</div>
          <div className="mt-1 text-sm text-fh-muted">{t("lead.successBody")}</div>
          <div className="mt-3">
            <Link className="text-sm underline text-fh-muted hover:text-fh-text" href="/register">
              {t("lead.createAccount")}
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-5 flex flex-wrap gap-3">
          <Button onClick={submit} disabled={!canSubmit}>
            {busy ? "â€¦" : t("lead.submit")}
          </Button>
          <Link
            href="/register"
            className="rounded-xl border border-fh-border bg-transparent px-4 py-2 text-sm text-fh-text hover:bg-fh-surface-2"
            onClick={() => trackProductEvent("cta_primary_click", { locale: getLocaleFromDom(), placement: "lead", target: "register" })}
          >
            {t("lead.createAccount")}
          </Link>
        </div>
      )}
    </LandingCard>
  );
}
