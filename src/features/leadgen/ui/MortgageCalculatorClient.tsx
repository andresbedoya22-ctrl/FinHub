"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { Button } from "@/ui/components/Button";
import { Card } from "@/ui/components/Card";
import { Header } from "@/ui/components/Header";
import { InfoBox } from "@/ui/components/InfoBox";
import { Input } from "@/ui/components/Input";
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
} from "./leadgenIntakeClient";
import { useLeadIdentity } from "./useLeadIdentity";
import { trackProductEvent } from "@/features/observability/productTelemetry";

type WizardStep = "buyers" | "buyers_data" | "lead_gate" | "result" | "done";
type TimelineValue = "0_3" | "3_6" | "6_12" | "12_plus";
export const MORTGAGE_BUYER_OPTIONS = [1, 2, 3, 4] as const;
export const INITIAL_MORTGAGE_STEP: WizardStep = "buyers";

type MortgageLeadContact = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  consent: boolean;
};

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

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function isValidPhone(phone: string): boolean {
  return /^[+()\-\s\d]{7,}$/.test(phone.trim());
}

export function validateMortgageLeadGateContact(input: MortgageLeadContact): Partial<Record<keyof MortgageLeadContact, string>> {
  const nextErrors: Partial<Record<keyof MortgageLeadContact, string>> = {};
  if (input.firstName.trim().length < 2) nextErrors.firstName = "firstName";
  if (input.lastName.trim().length < 2) nextErrors.lastName = "lastName";
  if (!isValidEmail(input.email)) nextErrors.email = "email";
  if (!isValidPhone(input.phone)) nextErrors.phone = "phone";
  if (!input.consent) nextErrors.consent = "consent";
  return nextErrors;
}

export function canProceedFromMortgageStep1(input: { buyersCountTouched: boolean; buyersCount: number }): boolean {
  return input.buyersCountTouched && Number.isInteger(input.buyersCount) && input.buyersCount >= 1 && input.buyersCount <= 4;
}

