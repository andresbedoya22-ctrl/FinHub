"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { Button } from "@/ui/components/Button";
import { Card } from "@/ui/components/Card";
import { Header } from "@/ui/components/Header";
import { InfoBox } from "@/ui/components/InfoBox";
import { Screen } from "@/ui/components/Screen";
import {
  estimateMortgageCapacity,
  mapIncomeBand,
  type MortgageBuyerInput,
} from "./leadgenCalculators";
import {
  createMarketingLead,
  startLeadgenCase,
  submitLeadgenCase,
  type LeadContact,
} from "./leadgenIntakeClient";
import { useLeadIdentity } from "./useLeadIdentity";
import { trackProductEvent } from "@/features/observability/productTelemetry";

type WizardStep = "buyers" | "buyers_data" | "result" | "contact" | "done";

type TimelineValue = "0_3" | "3_6" | "6_12" | "12_plus";

function euro(value: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function buildEmptyBuyer(): MortgageBuyerInput {
  return {
    grossIncome: 5000,
    incomePeriod: "monthly",
    birthDate: "",
    selfEmployed: false,
  };
}

export function MortgageCalculatorClient() {
  const t = useTranslations("leadgen.mortgage");
  const common = useTranslations("leadgen.common");
  const validationT = useTranslations("leadgen.validation");
  const locale = useLocale();
  const identity = useLeadIdentity();

  const [step, setStep] = useState<WizardStep>("buyers");
  const [buyersCount, setBuyersCount] = useState(1);
  const [activeBuyerIdx, setActiveBuyerIdx] = useState(0);
  const [buyers, setBuyers] = useState<MortgageBuyerInput[]>([buildEmptyBuyer()]);
  const [hasOwnFunds, setHasOwnFunds] = useState(true);
  const [timelineMonths, setTimelineMonths] = useState<TimelineValue>("3_6");

  const [contact, setContact] = useState<LeadContact>({
    fullName: "",
    email: "",
    phone: "",
    consent: false,
  });

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [caseId, setCaseId] = useState<string | null>(null);
  const [marketingLeadId, setMarketingLeadId] = useState<string | null>(null);

  const estimate = useMemo(() => estimateMortgageCapacity(buyers.slice(0, buyersCount), hasOwnFunds), [buyers, buyersCount, hasOwnFunds]);

  const wizardProgress = useMemo(() => {
    const total = buyersCount + 3;
    const current =
      step === "buyers" ? 1 :
      step === "buyers_data" ? 1 + activeBuyerIdx + 1 :
      step === "result" ? buyersCount + 2 :
      step === "contact" ? buyersCount + 3 :
      total;
    return { current, total };
  }, [activeBuyerIdx, buyersCount, step]);

  const activeBuyer = buyers[activeBuyerIdx] ?? buildEmptyBuyer();

  function ensureBuyerRows(nextCount: number) {
    const out: MortgageBuyerInput[] = [];
    for (let i = 0; i < nextCount; i += 1) {
      out.push(buyers[i] ?? buildEmptyBuyer());
    }
    setBuyers(out);
  }

  function updateBuyer(index: number, patch: Partial<MortgageBuyerInput>) {
    setBuyers((prev) => {
      const next = [...prev];
      next[index] = { ...(next[index] ?? buildEmptyBuyer()), ...patch };
      return next;
    });
  }

  function canContinueBuyerData(index: number): boolean {
    const buyer = buyers[index];
    if (!buyer) return false;
    return buyer.grossIncome > 0 && buyer.birthDate.length >= 10;
  }

  function nextFromBuyerData() {
    if (!canContinueBuyerData(activeBuyerIdx)) return;
    if (activeBuyerIdx + 1 < buyersCount) {
      setActiveBuyerIdx((v) => v + 1);
      return;
    }
    setStep("result");
  }

  function backFromBuyerData() {
    if (activeBuyerIdx > 0) {
      setActiveBuyerIdx((v) => v - 1);
      return;
    }
    setStep("buyers");
  }

  function validateContact(): string | null {
    if (identity.loggedIn) return null;
    if (contact.fullName.trim().length < 2) return validationT("fullName");
    if (!contact.email.includes("@") || contact.email.trim().length < 6) return validationT("email");
    if (!contact.consent) return validationT("consent");
    return null;
  }

  async function persistLeadAndCase() {
    if (busy) return;
    setBusy(true);
    setError(null);

    try {
      const annualIncome = estimate.annualHouseholdIncome;
      const selectedBuyers = buyers.slice(0, buyersCount);
      const employmentStatus = selectedBuyers.some((b) => b.selfEmployed) ? "self_employed" : "employed";

      const contactValidation = validateContact();
      if (contactValidation) throw new Error(contactValidation);

      if (identity.loggedIn) {
        const cid = caseId ?? (await startLeadgenCase("mortgage"));
        const payload = {
          fullName: identity.fullName || "Authenticated user",
          email: identity.email,
          phone: contact.phone?.trim() || null,
          employmentStatus,
          yearlyIncomeBand: mapIncomeBand(annualIncome),
          timelineMonths,
          hasPartner: buyersCount > 1,
          notes: JSON.stringify({
            calculator: "mortgage_multi_step_v4",
            buyersCount,
            buyers: selectedBuyers,
            hasOwnFunds,
            estimate,
          }),
          consent: true,
        };
        const saved = await submitLeadgenCase("mortgage", cid, payload);
        setCaseId(saved);
      } else {
        const leadId = await createMarketingLead({
          contact: {
            fullName: contact.fullName.trim(),
            email: contact.email.trim().toLowerCase(),
            phone: contact.phone?.trim() || "",
            consent: contact.consent,
          },
          interestedIn: ["mortgage"],
          locale,
        });
        setMarketingLeadId(leadId);
      }

      trackProductEvent("product.leadgen.intake.submit", { route: "/app/mortgage" });
      setStep("done");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : common("submitError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen className="space-y-6">
      <Header title={t("title")} subtitle={t("subtitle")} />
      {process.env.NODE_ENV === "development" ? (
        <div className="inline-flex rounded-full border border-fh-primary/40 bg-fh-primary/10 px-3 py-1 text-xs font-semibold text-fh-primary">
          {t("devMarker")}
        </div>
      ) : null}

      <Card className="space-y-2">
        <div className="text-xs uppercase tracking-wide text-fh-muted">{common("progress")}</div>
        <div className="h-2 w-full rounded-full bg-fh-surface-2">
          <div
            className="h-2 rounded-full bg-fh-primary transition-all"
            style={{ width: `${Math.round((wizardProgress.current / wizardProgress.total) * 100)}%` }}
          />
        </div>
        <div className="text-xs text-fh-muted">
          {common("stepOf", { current: wizardProgress.current, total: wizardProgress.total })}
        </div>
      </Card>

      {step === "buyers" ? (
        <Card className="space-y-4">
          <div className="text-sm font-semibold">{t("buyers.question")}</div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[1, 2, 3, 4].map((count) => (
              <button
                key={count}
                type="button"
                onClick={() => {
                  setBuyersCount(count);
                  ensureBuyerRows(count);
                }}
                className={`rounded-xl border px-3 py-3 text-sm font-semibold ${buyersCount === count ? "border-fh-primary bg-fh-primary/10" : "border-fh-border bg-fh-surface"}`}
              >
                {count}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-end">
            <Button
              onClick={() => {
                setActiveBuyerIdx(0);
                setStep("buyers_data");
              }}
            >
              {common("continue")}
            </Button>
          </div>
        </Card>
      ) : null}

      {step === "buyers_data" ? (
        <Card className="space-y-4">
          <div className="text-sm font-semibold">{t("buyers.dataTitle", { index: activeBuyerIdx + 1 })}</div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs uppercase text-fh-muted">{t("buyers.grossIncome")}</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={0}
                  value={activeBuyer.grossIncome}
                  onChange={(e) => updateBuyer(activeBuyerIdx, { grossIncome: Number(e.target.value) || 0 })}
                  className="w-full rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm"
                />
                <div className="inline-flex rounded-xl border border-fh-border bg-fh-surface p-1">
                  {(["monthly", "annual"] as const).map((period) => (
                    <button
                      key={period}
                      type="button"
                      onClick={() => updateBuyer(activeBuyerIdx, { incomePeriod: period })}
                      className={`rounded-lg px-3 py-1 text-xs ${activeBuyer.incomePeriod === period ? "bg-fh-primary text-fh-primaryFg" : "text-fh-muted"}`}
                    >
                      {period === "monthly" ? t("buyers.monthly") : t("buyers.annual")}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase text-fh-muted">{t("buyers.birthDate")}</label>
              <input
                type="date"
                value={activeBuyer.birthDate}
                onChange={(e) => updateBuyer(activeBuyerIdx, { birthDate: e.target.value })}
                className="w-full rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase text-fh-muted">{t("buyers.hasCompany")}</label>
              <div className="inline-flex rounded-xl border border-fh-border bg-fh-surface p-1">
                {[false, true].map((flag) => (
                  <button
                    key={String(flag)}
                    type="button"
                    onClick={() => updateBuyer(activeBuyerIdx, { selfEmployed: flag })}
                    className={`rounded-lg px-3 py-1 text-xs ${activeBuyer.selfEmployed === flag ? "bg-fh-primary text-fh-primaryFg" : "text-fh-muted"}`}
                  >
                    {flag ? common("yes") : common("no")}
                  </button>
                ))}
              </div>
            </div>

            <label className="md:col-span-2 flex items-center gap-2 rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={hasOwnFunds}
                onChange={(e) => setHasOwnFunds(e.target.checked)}
              />
              {t("buyers.hasOwnFunds")}
            </label>
          </div>

          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={backFromBuyerData}>{common("back")}</Button>
            <Button onClick={nextFromBuyerData} disabled={!canContinueBuyerData(activeBuyerIdx)}>{common("next")}</Button>
          </div>
        </Card>
      ) : null}

      {step === "result" ? (
        <Card className="space-y-4">
          <div className="text-sm font-semibold">{t("result.title")}</div>
          <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4">
            <div className="text-xs uppercase text-fh-muted">{t("result.capacity")}</div>
            <div className="mt-1 text-3xl font-semibold">{euro(estimate.maxMortgage)}</div>
            <div className="mt-1 text-xs text-fh-muted">
              {t("result.meta", {
                buyers: buyersCount,
                annualIncome: euro(estimate.annualHouseholdIncome),
                oldestAge: estimate.oldestAge,
              })}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-fh-border bg-fh-surface p-3 text-sm">{t("result.benefit1")}</div>
            <div className="rounded-xl border border-fh-border bg-fh-surface p-3 text-sm">{t("result.benefit2")}</div>
            <div className="rounded-xl border border-fh-border bg-fh-surface p-3 text-sm">{t("result.benefit3")}</div>
          </div>

          <div className="rounded-xl border border-fh-border bg-fh-surface p-3 text-sm text-fh-muted">
            {t("result.testimonial")}
          </div>

          <div className="space-y-2">
            <label className="text-xs uppercase text-fh-muted">{t("result.timelineLabel")}</label>
            <select
              value={timelineMonths}
              onChange={(e) => setTimelineMonths(e.target.value as TimelineValue)}
              className="w-full rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm"
            >
              <option value="0_3">{t("timeline.0_3")}</option>
              <option value="3_6">{t("timeline.3_6")}</option>
              <option value="6_12">{t("timeline.6_12")}</option>
              <option value="12_plus">{t("timeline.12_plus")}</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => setStep("buyers_data")}>{common("back")}</Button>
            <Button onClick={() => setStep("contact")}>{t("result.cta")}</Button>
          </div>
        </Card>
      ) : null}

      {step === "contact" ? (
        <Card className="space-y-4">
          <div className="text-sm font-semibold">{t("contact.title")}</div>

          {identity.loading ? <InfoBox title={common("session")} variant="info">{common("checkingSession")}</InfoBox> : null}

          {!identity.loading && identity.loggedIn ? (
            <InfoBox title={common("authenticated")} variant="info">
              {common("reuseIdentity", { email: identity.email })}
            </InfoBox>
          ) : null}

          {!identity.loading && !identity.loggedIn ? (
            <div className="grid gap-3 md:grid-cols-2">
              <input
                placeholder={common("fullName")}
                value={contact.fullName}
                onChange={(e) => setContact((prev) => ({ ...prev, fullName: e.target.value }))}
                className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm"
              />
              <input
                placeholder={common("email")}
                value={contact.email}
                onChange={(e) => setContact((prev) => ({ ...prev, email: e.target.value }))}
                className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm"
              />
              <input
                placeholder={common("phone")}
                value={contact.phone ?? ""}
                onChange={(e) => setContact((prev) => ({ ...prev, phone: e.target.value }))}
                className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm md:col-span-2"
              />
              <label className="md:col-span-2 flex items-center gap-2 rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={contact.consent}
                  onChange={(e) => setContact((prev) => ({ ...prev, consent: e.target.checked }))}
                />
                {common("consent")}
              </label>
            </div>
          ) : null}

          <div className="text-xs text-fh-muted">
            {common("privacyHint")} <Link href="/privacy" className="underline">{common("privacyLink")}</Link>
          </div>

          {error ? <InfoBox title={common("error")} variant="danger">{error}</InfoBox> : null}

          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => setStep("result")}>{common("back")}</Button>
            <Button onClick={() => void persistLeadAndCase()} disabled={busy || identity.loading}>
              {busy ? common("saving") : t("contact.submit")}
            </Button>
          </div>
        </Card>
      ) : null}

      {step === "done" ? (
        <Card className="space-y-3">
          <InfoBox title={t("done.title")} variant="info">
            {t("done.body")}
          </InfoBox>

          {caseId ? (
            <Link
              href={`/app/cases/${caseId}`}
              className="inline-flex rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm hover:bg-fh-surface-2"
            >
              {t("done.openCase", { id: caseId.slice(0, 8) })}
            </Link>
          ) : null}

          {marketingLeadId ? (
            <div className="text-sm text-fh-muted">{t("done.leadCreated", { id: marketingLeadId.slice(0, 8) })}</div>
          ) : null}

          {!identity.loggedIn ? (
            <InfoBox title={common("nextStep")} variant="warning">
              {common("loginToContinue")}
            </InfoBox>
          ) : null}
        </Card>
      ) : null}
    </Screen>
  );
}
