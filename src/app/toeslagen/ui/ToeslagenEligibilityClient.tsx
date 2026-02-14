"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/ui/components/Button";
import { Card } from "@/ui/components/Card";
import { InfoBox } from "@/ui/components/InfoBox";
import { Input } from "@/ui/components/Input";
import { Screen } from "@/ui/components/Screen";
import { ToggleGroup } from "@/ui/components/ToggleGroup";
import { evaluateUnifiedToeslagenIntake, type UnifiedToeslagResult } from "@/features/toeslagen/unifiedIntake";
import type { SubsidySlug } from "@/domain/subsidies/types";

type IntakeFormState = {
  livesInNetherlands: string;
  registeredAtAddress: string;
  hasDutchNationalityOrValidPermit: string;
  age: string;
  hasPartner: string;
  incomeSelf: string;
  incomePartner: string;
  assetsHousehold: string;
  highestCoResidentAssets: string;
  rentsIndependentHome: string;
  hasLeaseContract: string;
  paysRentByBankTransfer: string;
  rent: string;
  serviceCosts: string;
  hasBasicInsurance: string;
  childrenCount: string;
  receivesChildBenefit: string;
  childLivesAtRegisteredAddress: string;
  usesRegisteredChildcareProvider: string;
  childcareType: string;
  childcareHoursPerMonth: string;
  childcareCostPerHour: string;
  worksOrStudies: string;
  partnerWorksOrStudies: string;
};

const subsidyOrder: SubsidySlug[] = ["huurtoeslag", "zorgtoeslag", "kgb", "kot"];

function parseNumber(value: string): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function nextLoginUrl(): string {
  return `/login?next=${encodeURIComponent("/toeslagen")}`;
}

