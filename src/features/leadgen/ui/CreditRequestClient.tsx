"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { Button } from "@/ui/components/Button";
import { Card } from "@/ui/components/Card";
import { Header } from "@/ui/components/Header";
import { InfoBox } from "@/ui/components/InfoBox";
import { Screen } from "@/ui/components/Screen";
import { DocumentUploader } from "@/features/documents/ui/DocumentUploader";
import {
  estimateCreditSimulation,
  getDefaultCreditInterestRatePct,
  mapIncomeBand,
} from "./leadgenCalculators";
import {
  createMarketingLead,
  startLeadgenCase,
  submitLeadgenCase,
  type LeadContact,
} from "./leadgenIntakeClient";
import { useLeadIdentity } from "./useLeadIdentity";
import { trackProductEvent } from "@/features/observability/productTelemetry";

function euro(n: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(n);
}

type Step = "calc" | "apply" | "done";

export function CreditRequestClient() {
  const t = useTranslations("leadgen.credit");
  const common = useTranslations("leadgen.common");
  const validationT = useTranslations("leadgen.validation");
  const locale = useLocale();
  const identity = useLeadIdentity();

  const [step, setStep] = useState<Step>("calc");
  const [amount, setAmount] = useState(15_000);
  const [termMonths, setTermMonths] = useState(60);

  const [monthlyIncome, setMonthlyIncome] = useState(3_200);
  const [monthlyExpenses, setMonthlyExpenses] = useState(1_200);
  const [employmentStatus, setEmploymentStatus] = useState<"employed" | "self_employed" | "student" | "unemployed">("employed");
  const [hasPartner, setHasPartner] = useState(false);

  const [contact, setContact] = useState<LeadContact>({
    fullName: "",
    email: "",
    phone: "",
    consent: false,
  });

  const [signatureName, setSignatureName] = useState("");
  const [signatureAccepted, setSignatureAccepted] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [caseId, setCaseId] = useState<string | null>(null);
  const [marketingLeadId, setMarketingLeadId] = useState<string | null>(null);

  const interestRatePct = getDefaultCreditInterestRatePct();

  const simulation = useMemo(() => {
    return estimateCreditSimulation({ amount, termMonths, annualRatePct: interestRatePct });
  }, [amount, termMonths, interestRatePct]);

  function validateLeadContact(): string | null {
    if (identity.loggedIn) return null;
    if (contact.fullName.trim().length < 2) return validationT("fullName");
    if (!contact.email.includes("@") || contact.email.trim().length < 6) return validationT("email");
    if (!contact.consent) return validationT("consent");
    return null;
  }

  async function onStartApplication() {
    if (busy) return;
    setBusy(true);
    setError(null);

    try {
      if (identity.loggedIn) {
        const cid = caseId ?? (await startLeadgenCase("credit"));
        setCaseId(cid);
      }
      setStep("apply");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : common("submitError"));
    } finally {
      setBusy(false);
    }
  }

  async function onSubmitApplication() {
    if (busy) return;
    setBusy(true);
    setError(null);

    try {
      if (!signatureAccepted || signatureName.trim().length < 2) {
        throw new Error(validationT("signature"));
      }

      const contactValidation = validateLeadContact();
      if (contactValidation) throw new Error(contactValidation);

      if (identity.loggedIn) {
        const cid = caseId ?? (await startLeadgenCase("credit"));
        const payload = {
          fullName: identity.fullName || "Authenticated user",
          email: identity.email,
          phone: contact.phone?.trim() || null,
          employmentStatus,
          yearlyIncomeBand: mapIncomeBand(monthlyIncome * 12),
          timelineMonths: termMonths <= 36 ? "0_3" : termMonths <= 72 ? "3_6" : "6_12",
          hasPartner,
          notes: JSON.stringify({
            calculator: "credit_request_v4_fixed_rate",
            amount,
            termMonths,
            annualRatePct: interestRatePct,
            simulation,
            monthlyIncome,
            monthlyExpenses,
            signatureName: signatureName.trim(),
            digitalSignatureAccepted: signatureAccepted,
            process: "no_paperwork_online_fixed_rate",
          }),
          consent: true,
        };
        const saved = await submitLeadgenCase("credit", cid, payload);
        setCaseId(saved);
      } else {
        const leadId = await createMarketingLead({
          contact: {
            fullName: contact.fullName.trim(),
            email: contact.email.trim().toLowerCase(),
            phone: contact.phone?.trim() || "",
            consent: contact.consent,
          },
          interestedIn: ["credit"],
          locale,
        });
        setMarketingLeadId(leadId);
      }

      trackProductEvent("product.leadgen.intake.submit", { route: "/app/credit" });
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

      {step === "calc" ? (
        <Card className="space-y-5">
          <div className="text-sm font-semibold">{t("amountQuestion")}</div>

          <div className="rounded-2xl border border-fh-border bg-fh-surface p-4">
            <label className="text-xs uppercase text-fh-muted">{t("requestedAmount")}</label>
            <input
              type="number"
              min={1000}
              step={500}
              value={amount}
              onChange={(e) => setAmount(Math.max(0, Number(e.target.value) || 0))}
              className="mt-2 w-full rounded-xl border border-fh-border bg-fh-bg px-4 py-4 text-3xl font-semibold"
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-xs uppercase text-fh-muted">{t("termMonths")}</label>
              <input
                type="number"
                min={6}
                max={120}
                value={termMonths}
                onChange={(e) => setTermMonths(Number(e.target.value) || 6)}
                className="mt-1 w-full rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs uppercase text-fh-muted">{t("interestRateUsed")}</label>
              <div className="mt-1 rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm">
                {t("interestRateValue", { rate: interestRatePct })}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4">
            <div className="text-xs uppercase text-fh-muted">{t("simulationTitle")}</div>
            <div className="mt-2 grid gap-2 sm:grid-cols-3 text-sm">
              <div>{t("monthlyInstallment")}: <span className="font-semibold">{euro(simulation.monthlyInstallment)}</span></div>
              <div>{t("totalRepayable")}: <span className="font-semibold">{euro(simulation.totalRepayable)}</span></div>
              <div>{t("totalInterest")}: <span className="font-semibold">{euro(simulation.totalInterest)}</span></div>
            </div>
          </div>

          {error ? <InfoBox title={common("error")} variant="danger">{error}</InfoBox> : null}

          <div className="flex justify-end">
            <Button onClick={() => void onStartApplication()} disabled={busy || amount < 1000}>
              {busy ? common("processing") : t("startFlow")}
            </Button>
          </div>
        </Card>
      ) : null}

      {step === "apply" ? (
        <div className="space-y-4">
          <Card className="space-y-4">
            <div className="text-sm font-semibold">{t("applicationTitle")}</div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="text-xs uppercase text-fh-muted">{t("monthlyIncome")}</label>
                <input
                  type="number"
                  min={0}
                  value={monthlyIncome}
                  onChange={(e) => setMonthlyIncome(Number(e.target.value) || 0)}
                  className="mt-1 w-full rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs uppercase text-fh-muted">{t("monthlyExpenses")}</label>
                <input
                  type="number"
                  min={0}
                  value={monthlyExpenses}
                  onChange={(e) => setMonthlyExpenses(Number(e.target.value) || 0)}
                  className="mt-1 w-full rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs uppercase text-fh-muted">{t("employmentStatus")}</label>
                <select
                  value={employmentStatus}
                  onChange={(e) => setEmploymentStatus(e.target.value as typeof employmentStatus)}
                  className="mt-1 w-full rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm"
                >
                  <option value="employed">{t("employment.employed")}</option>
                  <option value="self_employed">{t("employment.selfEmployed")}</option>
                  <option value="student">{t("employment.student")}</option>
                  <option value="unemployed">{t("employment.unemployed")}</option>
                </select>
              </div>
              <label className="mt-6 flex items-center gap-2 rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={hasPartner}
                  onChange={(e) => setHasPartner(e.target.checked)}
                />
                {t("hasPartner")}
              </label>
            </div>

            {!identity.loading && !identity.loggedIn ? (
              <div className="grid gap-3 rounded-xl border border-fh-border bg-fh-surface p-3 md:grid-cols-2">
                <input
                  placeholder={common("fullName")}
                  value={contact.fullName}
                  onChange={(e) => setContact((prev) => ({ ...prev, fullName: e.target.value }))}
                  className="rounded-xl border border-fh-border bg-fh-bg px-3 py-2 text-sm"
                />
                <input
                  placeholder={common("email")}
                  value={contact.email}
                  onChange={(e) => setContact((prev) => ({ ...prev, email: e.target.value }))}
                  className="rounded-xl border border-fh-border bg-fh-bg px-3 py-2 text-sm"
                />
                <input
                  placeholder={common("phone")}
                  value={contact.phone ?? ""}
                  onChange={(e) => setContact((prev) => ({ ...prev, phone: e.target.value }))}
                  className="rounded-xl border border-fh-border bg-fh-bg px-3 py-2 text-sm md:col-span-2"
                />
                <label className="md:col-span-2 flex items-center gap-2 text-sm text-fh-muted">
                  <input
                    type="checkbox"
                    checked={contact.consent}
                    onChange={(e) => setContact((prev) => ({ ...prev, consent: e.target.checked }))}
                  />
                  {common("consent")}
                </label>
              </div>
            ) : null}

            {!identity.loading && identity.loggedIn ? (
              <InfoBox title={common("authenticated")} variant="info">
                {common("reuseIdentity", { email: identity.email })}
              </InfoBox>
            ) : null}

            <div className="rounded-xl border border-fh-border bg-fh-surface p-3">
              <div className="text-sm font-medium">{t("signature.title")}</div>
              <div className="mt-2 grid gap-3 md:grid-cols-2">
                <input
                  placeholder={t("signature.namePlaceholder")}
                  value={signatureName}
                  onChange={(e) => setSignatureName(e.target.value)}
                  className="rounded-xl border border-fh-border bg-fh-bg px-3 py-2 text-sm"
                />
                <label className="flex items-center gap-2 rounded-xl border border-fh-border bg-fh-bg px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={signatureAccepted}
                    onChange={(e) => setSignatureAccepted(e.target.checked)}
                  />
                  {t("signature.accept")}
                </label>
              </div>
            </div>

            <div className="text-xs text-fh-muted">
              {t("disclaimer")} <Link href="/privacy" className="underline">{common("privacyLink")}</Link>
            </div>

            {error ? <InfoBox title={common("error")} variant="danger">{error}</InfoBox> : null}

            <div className="flex items-center justify-between">
              <Button variant="ghost" onClick={() => setStep("calc")}>{common("back")}</Button>
              <Button onClick={() => void onSubmitApplication()} disabled={busy || identity.loading}>
                {busy ? common("submitting") : t("submit")}
              </Button>
            </div>
          </Card>

          {identity.loggedIn && caseId ? (
            <DocumentUploader caseId={caseId} />
          ) : (
            <InfoBox title={t("documents.title")} variant="warning">
              {t("documents.loginRequired")}
            </InfoBox>
          )}
        </div>
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
        </Card>
      ) : null}
    </Screen>
  );
}
