"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";

import type { CaseDetail } from "@/features/cases/casesTypes";
import { DocumentUploader } from "@/features/documents/ui/DocumentUploader";
import { Button } from "@/ui/components/Button";
import { Card } from "@/ui/components/Card";
import { Header } from "@/ui/components/Header";
import { InfoBox } from "@/ui/components/InfoBox";
import { Input } from "@/ui/components/Input";
import { Screen } from "@/ui/components/Screen";

type WizardStep =
  | "intro"
  | "profile"
  | "fiscal"
  | "housing"
  | "income"
  | "other"
  | "deductions"
  | "result"
  | "checkout"
  | "authorization"
  | "documents"
  | "final";

type TaxesForm = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  consent: boolean;
  fiscalYear: number;
  hasPartner: boolean;
  hasChildren: boolean;
  homeOwnership: "owner" | "tenant";
  mortgageInterestPaid: number | null;
  employmentIncomeSource: "upload" | "manual";
  annualEmploymentIncome: number | null;
  hasBox3: boolean;
  box3Amount: number | null;
  wantsTaxCreditsReview: boolean;
  notes: string;
};

type TaxesBootstrapResponse = {
  ok: boolean;
  case: CaseDetail | null;
  intake?: Partial<TaxesForm> | null;
  error?: string;
};

type AuthorizationStatus =
  | "request_initiated"
  | "waiting_letter"
  | "letter_received"
  | "activation_code_captured"
  | "active_user_confirmed";

const DEFAULT_FORM: TaxesForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  consent: false,
  fiscalYear: new Date().getFullYear() - 1,
  hasPartner: false,
  hasChildren: false,
  homeOwnership: "tenant",
  mortgageInterestPaid: null,
  employmentIncomeSource: "upload",
  annualEmploymentIncome: null,
  hasBox3: false,
  box3Amount: null,
  wantsTaxCreditsReview: true,
  notes: "",
};

const STEPS: WizardStep[] = [
  "intro",
  "profile",
  "fiscal",
  "housing",
  "income",
  "other",
  "deductions",
  "result",
  "checkout",
  "authorization",
  "documents",
  "final",
];

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function isValidPhone(phone: string): boolean {
  return /^[+()\-\s\d]{7,}$/.test(phone.trim());
}

function parseNumber(input: string): number | null {
  const value = Number(input);
  return Number.isFinite(value) ? value : null;
}