export default function ToeslagenIntakeClient() {
  const t = useTranslations("toeslagenIntake");
  const ts = useTranslations("subsidies");

  const [results, setResults] = useState<UnifiedToeslagResult[]>([]);
  const [contractError, setContractError] = useState<string | null>(null);
  const [busySlug, setBusySlug] = useState<SubsidySlug | "bundle" | null>(null);
  const [form, setForm] = useState<IntakeFormState>({
    livesInNetherlands: "yes",
    registeredAtAddress: "yes",
    hasDutchNationalityOrValidPermit: "yes",
    age: "30",
    hasPartner: "no",
    incomeSelf: "24000",
    incomePartner: "0",
    assetsHousehold: "10000",
    highestCoResidentAssets: "0",
    rentsIndependentHome: "yes",
    hasLeaseContract: "yes",
    paysRentByBankTransfer: "yes",
    rent: "700",
    serviceCosts: "40",
    hasBasicInsurance: "yes",
    childrenCount: "1",
    receivesChildBenefit: "yes",
    childLivesAtRegisteredAddress: "yes",
    usesRegisteredChildcareProvider: "yes",
    childcareType: "dagopvang",
    childcareHoursPerMonth: "80",
    childcareCostPerHour: "9",
    worksOrStudies: "yes",
    partnerWorksOrStudies: "yes",
  });

  const orderedResults = useMemo(
    () => [...results].sort((a, b) => subsidyOrder.indexOf(a.slug) - subsidyOrder.indexOf(b.slug)),
    [results]
  );

  const eligibleSlugs = useMemo(
    () => orderedResults.filter((row) => row.eligible).map((row) => row.slug),
    [orderedResults]
  );

  function updateField(name: keyof IntakeFormState, value: string) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function buildIntakeSnapshot() {
    return {
      livesInNetherlands: form.livesInNetherlands === "yes",
      registeredAtAddress: form.registeredAtAddress === "yes",
      hasDutchNationalityOrValidPermit: form.hasDutchNationalityOrValidPermit === "yes",
      age: parseNumber(form.age),
      hasPartner: form.hasPartner === "yes",
      incomeSelf: parseNumber(form.incomeSelf),
      incomePartner: parseNumber(form.incomePartner),
      assetsHousehold: parseNumber(form.assetsHousehold),
      highestCoResidentAssets: parseNumber(form.highestCoResidentAssets),
      rentsIndependentHome: form.rentsIndependentHome === "yes",
      hasLeaseContract: form.hasLeaseContract === "yes",
      paysRentByBankTransfer: form.paysRentByBankTransfer === "yes",
      rent: parseNumber(form.rent),
      serviceCosts: parseNumber(form.serviceCosts),
      hasBasicInsurance: form.hasBasicInsurance === "yes",
      childrenCount: parseNumber(form.childrenCount),
      receivesChildBenefit: form.receivesChildBenefit === "yes",
      childLivesAtRegisteredAddress: form.childLivesAtRegisteredAddress === "yes",
      usesRegisteredChildcareProvider: form.usesRegisteredChildcareProvider === "yes",
      childcareType: (form.childcareType as "dagopvang" | "bso" | "gastouder") ?? null,
      childcareHoursPerMonth: parseNumber(form.childcareHoursPerMonth),
      childcareCostPerHour: parseNumber(form.childcareCostPerHour),
      worksOrStudies: form.worksOrStudies === "yes",
      partnerWorksOrStudies: form.partnerWorksOrStudies === "yes",
    };
  }

  function runEvaluation() {
    setContractError(null);
    setResults(evaluateUnifiedToeslagenIntake(buildIntakeSnapshot()));
  }

  function resetForm() {
    setContractError(null);
    setBusySlug(null);
    setResults([]);
    setForm({
      livesInNetherlands: "yes",
      registeredAtAddress: "yes",
      hasDutchNationalityOrValidPermit: "yes",
      age: "30",
      hasPartner: "no",
      incomeSelf: "24000",
      incomePartner: "0",
      assetsHousehold: "10000",
      highestCoResidentAssets: "0",
      rentsIndependentHome: "yes",
      hasLeaseContract: "yes",
      paysRentByBankTransfer: "yes",
      rent: "700",
      serviceCosts: "40",
      hasBasicInsurance: "yes",
      childrenCount: "1",
      receivesChildBenefit: "yes",
      childLivesAtRegisteredAddress: "yes",
      usesRegisteredChildcareProvider: "yes",
      childcareType: "dagopvang",
      childcareHoursPerMonth: "80",
      childcareCostPerHour: "9",
      worksOrStudies: "yes",
      partnerWorksOrStudies: "yes",
    });
  }

  async function startContract(selectedSlugs: SubsidySlug[], scope: SubsidySlug | "bundle") {
    if (selectedSlugs.length === 0) {
      setContractError(t("errors.noSelection"));
      return;
    }

    setContractError(null);
    setBusySlug(scope);

    const intakeSnapshot = buildIntakeSnapshot();
    const estimates = orderedResults.map((row) => ({
      slug: row.slug,
      eligible: row.eligible,
      amountPerMonth: row.amountPerMonth,
    }));

    try {
      const contractRes = await fetch("/api/toeslagen/contract-start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ selectedSlugs, intakeSnapshot, estimates }),
      });

      if (contractRes.status === 401) {
        window.location.href = nextLoginUrl();
        return;
      }

      const contractJson = (await contractRes.json().catch(() => null)) as
        | { ok: true; caseId: string }
        | { ok: false; error?: string }
        | null;

      if (!contractRes.ok || !contractJson || !("ok" in contractJson) || !contractJson.ok) {
        throw new Error((contractJson && "error" in contractJson && contractJson.error) || t("errors.contractStart"));
      }

      const checkoutRes = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ caseId: contractJson.caseId, productKey: "case_unlock" }),
      });

      if (checkoutRes.status === 401) {
        window.location.href = nextLoginUrl();
        return;
      }

      const checkoutJson = (await checkoutRes.json().catch(() => null)) as
        | { ok: true; url: string }
        | { ok: false; error?: string }
        | null;

      if (!checkoutRes.ok || !checkoutJson || !("ok" in checkoutJson) || !checkoutJson.ok || !checkoutJson.url) {
        throw new Error((checkoutJson && "error" in checkoutJson && checkoutJson.error) || t("errors.checkout"));
      }

      window.location.href = checkoutJson.url;
    } catch (e: unknown) {
      setContractError(e instanceof Error ? e.message : t("errors.checkout"));
      setBusySlug(null);
    }
  }

  return (
    <Screen className="space-y-6">
      <div className="space-y-2">
        <div className="text-xs uppercase tracking-wide text-fh-muted">{t("eyebrow")}</div>
        <h1 className="text-2xl font-semibold text-fh-text">{t("title")}</h1>
        <p className="max-w-3xl text-sm text-fh-muted">{t("subtitle")}</p>
      </div>

      <Card className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Input type="number" label={t("fields.age")} value={form.age} onChange={(e) => updateField("age", e.target.value)} />
          <Input
            type="number"
            label={t("fields.incomeSelf")}
            value={form.incomeSelf}
            onChange={(e) => updateField("incomeSelf", e.target.value)}
          />
          <Input
            type="number"
            label={t("fields.incomePartner")}
            value={form.incomePartner}
            onChange={(e) => updateField("incomePartner", e.target.value)}
          />
          <Input
            type="number"
            label={t("fields.assetsHousehold")}
            value={form.assetsHousehold}
            onChange={(e) => updateField("assetsHousehold", e.target.value)}
          />
          <Input
            type="number"
            label={t("fields.highestCoResidentAssets")}
            value={form.highestCoResidentAssets}
            onChange={(e) => updateField("highestCoResidentAssets", e.target.value)}
          />
          <Input type="number" label={t("fields.rent")} value={form.rent} onChange={(e) => updateField("rent", e.target.value)} />
          <Input
            type="number"
            label={t("fields.serviceCosts")}
            value={form.serviceCosts}
            onChange={(e) => updateField("serviceCosts", e.target.value)}
          />
          <Input
            type="number"
            label={t("fields.childrenCount")}
            value={form.childrenCount}
            onChange={(e) => updateField("childrenCount", e.target.value)}
          />
          <Input
            type="number"
            label={t("fields.childcareHoursPerMonth")}
            value={form.childcareHoursPerMonth}
            onChange={(e) => updateField("childcareHoursPerMonth", e.target.value)}
          />
          <Input
            type="number"
            label={t("fields.childcareCostPerHour")}
            value={form.childcareCostPerHour}
            onChange={(e) => updateField("childcareCostPerHour", e.target.value)}
          />
        </div>

        <ToggleGroup
          label={t("fields.livesInNetherlands")}
          value={form.livesInNetherlands}
          onValueChange={(v) => updateField("livesInNetherlands", v)}
          options={[
            { value: "no", label: t("common.no") },
            { value: "yes", label: t("common.yes") },
          ]}
        />

        <ToggleGroup
          label={t("fields.registeredAtAddress")}
          value={form.registeredAtAddress}
          onValueChange={(v) => updateField("registeredAtAddress", v)}
          options={[
            { value: "no", label: t("common.no") },
            { value: "yes", label: t("common.yes") },
          ]}
        />

        <ToggleGroup
          label={t("fields.hasDutchNationalityOrValidPermit")}
          value={form.hasDutchNationalityOrValidPermit}
          onValueChange={(v) => updateField("hasDutchNationalityOrValidPermit", v)}
          options={[
            { value: "no", label: t("common.no") },
            { value: "yes", label: t("common.yes") },
          ]}
        />

        <ToggleGroup
          label={t("fields.hasPartner")}
          value={form.hasPartner}
          onValueChange={(v) => updateField("hasPartner", v)}
          options={[
            { value: "no", label: t("common.no") },
            { value: "yes", label: t("common.yes") },
          ]}
        />

        <ToggleGroup
          label={t("fields.rentsIndependentHome")}
          value={form.rentsIndependentHome}
          onValueChange={(v) => updateField("rentsIndependentHome", v)}
          options={[
            { value: "no", label: t("common.no") },
            { value: "yes", label: t("common.yes") },
          ]}
        />

        <ToggleGroup
          label={t("fields.hasLeaseContract")}
          value={form.hasLeaseContract}
          onValueChange={(v) => updateField("hasLeaseContract", v)}
          options={[
            { value: "no", label: t("common.no") },
            { value: "yes", label: t("common.yes") },
          ]}
        />

        <ToggleGroup
          label={t("fields.paysRentByBankTransfer")}
          value={form.paysRentByBankTransfer}
          onValueChange={(v) => updateField("paysRentByBankTransfer", v)}
          options={[
            { value: "no", label: t("common.no") },
            { value: "yes", label: t("common.yes") },
          ]}
        />

        <ToggleGroup
          label={t("fields.hasBasicInsurance")}
          value={form.hasBasicInsurance}
          onValueChange={(v) => updateField("hasBasicInsurance", v)}
          options={[
            { value: "no", label: t("common.no") },
            { value: "yes", label: t("common.yes") },
          ]}
        />

        <ToggleGroup
          label={t("fields.receivesChildBenefit")}
          value={form.receivesChildBenefit}
          onValueChange={(v) => updateField("receivesChildBenefit", v)}
          options={[
            { value: "no", label: t("common.no") },
            { value: "yes", label: t("common.yes") },
          ]}
        />

        <ToggleGroup
          label={t("fields.childLivesAtRegisteredAddress")}
          value={form.childLivesAtRegisteredAddress}
          onValueChange={(v) => updateField("childLivesAtRegisteredAddress", v)}
          options={[
            { value: "no", label: t("common.no") },
            { value: "yes", label: t("common.yes") },
          ]}
        />

        <ToggleGroup
          label={t("fields.usesRegisteredChildcareProvider")}
          value={form.usesRegisteredChildcareProvider}
          onValueChange={(v) => updateField("usesRegisteredChildcareProvider", v)}
          options={[
            { value: "no", label: t("common.no") },
            { value: "yes", label: t("common.yes") },
          ]}
        />

        <ToggleGroup
          label={t("fields.worksOrStudies")}
          value={form.worksOrStudies}
          onValueChange={(v) => updateField("worksOrStudies", v)}
          options={[
            { value: "no", label: t("common.no") },
            { value: "yes", label: t("common.yes") },
          ]}
        />

        <ToggleGroup
          label={t("fields.partnerWorksOrStudies")}
          value={form.partnerWorksOrStudies}
          onValueChange={(v) => updateField("partnerWorksOrStudies", v)}
          options={[
            { value: "no", label: t("common.no") },
            { value: "yes", label: t("common.yes") },
          ]}
        />

        <ToggleGroup
          label={t("fields.childcareType")}
          value={form.childcareType}
          onValueChange={(v) => updateField("childcareType", v)}
          options={[
            { value: "dagopvang", label: t("childcareTypes.dagopvang") },
            { value: "bso", label: t("childcareTypes.bso") },
            { value: "gastouder", label: t("childcareTypes.gastouder") },
          ]}
        />

        <div className="flex flex-wrap gap-3">
          <Button onClick={runEvaluation}>{t("actions.check")}</Button>
          <Button variant="secondary" onClick={resetForm}>{t("actions.reset")}</Button>
        </div>
      </Card>

      {contractError ? (
        <Card>
          <InfoBox title={t("errors.title")} variant="danger">{contractError}</InfoBox>
        </Card>
      ) : null}

      {orderedResults.length > 0 ? (
        <Card className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">{t("result.title")}</h2>
            <Button
              onClick={() => void startContract(eligibleSlugs.length > 0 ? eligibleSlugs : orderedResults.map((row) => row.slug), "bundle")}
              disabled={busySlug !== null}
            >
              {busySlug === "bundle" ? t("actions.starting") : t("actions.startEligible")}
            </Button>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {orderedResults.map((item) => {
              const title = ts(`catalog.${item.slug}.title`);
              const statusClass = item.eligible ? "text-emerald-300" : "text-amber-300";

              return (
                <div key={item.slug} className="space-y-2 rounded-2xl border border-fh-border bg-fh-surface-2 p-4">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{title}</div>
                    <div className={statusClass}>{item.eligible ? t("result.eligible") : t("result.review")}</div>
                  </div>
                  <div className="text-sm text-fh-muted">
                    {item.amountPerMonth
                      ? t("result.monthly", { amount: item.amountPerMonth.toFixed(0) })
                      : t("result.noEstimate")}
                  </div>
                  <div className="text-xs text-fh-muted">{t("result.docsLabel")}</div>
                  <ul className="list-disc space-y-1 pl-4 text-xs text-fh-text">
                    {item.requiredDocs.map((doc) => (
                      <li key={doc}>{t(`docs.${doc}`)}</li>
                    ))}
                  </ul>
                  <button
                    className="text-sm text-fh-primary underline"
                    onClick={() => void startContract([item.slug], item.slug)}
                    disabled={busySlug !== null}
                  >
                    {busySlug === item.slug ? t("actions.starting") : t("result.startContract")}
                  </button>
                </div>
              );
            })}
          </div>
        </Card>
      ) : null}
    </Screen>
  );
}
