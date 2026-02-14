"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { Button } from "@/ui/components/Button";
import { Card } from "@/ui/components/Card";
import { Header } from "@/ui/components/Header";
import { InfoBox } from "@/ui/components/InfoBox";
import { Input } from "@/ui/components/Input";
import { Screen } from "@/ui/components/Screen";
import {
  estimateCreditSimulation,
  getDefaultCreditInterestRatePct,
  mapIncomeBand,
} from "./leadgenCalculators";
import {
  createMarketingLead,
  startLeadgenCase,
  submitLeadgenCase,
} from "./leadgenIntakeClient";
import { useLeadIdentity } from "./useLeadIdentity";
import { trackProductEvent } from "@/features/observability/productTelemetry";

type Step = "amount" | "gate" | "income" | "result";

type CreditLeadContact = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  consent: boolean;
};

function euro(n: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(n);
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function isValidPhone(phone: string): boolean {
  return /^[+()\-\s\d]{7,}$/.test(phone.trim());
}

function estimatedMaxPrincipal(monthlyInstallment: number, termMonths: number, annualRatePct: number): number {
  const rate = annualRatePct / 12 / 100;
  if (monthlyInstallment <= 0) return 0;
  if (rate <= 0) return monthlyInstallment * termMonths;
  return monthlyInstallment * ((1 - Math.pow(1 + rate, -termMonths)) / rate);
}

export function CreditRequestClient() {
  const t = useTranslations("leadgen.credit");
  const common = useTranslations("leadgen.common");
  const validationT = useTranslations("leadgen.validation");
  const locale = useLocale();
  const identity = useLeadIdentity();

  const [step, setStep] = useState<Step>("amount");
  const [amount, setAmount] = useState(15_000);
  const [termMonths, setTermMonths] = useState(60);

  const [hasPartner, setHasPartner] = useState(false);
  const [monthlyIncome, setMonthlyIncome] = useState(3_200);
  const [partnerMonthlyIncome, setPartnerMonthlyIncome] = useState(0);

  const [contact, setContact] = useState<CreditLeadContact>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    consent: false,
  });
  const [contactErrors, setContactErrors] = useState<Partial<Record<keyof CreditLeadContact, string>>>({});

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [caseId, setCaseId] = useState<string | null>(null);
  const [marketingLeadId, setMarketingLeadId] = useState<string | null>(null);

  const interestRatePct = getDefaultCreditInterestRatePct();

  const requestedSimulation = useMemo(() => {
    return estimateCreditSimulation({ amount, termMonths, annualRatePct: interestRatePct });
  }, [amount, termMonths, interestRatePct]);

  const totalIncome = monthlyIncome + (hasPartner ? partnerMonthlyIncome : 0);
  const maxAffordableInstallment = Math.max(0, totalIncome * 0.35);

  const affordability = useMemo(() => {
    const maxAmount = estimatedMaxPrincipal(maxAffordableInstallment, termMonths, interestRatePct);
    const estimatedMax = estimateCreditSimulation({
      amount: maxAmount,
      termMonths,
      annualRatePct: interestRatePct,
    });

    const canApply = requestedSimulation.monthlyInstallment <= maxAffordableInstallment;

    return {
      canApply,
      maxAmount,
      estimatedMaxInstallment: estimatedMax.monthlyInstallment,
    };
  }, [interestRatePct, maxAffordableInstallment, requestedSimulation.monthlyInstallment, termMonths]);

  function validateLeadContact(): boolean {
    if (identity.loggedIn) return true;

    const nextErrors: Partial<Record<keyof CreditLeadContact, string>> = {};
    if (contact.firstName.trim().length < 2) nextErrors.firstName = validationT("firstName");
    if (contact.lastName.trim().length < 2) nextErrors.lastName = validationT("lastName");
    if (!isValidEmail(contact.email)) nextErrors.email = validationT("email");
    if (!isValidPhone(contact.phone)) nextErrors.phone = validationT("phone");
    if (!contact.consent) nextErrors.consent = validationT("consent");

    setContactErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function nextFromGate() {
    if (!identity.loggedIn && !validateLeadContact()) return;
    setStep("income");
  }

  async function submitFlow() {
    if (busy) return;
    setBusy(true);
    setError(null);

    try {
      if (!identity.loggedIn && !validateLeadContact()) throw new Error(common("submitError"));

      if (identity.loggedIn) {
        const cid = caseId ?? (await startLeadgenCase("credit"));
        const payload = {
          fullName: identity.fullName || "Authenticated user",
          email: identity.email,
          phone: null,
          employmentStatus: "employed",
          yearlyIncomeBand: mapIncomeBand(totalIncome * 12),
          timelineMonths: termMonths <= 36 ? "0_3" : termMonths <= 72 ? "3_6" : "6_12",
          hasPartner,
          notes: JSON.stringify({
            calculator: "credit_affordability_v2_fixed_5pct",
            amount,
            termMonths,
            annualRatePct: interestRatePct,
            requestedSimulation,
            monthlyIncome,
            partnerMonthlyIncome: hasPartner ? partnerMonthlyIncome : 0,
            maxAffordableInstallment,
            affordability,
          }),
          consent: true,
        };
        const saved = await submitLeadgenCase("credit", cid, payload);
        setCaseId(saved);
      } else {
        const leadId = await createMarketingLead({
          contact: {
            fullName: `${contact.firstName.trim()} ${contact.lastName.trim()}`.trim(),
            email: contact.email.trim().toLowerCase(),
            phone: contact.phone.trim(),
            consent: contact.consent,
          },
          interestedIn: ["credit"],
          locale,
        });
        setMarketingLeadId(leadId);
      }

      trackProductEvent("product.leadgen.intake.submit", { route: "/app/credit" });
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

      {step === "amount" ? (
        <Card className="space-y-5">
          <div className="text-sm font-semibold">{t("amountQuestion")}</div>

          <Input
            type="number"
            min={1000}
            step={500}
            value={amount}
            onChange={(e) => setAmount(Math.max(0, Number(e.target.value) || 0))}
            label={t("requestedAmount")}
            inputClassName="text-3xl font-semibold"
          />

          <div className="grid gap-3 md:grid-cols-2">
            <Input
              type="number"
              min={6}
              max={120}
              value={termMonths}
              onChange={(e) => setTermMonths(Number(e.target.value) || 6)}
              label={t("termMonths")}
            />
            <div>
              <label className="text-xs uppercase text-fh-muted">{t("interestRateUsed")}</label>
              <div className="mt-1 rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm">
                {t("interestRateValue", { rate: interestRatePct })}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4">
            <div className="text-xs uppercase text-fh-muted">{t("simulationTitle")}</div>
            <div className="mt-2 grid gap-2 text-sm sm:grid-cols-3">
              <div>{t("monthlyInstallment")}: <span className="font-semibold">{euro(requestedSimulation.monthlyInstallment)}</span></div>
              <div>{t("totalRepayable")}: <span className="font-semibold">{euro(requestedSimulation.totalRepayable)}</span></div>
              <div>{t("totalInterest")}: <span className="font-semibold">{euro(requestedSimulation.totalInterest)}</span></div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={() => setStep("gate")} disabled={amount < 1000 || identity.loading}>
              {t("startFlow")}
            </Button>
          </div>
        </Card>
      ) : null}

      {step === "gate" ? (
        <Card className="space-y-4">
          <div>
            <div className="text-sm font-semibold">{t("gate.title")}</div>
            <div className="mt-1 text-sm text-fh-muted">{t("gate.subtitle")}</div>
          </div>

          {identity.loading ? <InfoBox title={common("session")} variant="info">{common("checkingSession")}</InfoBox> : null}

          {!identity.loading && !identity.loggedIn ? (
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
          ) : null}

          {!identity.loading && identity.loggedIn ? (
            <InfoBox title={common("authenticated")} variant="info">
              {common("reuseIdentity", { email: identity.email })}
            </InfoBox>
          ) : null}

          {!identity.loading && !identity.loggedIn ? (
            <>
              <label className="flex items-center gap-2 rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={contact.consent}
                  onChange={(e) => setContact((prev) => ({ ...prev, consent: e.target.checked }))}
                />
                {common("consent")}
              </label>
              {contactErrors.consent ? <div className="text-xs text-fh-danger">{contactErrors.consent}</div> : null}
            </>
          ) : null}

          <div className="text-xs text-fh-muted">{t("gate.helper")}</div>

          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => setStep("amount")}>{common("back")}</Button>
            <Button onClick={nextFromGate} disabled={identity.loading}>{t("gate.cta")}</Button>
          </div>
        </Card>
      ) : null}

      {step === "income" ? (
        <Card className="space-y-4">
          <div className="text-sm font-semibold">{t("income.title")}</div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs uppercase text-fh-muted">{t("income.partnerQuestion")}</label>
              <div className="inline-flex rounded-xl border border-fh-border bg-fh-surface p-1">
                {[false, true].map((flag) => (
                  <button
                    key={String(flag)}
                    type="button"
                    onClick={() => setHasPartner(flag)}
                    className={`rounded-lg px-3 py-1 text-xs ${hasPartner === flag ? "bg-fh-primary text-fh-primaryFg" : "text-fh-muted"}`}
                    aria-pressed={hasPartner === flag}
                  >
                    {flag ? common("yes") : common("no")}
                  </button>
                ))}
              </div>
            </div>

            <Input
              type="number"
              min={0}
              value={monthlyIncome}
              onChange={(e) => setMonthlyIncome(Number(e.target.value) || 0)}
              label={t("income.userIncome")}
              hint={t("income.userIncomeHint")}
            />

            {hasPartner ? (
              <Input
                type="number"
                min={0}
                value={partnerMonthlyIncome}
                onChange={(e) => setPartnerMonthlyIncome(Number(e.target.value) || 0)}
                label={t("income.partnerIncome")}
                hint={t("income.partnerIncomeHint")}
              />
            ) : null}
          </div>

          <div className="text-xs text-fh-muted">{t("income.rateNote", { rate: interestRatePct })}</div>

          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => setStep("gate")}>{common("back")}</Button>
            <Button onClick={() => setStep("result")} disabled={monthlyIncome <= 0 || (hasPartner && partnerMonthlyIncome <= 0)}>
              {common("continue")}
            </Button>
          </div>
        </Card>
      ) : null}

      {step === "result" ? (
        <Card className="space-y-4">
          <div className="text-sm font-semibold">{t("result.title")}</div>

          <InfoBox title={affordability.canApply ? t("result.canApply") : t("result.cannotApply")} variant={affordability.canApply ? "info" : "warning"}>
            {t("result.summary")}
          </InfoBox>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-fh-border bg-fh-surface p-3 text-sm">
              <div className="text-xs uppercase text-fh-muted">{t("result.maxEstimated")}</div>
              <div className="mt-1 text-xl font-semibold">{euro(Math.max(0, affordability.maxAmount))}</div>
            </div>
            <div className="rounded-xl border border-fh-border bg-fh-surface p-3 text-sm">
              <div className="text-xs uppercase text-fh-muted">{t("result.requestedInstallment")}</div>
              <div className="mt-1 text-xl font-semibold">{euro(requestedSimulation.monthlyInstallment)}</div>
            </div>
            <div className="rounded-xl border border-fh-border bg-fh-surface p-3 text-sm">
              <div className="text-xs uppercase text-fh-muted">{t("result.maxInstallment")}</div>
              <div className="mt-1 text-xl font-semibold">{euro(affordability.estimatedMaxInstallment)}</div>
            </div>
          </div>

          <div className="rounded-xl border border-fh-border bg-fh-surface p-3 text-sm text-fh-muted">
            {t("result.rateFixed", { rate: interestRatePct })}
          </div>

          {error ? <InfoBox title={common("error")} variant="danger">{error}</InfoBox> : null}
          {marketingLeadId ? <InfoBox title={t("done.title")} variant="info">{t("done.leadCreated", { id: marketingLeadId.slice(0, 8) })}</InfoBox> : null}

          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => setStep("income")}>{common("back")}</Button>
            <Button onClick={() => void submitFlow()} disabled={busy || identity.loading}>
              {busy ? common("submitting") : t("result.submit")}
            </Button>
          </div>

          {caseId ? (
            <div className="text-sm text-fh-muted">{t("done.openCase", { id: caseId.slice(0, 8) })}</div>
          ) : null}
        </Card>
      ) : null}
    </Screen>
  );
}