export function MortgageCalculatorClient() {
  const t = useTranslations("leadgen.mortgage");
  const common = useTranslations("leadgen.common");
  const validationT = useTranslations("leadgen.validation");
  const locale = useLocale();
  const identity = useLeadIdentity();

  const [step, setStep] = useState<WizardStep>(INITIAL_MORTGAGE_STEP);
  const [buyersCount, setBuyersCount] = useState(1);
  const [buyersCountTouched, setBuyersCountTouched] = useState(false);
  const [activeBuyerIdx, setActiveBuyerIdx] = useState(0);
  const [buyers, setBuyers] = useState<MortgageBuyerInput[]>([buildEmptyBuyer()]);
  const [hasOwnFunds, setHasOwnFunds] = useState(true);
  const [timelineMonths, setTimelineMonths] = useState<TimelineValue>("3_6");

  const [contact, setContact] = useState<MortgageLeadContact>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    consent: false,
  });
  const [contactErrors, setContactErrors] = useState<Partial<Record<keyof MortgageLeadContact, string>>>({});

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [caseId, setCaseId] = useState<string | null>(null);
  const [marketingLeadId, setMarketingLeadId] = useState<string | null>(null);

  const estimate = useMemo(() => estimateMortgageCapacity(buyers.slice(0, buyersCount), hasOwnFunds), [buyers, buyersCount, hasOwnFunds]);

  const requiresLeadGate = !identity.loggedIn;

  const wizardProgress = useMemo(() => {
    const total = buyersCount + (requiresLeadGate ? 4 : 3);
    const current =
      step === "buyers" ? 1 :
      step === "buyers_data" ? 2 + activeBuyerIdx :
      step === "lead_gate" ? 2 + buyersCount :
      step === "result" ? 3 + buyersCount :
      total;
    return { current, total };
  }, [activeBuyerIdx, buyersCount, requiresLeadGate, step]);

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
    if (!canContinueBuyerData(activeBuyerIdx) || identity.loading) return;
    if (activeBuyerIdx + 1 < buyersCount) {
      setActiveBuyerIdx((v) => v + 1);
      return;
    }

    setStep(requiresLeadGate ? "lead_gate" : "result");
  }

  function backFromBuyerData() {
    if (activeBuyerIdx > 0) {
      setActiveBuyerIdx((v) => v - 1);
      return;
    }
    setStep("buyers");
  }

  function validateGateContact(): boolean {
    if (identity.loggedIn) return true;

    const baseErrors = validateMortgageLeadGateContact(contact);
    const nextErrors: Partial<Record<keyof MortgageLeadContact, string>> = {};
    for (const [k, code] of Object.entries(baseErrors)) {
      nextErrors[k as keyof MortgageLeadContact] = validationT(code as "firstName" | "lastName" | "email" | "phone" | "consent");
    }

    setContactErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function goToResultFromGate() {
    if (!validateGateContact()) return;
    setStep("result");
  }

  async function persistLeadAndCase() {
    if (busy) return;
    setBusy(true);
    setError(null);

    try {
      const annualIncome = estimate.annualHouseholdIncome;
      const selectedBuyers = buyers.slice(0, buyersCount);
      const employmentStatus = selectedBuyers.some((b) => b.selfEmployed) ? "self_employed" : "employed";

      if (!identity.loggedIn && !validateGateContact()) {
        throw new Error(common("submitError"));
      }

      if (identity.loggedIn) {
        const cid = caseId ?? (await startLeadgenCase("mortgage"));
        const payload = {
          fullName: identity.fullName || "Authenticated user",
          email: identity.email,
          phone: null,
          employmentStatus,
          yearlyIncomeBand: mapIncomeBand(annualIncome),
          timelineMonths,
          hasPartner: buyersCount > 1,
          notes: JSON.stringify({
            calculator: "mortgage_multi_step_v5",
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
            fullName: `${contact.firstName.trim()} ${contact.lastName.trim()}`.trim(),
            email: contact.email.trim().toLowerCase(),
            phone: contact.phone.trim(),
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
            {MORTGAGE_BUYER_OPTIONS.map((count) => (
              <button
                key={count}
                type="button"
                onClick={() => {
                  setBuyersCountTouched(true);
                  setBuyersCount(count);
                  ensureBuyerRows(count);
                }}
                className={`rounded-xl border px-3 py-3 text-sm font-semibold ${buyersCount === count ? "border-fh-primary bg-fh-primary/10" : "border-fh-border bg-fh-surface"}`}
                aria-pressed={buyersCount === count}
              >
                {count}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-end">
            <Button
              onClick={() => {
                if (!canProceedFromMortgageStep1({ buyersCountTouched, buyersCount })) return;
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
            <Input
              type="number"
              min={0}
              value={activeBuyer.grossIncome}
              onChange={(e) => updateBuyer(activeBuyerIdx, { grossIncome: Number(e.target.value) || 0 })}
              label={t("buyers.grossIncome")}
              containerClassName="space-y-1 md:col-span-2"
            />

            <div className="space-y-2">
              <label className="text-xs uppercase text-fh-muted">{t("buyers.incomePeriod")}</label>
              <div className="inline-flex rounded-xl border border-fh-border bg-fh-surface p-1">
                {(["monthly", "annual"] as const).map((period) => (
                  <button
                    key={period}
                    type="button"
                    onClick={() => updateBuyer(activeBuyerIdx, { incomePeriod: period })}
                    className={`rounded-lg px-3 py-1 text-xs ${activeBuyer.incomePeriod === period ? "bg-fh-primary text-fh-primaryFg" : "text-fh-muted"}`}
                    aria-pressed={activeBuyer.incomePeriod === period}
                  >
                    {period === "monthly" ? t("buyers.monthly") : t("buyers.annual")}
                  </button>
                ))}
              </div>
            </div>

            <Input
              type="date"
              value={activeBuyer.birthDate}
              onChange={(e) => updateBuyer(activeBuyerIdx, { birthDate: e.target.value })}
              label={t("buyers.birthDate")}
            />

            <div className="space-y-2">
              <label className="text-xs uppercase text-fh-muted">{t("buyers.hasCompany")}</label>
              <div className="inline-flex rounded-xl border border-fh-border bg-fh-surface p-1">
                {[false, true].map((flag) => (
                  <button
                    key={String(flag)}
                    type="button"
                    onClick={() => updateBuyer(activeBuyerIdx, { selfEmployed: flag })}
                    className={`rounded-lg px-3 py-1 text-xs ${activeBuyer.selfEmployed === flag ? "bg-fh-primary text-fh-primaryFg" : "text-fh-muted"}`}
                    aria-pressed={activeBuyer.selfEmployed === flag}
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

          {identity.loading ? <InfoBox title={common("session")} variant="info">{common("checkingSession")}</InfoBox> : null}

          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={backFromBuyerData}>{common("back")}</Button>
            <Button onClick={nextFromBuyerData} disabled={!canContinueBuyerData(activeBuyerIdx) || identity.loading}>{common("next")}</Button>
          </div>
        </Card>
      ) : null}

      {step === "lead_gate" ? (
        <Card className="space-y-4">
          <div>
            <div className="text-sm font-semibold">{t("leadGate.title")}</div>
            <div className="mt-1 text-sm text-fh-muted">{t("leadGate.subtitle")}</div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Input
              value={contact.firstName}
              onChange={(e) => setContact((prev) => ({ ...prev, firstName: e.target.value }))}
              label={common("firstName")}
              error={contactErrors.firstName}
              autoComplete="given-name"
            />
            <Input
              value={contact.lastName}
              onChange={(e) => setContact((prev) => ({ ...prev, lastName: e.target.value }))}
              label={common("lastName")}
              error={contactErrors.lastName}
              autoComplete="family-name"
            />
            <Input
              type="email"
              value={contact.email}
              onChange={(e) => setContact((prev) => ({ ...prev, email: e.target.value }))}
              label={common("email")}
              error={contactErrors.email}
              autoComplete="email"
            />
            <Input
              type="tel"
              value={contact.phone}
              onChange={(e) => setContact((prev) => ({ ...prev, phone: e.target.value }))}
              label={common("phone")}
              error={contactErrors.phone}
              autoComplete="tel"
            />
          </div>

          <label className="flex items-center gap-2 rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={contact.consent}
              onChange={(e) => setContact((prev) => ({ ...prev, consent: e.target.checked }))}
            />
            {common("consent")}
          </label>
          {contactErrors.consent ? <div className="text-xs text-fh-danger">{contactErrors.consent}</div> : null}

          <div className="text-xs text-fh-muted">
            {common("privacyHint")} <Link href="/privacy" className="underline">{common("privacyLink")}</Link>
          </div>

          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => setStep("buyers_data")}>{common("back")}</Button>
            <Button onClick={goToResultFromGate}>{t("leadGate.cta")}</Button>
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

          {error ? <InfoBox title={common("error")} variant="danger">{error}</InfoBox> : null}

          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => setStep(requiresLeadGate ? "lead_gate" : "buyers_data")}>{common("back")}</Button>
            <Button onClick={() => void persistLeadAndCase()} disabled={busy || identity.loading}>
              {busy ? common("saving") : t("result.cta")}
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
