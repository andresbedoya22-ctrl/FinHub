"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/ui/components/Button";
import { Card } from "@/ui/components/Card";
import { Input } from "@/ui/components/Input";
import { Screen } from "@/ui/components/Screen";
import { ToggleGroup } from "@/ui/components/ToggleGroup";
import { evaluateUnifiedToeslagenIntake, type UnifiedToeslagResult } from "@/features/toeslagen/unifiedIntake";
import type { SubsidySlug } from "@/domain/subsidies/types";

const subsidyOrder: SubsidySlug[] = ["huurtoeslag", "zorgtoeslag", "kgb", "kot"];

function parseNumber(value: string): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export default function ToeslagenIntakeClient() {
  const t = useTranslations("toeslagenIntake");
  const ts = useTranslations("subsidies");
  const [results, setResults] = useState<UnifiedToeslagResult[]>([]);
  const [form, setForm] = useState({
    age: "30",
    hasPartner: "no",
    incomeSelf: "24000",
    incomePartner: "0",
    rent: "700",
    serviceCosts: "40",
    hasBasicInsurance: "yes",
    childrenCount: "1",
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

  function updateField(name: string, value: string) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function runEvaluation() {
    const next = evaluateUnifiedToeslagenIntake({
      age: parseNumber(form.age),
      hasPartner: form.hasPartner === "yes",
      incomeSelf: parseNumber(form.incomeSelf),
      incomePartner: parseNumber(form.incomePartner),
      rent: parseNumber(form.rent),
      serviceCosts: parseNumber(form.serviceCosts),
      hasBasicInsurance: form.hasBasicInsurance === "yes",
      childrenCount: parseNumber(form.childrenCount),
      childcareType: (form.childcareType as "dagopvang" | "bso" | "gastouder") ?? null,
      childcareHoursPerMonth: parseNumber(form.childcareHoursPerMonth),
      childcareCostPerHour: parseNumber(form.childcareCostPerHour),
      worksOrStudies: form.worksOrStudies === "yes",
      partnerWorksOrStudies: form.partnerWorksOrStudies === "yes",
    });
    setResults(next);
  }

  return (
    <Screen className="space-y-6">
      <div className="space-y-2">
        <div className="text-xs uppercase tracking-wide text-fh-muted">{t("eyebrow")}</div>
        <h1 className="text-2xl font-semibold text-fh-text">{t("title")}</h1>
        <p className="text-sm text-fh-muted max-w-3xl">{t("subtitle")}</p>
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
          label={t("fields.hasPartner")}
          value={form.hasPartner}
          onValueChange={(v) => updateField("hasPartner", v)}
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

        <div className="flex gap-3">
          <Button onClick={runEvaluation}>{t("actions.check")}</Button>
          <Link className="inline-flex items-center rounded-xl px-3 py-2 text-sm border border-fh-border" href="/login?next=/app/subsidies">
            {t("actions.loginCta")}
          </Link>
        </div>
      </Card>

      {orderedResults.length > 0 ? (
        <Card className="space-y-4">
          <h2 className="text-lg font-semibold">{t("result.title")}</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {orderedResults.map((item) => {
              const title = ts(`catalog.${item.slug}.title`);
              const statusClass = item.eligible ? "text-emerald-300" : "text-amber-300";

              return (
                <div key={item.slug} className="rounded-2xl border border-fh-border p-4 space-y-2 bg-fh-surface-2">
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
                  <ul className="text-xs list-disc pl-4 text-fh-text space-y-1">
                    {item.requiredDocs.map((doc) => (
                      <li key={doc}>{t(`docs.${doc}`)}</li>
                    ))}
                  </ul>
                  <Link className="text-sm text-fh-primary underline" href={`/login?next=/app/subsidies/${item.slug}/checkout`}>
                    {t("result.startContract")}
                  </Link>
                </div>
              );
            })}
          </div>
        </Card>
      ) : null}
    </Screen>
  );
}