export function TaxesIntakeClient() {
  const t = useTranslations("taxes");
  const [step, setStep] = useState<WizardStep>("intro");
  const [form, setForm] = useState<TaxesForm>(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [caseDetail, setCaseDetail] = useState<CaseDetail | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthorizationStatus>("request_initiated");
  const [activationCode, setActivationCode] = useState("");

  const currentIndex = STEPS.indexOf(step);
  const progress = Math.round(((currentIndex + 1) / STEPS.length) * 100);

  const requiresMortgageDoc = form.homeOwnership === "owner" && form.mortgageInterestPaid === null;
  const canContinueProfile =
    form.firstName.trim().length > 1 &&
    form.lastName.trim().length > 1 &&
    isValidEmail(form.email) &&
    isValidPhone(form.phone) &&
    form.consent;

  async function loadBootstrap() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/taxes/intake", { method: "GET" });
      const json = (await res.json().catch(() => null)) as TaxesBootstrapResponse | null;
      if (!res.ok || !json?.ok) throw new Error(json?.error ?? t("errors.load"));
      setCaseDetail(json.case ?? null);
      if (json.intake) {
        const intake = json.intake;
        setForm((prev) => ({
          ...prev,
          ...intake,
          notes: typeof intake.notes === "string" ? intake.notes : prev.notes,
        }));
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("errors.load"));
    } finally {
      setLoading(false);
    }
  }

  async function saveIntake() {
    if (busy) return;
    setBusy(true);
    setError(null);

    try {
      const payload = {
        ...form,
        notes: form.notes.trim() || null,
      };
      const res = await fetch("/api/taxes/intake", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; case?: CaseDetail; error?: string } | null;
      if (!res.ok || !json?.ok || !json.case) throw new Error(json?.error ?? t("errors.save"));
      setCaseDetail(json.case);
      setSuccess(t("messages.intakeSaved"));
      setStep("result");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("errors.save"));
    } finally {
      setBusy(false);
    }
  }

  async function startCheckout() {
    if (!caseDetail?.id || checkoutBusy) return;
    setCheckoutBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ caseId: caseDetail.id, productKey: "case_unlock" }),
      });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; url?: string; error?: string } | null;
      if (!res.ok || !json?.ok || !json.url) throw new Error(json?.error ?? t("errors.checkout"));
      window.location.href = json.url;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("errors.checkout"));
      setCheckoutBusy(false);
    }
  }

  async function saveAuthorization(nextStatus: AuthorizationStatus) {
    if (!caseDetail?.id) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/taxes/authorization", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          taxYear: form.fiscalYear,
          authorizationStatus: nextStatus,
          activationCode: activationCode.trim() || null,
        }),
      });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!res.ok || !json?.ok) throw new Error(json?.error ?? t("errors.authorization"));
      setAuthStatus(nextStatus);
      setSuccess(t("messages.authorizationSaved"));
      if (nextStatus === "active_user_confirmed") setStep("documents");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("errors.authorization"));
    } finally {
      setBusy(false);
    }
  }

  function go(next: WizardStep) {
    setError(null);
    setSuccess(null);
    setStep(next);
  }

  return (
    <Screen className="space-y-6">
      <Header
        title={t("title")}
        subtitle={t("subtitle")}
        right={<Button variant="secondary" onClick={() => void loadBootstrap()} disabled={loading}>{loading ? t("actions.loading") : t("actions.refresh")}</Button>}
      />

      <Card className="space-y-2">
        <div className="text-xs uppercase text-fh-muted">{t("progress")}</div>
        <div className="h-2 rounded-full bg-fh-surface-2"><div className="h-2 rounded-full bg-fh-primary" style={{ width: `${progress}%` }} /></div>
        <div className="text-xs text-fh-muted">{t("stepOf", { current: currentIndex + 1, total: STEPS.length })}</div>
      </Card>

      {error ? <InfoBox title={t("errors.title")} variant="danger">{error}</InfoBox> : null}
      {success ? <InfoBox title={t("messages.title")} variant="info">{success}</InfoBox> : null}

      {step === "intro" ? (
        <Card className="space-y-4">
          <div className="text-sm font-semibold">{t("intro.title")}</div>
          <p className="text-sm text-fh-muted">{t("intro.body")}</p>
          <div className="space-y-1 text-sm text-fh-muted">
            <div>- {t("intro.need1")}</div>
            <div>- {t("intro.need2")}</div>
            <div>- {t("intro.need3")}</div>
          </div>
          <Button onClick={() => go("profile")}>{t("actions.start")}</Button>
        </Card>
      ) : null}

      {step === "profile" ? (
        <Card className="space-y-4">
          <div className="text-sm font-semibold">{t("profile.title")}</div>
          <div className="grid gap-3 md:grid-cols-2">
            <Input value={form.firstName} onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))} label={t("profile.firstName")} />
            <Input value={form.lastName} onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))} label={t("profile.lastName")} />
            <Input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} label={t("profile.email")} />
            <Input type="tel" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} label={t("profile.phone")} />
          </div>
          <label className="flex items-center gap-2 rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm">
            <input type="checkbox" checked={form.consent} onChange={(e) => setForm((p) => ({ ...p, consent: e.target.checked }))} />
            {t("profile.consent")}
          </label>
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => go("intro")}>{t("actions.back")}</Button>
            <Button onClick={() => go("fiscal")} disabled={!canContinueProfile}>{t("actions.continue")}</Button>
          </div>
        </Card>
      ) : null}

      {step === "fiscal" ? (
        <Card className="space-y-4">
          <div className="text-sm font-semibold">{t("fiscal.title")}</div>
          <div className="grid gap-3 md:grid-cols-3">
            <Input type="number" value={String(form.fiscalYear)} onChange={(e) => setForm((p) => ({ ...p, fiscalYear: Number(e.target.value) || p.fiscalYear }))} label={t("fiscal.year")} />
            <label className="flex items-center gap-2 rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm"><input type="checkbox" checked={form.hasPartner} onChange={(e) => setForm((p) => ({ ...p, hasPartner: e.target.checked }))} />{t("fiscal.hasPartner")}</label>
            <label className="flex items-center gap-2 rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm"><input type="checkbox" checked={form.hasChildren} onChange={(e) => setForm((p) => ({ ...p, hasChildren: e.target.checked }))} />{t("fiscal.hasChildren")}</label>
          </div>
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => go("profile")}>{t("actions.back")}</Button>
            <Button onClick={() => go("housing")}>{t("actions.continue")}</Button>
          </div>
        </Card>
      ) : null}

      {step === "housing" ? (
        <Card className="space-y-4">
          <div className="text-sm font-semibold">{t("housing.title")}</div>
          <div className="inline-flex rounded-xl border border-fh-border bg-fh-surface p-1">
            {(["tenant", "owner"] as const).map((value) => (
              <button key={value} type="button" className={`rounded-lg px-3 py-1 text-sm ${form.homeOwnership === value ? "bg-fh-primary text-fh-primaryFg" : "text-fh-muted"}`} onClick={() => setForm((p) => ({ ...p, homeOwnership: value }))}>
                {value === "owner" ? t("housing.owner") : t("housing.tenant")}
              </button>
            ))}
          </div>

          {form.homeOwnership === "owner" ? (
            <Input
              type="number"
              value={form.mortgageInterestPaid === null ? "" : String(form.mortgageInterestPaid)}
              onChange={(e) => setForm((p) => ({ ...p, mortgageInterestPaid: parseNumber(e.target.value) }))}
              label={t("housing.mortgageInterestPaid")}
              hint={t("housing.mortgageHint")}
            />
          ) : null}

          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => go("fiscal")}>{t("actions.back")}</Button>
            <Button onClick={() => go("income")}>{t("actions.continue")}</Button>
          </div>
        </Card>
      ) : null}

      {step === "income" ? (
        <Card className="space-y-4">
          <div className="text-sm font-semibold">{t("income.title")}</div>
          <div className="inline-flex rounded-xl border border-fh-border bg-fh-surface p-1">
            {(["upload", "manual"] as const).map((value) => (
              <button key={value} type="button" className={`rounded-lg px-3 py-1 text-sm ${form.employmentIncomeSource === value ? "bg-fh-primary text-fh-primaryFg" : "text-fh-muted"}`} onClick={() => setForm((p) => ({ ...p, employmentIncomeSource: value }))}>
                {value === "upload" ? t("income.upload") : t("income.manual")}
              </button>
            ))}
          </div>
          {form.employmentIncomeSource === "manual" ? (
            <Input type="number" value={form.annualEmploymentIncome === null ? "" : String(form.annualEmploymentIncome)} onChange={(e) => setForm((p) => ({ ...p, annualEmploymentIncome: parseNumber(e.target.value) }))} label={t("income.annualIncome")} />
          ) : (
            <InfoBox title={t("income.uploadInfoTitle")} variant="info">{t("income.uploadInfoBody")}</InfoBox>
          )}

          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => go("housing")}>{t("actions.back")}</Button>
            <Button onClick={() => go("other")}>{t("actions.continue")}</Button>
          </div>
        </Card>
      ) : null}

      {step === "other" ? (
        <Card className="space-y-4">
          <div className="text-sm font-semibold">{t("other.title")}</div>
          <label className="flex items-center gap-2 rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm"><input type="checkbox" checked={form.hasBox3} onChange={(e) => setForm((p) => ({ ...p, hasBox3: e.target.checked }))} />{t("other.hasBox3")}</label>
          {form.hasBox3 ? (
            <Input type="number" value={form.box3Amount === null ? "" : String(form.box3Amount)} onChange={(e) => setForm((p) => ({ ...p, box3Amount: parseNumber(e.target.value) }))} label={t("other.box3Amount")} />
          ) : null}
          <InfoBox title={t("other.todoTitle")} variant="warning">{t("other.todoBody")}</InfoBox>
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => go("income")}>{t("actions.back")}</Button>
            <Button onClick={() => go("deductions")}>{t("actions.continue")}</Button>
          </div>
        </Card>
      ) : null}

      {step === "deductions" ? (
        <Card className="space-y-4">
          <div className="text-sm font-semibold">{t("deductions.title")}</div>
          <label className="flex items-center gap-2 rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm"><input type="checkbox" checked={form.wantsTaxCreditsReview} onChange={(e) => setForm((p) => ({ ...p, wantsTaxCreditsReview: e.target.checked }))} />{t("deductions.review")}</label>
          <Input value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} label={t("deductions.notes")} />

          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => go("other")}>{t("actions.back")}</Button>
            <Button onClick={() => void saveIntake()} disabled={busy}>{busy ? t("actions.saving") : t("actions.continue")}</Button>
          </div>
        </Card>
      ) : null}

      {step === "result" ? (
        <Card className="space-y-4">
          <div className="text-sm font-semibold">{t("result.title")}</div>
          <InfoBox title={t("result.estimateTitle")} variant="warning">{t("result.estimateBody")}</InfoBox>
          <div className="text-xs text-fh-muted">{t("result.missingData", { needsMortgage: requiresMortgageDoc ? t("common.yes") : t("common.no") })}</div>
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => go("deductions")}>{t("actions.back")}</Button>
            <Button onClick={() => go("checkout")} disabled={!caseDetail}>{t("result.cta")}</Button>
          </div>
        </Card>
      ) : null}

      {step === "checkout" ? (
        <Card className="space-y-4">
          <div className="text-sm font-semibold">{t("checkout.title")}</div>
          <p className="text-sm text-fh-muted">{t("checkout.body")}</p>
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => go("result")}>{t("actions.back")}</Button>
            <Button onClick={() => void startCheckout()} disabled={!caseDetail || checkoutBusy}>{checkoutBusy ? t("actions.processing") : t("checkout.pay")}</Button>
          </div>
          <Button variant="secondary" onClick={() => go("authorization")}>{t("checkout.skipToAuthorization")}</Button>
        </Card>
      ) : null}

      {step === "authorization" ? (
        <Card className="space-y-4">
          <div className="text-sm font-semibold">{t("authorization.title")}</div>
          <InfoBox title={t("authorization.officialTitle")} variant="info">
            {t("authorization.officialBody")}
          </InfoBox>
          <div className="space-y-1 text-sm text-fh-muted">
            <div>1. {t("authorization.step1")}</div>
            <div>2. {t("authorization.step2")}</div>
            <div>3. {t("authorization.step3")}</div>
          </div>

          <Input value={activationCode} onChange={(e) => setActivationCode(e.target.value)} label={t("authorization.activationCode")} hint={t("authorization.activationHint")} />

          <div className="grid gap-2 md:grid-cols-2">
            <Button variant="secondary" onClick={() => void saveAuthorization("waiting_letter")} disabled={busy}>{t("authorization.markWaiting")}</Button>
            <Button variant="secondary" onClick={() => void saveAuthorization("letter_received")} disabled={busy}>{t("authorization.markLetterReceived")}</Button>
            <Button variant="secondary" onClick={() => void saveAuthorization("activation_code_captured")} disabled={busy}>{t("authorization.markCodeCaptured")}</Button>
            <Button onClick={() => void saveAuthorization("active_user_confirmed")} disabled={busy || authStatus === "active_user_confirmed"}>{t("authorization.markActive")}</Button>
          </div>

          <div className="text-xs text-fh-muted">{t("authorization.currentStatus", { status: authStatus })}</div>

          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => go("checkout")}>{t("actions.back")}</Button>
            <Button onClick={() => go("documents")}>{t("actions.continue")}</Button>
          </div>
        </Card>
      ) : null}

      {step === "documents" ? (
        <Card className="space-y-4">
          <div className="text-sm font-semibold">{t("documents.title")}</div>
          <p className="text-sm text-fh-muted">{t("documents.body")}</p>

          {caseDetail ? <DocumentUploader caseId={caseDetail.id} /> : <InfoBox title={t("errors.title")} variant="warning">{t("documents.noCase")}</InfoBox>}

          {caseDetail?.tasks?.length ? (
            <div className="space-y-2">
              {caseDetail.tasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm">
                  <span>{task.title}</span>
                  <span className="text-xs text-fh-muted">{task.status}</span>
                </div>
              ))}
            </div>
          ) : null}

          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => go("authorization")}>{t("actions.back")}</Button>
            <Button onClick={() => go("final")}>{t("actions.finish")}</Button>
          </div>
        </Card>
      ) : null}

      {step === "final" ? (
        <Card className="space-y-4">
          <div className="text-sm font-semibold">{t("final.title")}</div>
          <InfoBox title={t("final.pipelineTitle")} variant="info">{t("final.pipelineBody")}</InfoBox>
          {caseDetail ? (
            <Link href={`/app/cases/${caseDetail.id}`} className="inline-flex rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm hover:bg-fh-surface-2">
              {t("final.openCase")}
            </Link>
          ) : null}
        </Card>
      ) : null}
    </Screen>
  );
}
