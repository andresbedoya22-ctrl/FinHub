"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Card } from "@/ui/components/Card";
import { InfoBox } from "@/ui/components/InfoBox";
import { Input } from "@/ui/components/Input";
import { Screen } from "@/ui/components/Screen";
import { Stepper } from "@/ui/components/Stepper";
import { ToggleGroup } from "@/ui/components/ToggleGroup";
import { WIZARD_STEPS_BY_SLUG, type WizardField } from "@/domain/subsidies/wizardSchemas";
import { DEFAULT_POLICY_2026 } from "@/domain/subsidies/policy";
import { evaluateSubsidyEligibility } from "@/domain/subsidies/eligibilityEngine";
import { isSubsidySlug } from "@/domain/subsidies/registry";
import type { SubsidySlug } from "@/domain/subsidies/types";
import { useSubsidyWizardStore } from "@/domain/subsidies/wizardStore";

type FieldErrors = Record<string, string>;

function parseNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

function normalizeToggle(value: unknown): boolean {
  return value === "yes" || value === true;
}

function getFieldValue(raw: unknown): string {
  if (raw === null || raw === undefined) return "";
  if (typeof raw === "number") return String(raw);
  if (typeof raw === "boolean") return raw ? "yes" : "no";
  return String(raw);
}

function getPersistedStepIndex(slug: SubsidySlug): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem("finhub.subsidies.wizard.v1");
    if (!raw) return 0;
    const parsed = JSON.parse(raw);
    const index = parsed?.state?.stepIndexBySlug?.[slug];
    return typeof index === "number" && Number.isFinite(index) ? index : 0;
  } catch {
    return 0;
  }
}

export default function SubsidyWizardClient({ slug }: { slug: string }) {
  const t = useTranslations("subsidies");
  const router = useRouter();
  const [errors, setErrors] = useState<FieldErrors>({});

  const setAnswer = useSubsidyWizardStore((s) => s.setAnswer);
  const setResult = useSubsidyWizardStore((s) => s.setResult);
  const setStoredStepIndex = useSubsidyWizardStore((s) => s.setStepIndex);
  const answersBySlug = useSubsidyWizardStore((s) => s.answersBySlug);

  const isValidSlug = isSubsidySlug(slug);
  const steps = useMemo(() => (isValidSlug ? WIZARD_STEPS_BY_SLUG[slug] : []), [isValidSlug, slug]);
  const stepperSteps = useMemo(
    () =>
      steps.map((s) => ({
        key: s.key,
        title: t(s.titleKey),
        description: s.descriptionKey ? t(s.descriptionKey) : undefined,
      })),
    [steps, t]
  );

  const subsidySlug = slug as SubsidySlug;
  const initialStepIndex = useMemo(() => getPersistedStepIndex(subsidySlug), [subsidySlug]);
  const [stepIndex, setStepIndex] = useState(initialStepIndex);
  const totalSteps = steps.length;
  const clampedStepIndex = totalSteps > 0 ? Math.min(Math.max(stepIndex, 0), totalSteps - 1) : 0;
  const activeStep = totalSteps > 0 ? steps[clampedStepIndex] : undefined;
  const activeKey = activeStep?.key ?? "";
  const answers = answersBySlug[subsidySlug] ?? {};

  if (!isValidSlug || !activeStep) {
    return (
      <Card>
        <InfoBox title={t("detail.invalid.title")} variant="warning">
          {t("detail.invalid.description")}
        </InfoBox>
      </Card>
    );
  }

  const currentStep = activeStep;

  function setStepIndexAndPersist(nextIndex: number) {
    const bounded = Math.min(Math.max(nextIndex, 0), totalSteps - 1);
    setStepIndex(bounded);
    setStoredStepIndex(subsidySlug, bounded);
  }

  function setFieldValue(field: WizardField, value: string) {
    if (field.type === "toggle") {
      setAnswer(subsidySlug, field.id, value === "yes" ? "yes" : "no");
      return;
    }
    if (field.type === "number" || field.type === "currency") {
      const parsed = parseNumber(value);
      setAnswer(subsidySlug, field.id, parsed ?? null);
      return;
    }
    setAnswer(subsidySlug, field.id, value);
  }

  function validateStep(): boolean {
    const nextErrors: FieldErrors = {};
    currentStep.fields.forEach((field) => {
      const value = answers[field.id];
      if (field.type === "toggle" || field.type === "select") {
        if (!value) nextErrors[field.id] = t("wizard.errors.required");
      } else if (field.type === "number" || field.type === "currency") {
        if (typeof value !== "number" || !Number.isFinite(value)) {
          nextErrors[field.id] = t("wizard.errors.invalidNumber");
        }
      }
    });

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function toEligibilityPayload() {
    const raw = answers;

    if (slug === "huurtoeslag") {
      return {
        livesInRent: normalizeToggle(raw.livesInRent),
        age: typeof raw.age === "number" ? raw.age : null,
        hasPartner: normalizeToggle(raw.hasPartner),
        incomeSelf: typeof raw.incomeSelf === "number" ? raw.incomeSelf : null,
        incomePartner: typeof raw.incomePartner === "number" ? raw.incomePartner : null,
        rent: typeof raw.rent === "number" ? raw.rent : null,
        serviceCosts: typeof raw.serviceCosts === "number" ? raw.serviceCosts : null,
      };
    }

    if (slug === "zorgtoeslag") {
      return {
        hasBasicInsurance: normalizeToggle(raw.hasBasicInsurance),
        hasPartner: normalizeToggle(raw.hasPartner),
        incomeSelf: typeof raw.incomeSelf === "number" ? raw.incomeSelf : null,
        incomePartner: typeof raw.incomePartner === "number" ? raw.incomePartner : null,
      };
    }

    if (slug === "kgb") {
      return {
        childrenCount: typeof raw.childrenCount === "number" ? raw.childrenCount : null,
        hasPartner: normalizeToggle(raw.hasPartner),
        incomeHousehold: typeof raw.incomeHousehold === "number" ? raw.incomeHousehold : null,
      };
    }

    return {
      childrenCount: typeof raw.childrenCount === "number" ? raw.childrenCount : null,
      childcareType: (raw.childcareType as "dagopvang" | "bso" | "gastouder" | null) ?? null,
      hoursPerMonth: typeof raw.hoursPerMonth === "number" ? raw.hoursPerMonth : null,
      costPerHour: typeof raw.costPerHour === "number" ? raw.costPerHour : null,
      worksOrStudies: normalizeToggle(raw.worksOrStudies),
      partnerWorksOrStudies: normalizeToggle(raw.partnerWorksOrStudies),
      incomeHousehold: typeof raw.incomeHousehold === "number" ? raw.incomeHousehold : null,
    };
  }

  function goNext() {
    if (!validateStep()) return;
    const next = steps[clampedStepIndex + 1];
    if (next) {
      setStepIndexAndPersist(clampedStepIndex + 1);
      return;
    }

    const payload = toEligibilityPayload();
    const result = evaluateSubsidyEligibility(subsidySlug, payload, DEFAULT_POLICY_2026);
    setResult(subsidySlug, result);
    router.push(`/app/subsidies/${subsidySlug}/result`);
  }

  function goBack() {
    if (clampedStepIndex > 0) setStepIndexAndPersist(clampedStepIndex - 1);
  }

  return (
    <Screen>
      <div className="grid gap-6 lg:grid-cols-[260px,1fr]">
        <Stepper
          steps={stepperSteps}
          activeKey={activeKey}
          onStepChange={(key) => {
            const nextIndex = steps.findIndex((s) => s.key === key);
            if (nextIndex >= 0) setStepIndexAndPersist(nextIndex);
          }}
          labels={{ progress: t("wizard.stepper.progress"), step: t("wizard.stepper.step") }}
        />

        <Card className="space-y-6">
          <div>
            <div className="text-xs uppercase tracking-wide text-fh-muted">{t("wizard.stepper.step")}</div>
            <div className="text-lg font-semibold text-fh-text">{t(currentStep.titleKey)}</div>
            {currentStep.descriptionKey ? (
              <div className="text-sm text-fh-muted">{t(currentStep.descriptionKey)}</div>
            ) : null}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {currentStep.fields.map((field) => {
              const fieldValue = getFieldValue(answers[field.id]);
              const error = errors[field.id];

              if (field.type === "toggle") {
                return (
                  <ToggleGroup
                    key={field.id}
                    label={t(field.labelKey)}
                    value={fieldValue || undefined}
                    options={(field.options ?? []).map((o) => ({
                      ...o,
                      label: t(o.labelKey),
                      description: o.descriptionKey ? t(o.descriptionKey) : undefined,
                    }))}
                    onValueChange={(value) => {
                      setFieldValue(field, value);
                      setErrors((prev) => ({ ...prev, [field.id]: "" }));
                    }}
                  />
                );
              }

              if (field.type === "select") {
                return (
                  <label key={field.id} className="space-y-1 text-sm">
                    <div className="text-sm font-medium text-fh-muted">{t(field.labelKey)}</div>
                    <select
                      value={fieldValue}
                      onChange={(e) => {
                        setFieldValue(field, e.target.value);
                        setErrors((prev) => ({ ...prev, [field.id]: "" }));
                      }}
                      className="w-full rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-fh-primary/35"
                    >
                      <option value="">{t("wizard.common.selectPlaceholder")}</option>
                      {(field.options ?? []).map((o) => (
                        <option key={o.value} value={o.value}>
                          {t(o.labelKey)}
                        </option>
                      ))}
                    </select>
                    {field.hintKey ? <div className="text-xs text-fh-muted">{t(field.hintKey)}</div> : null}
                    {error ? <div className="text-xs text-red-300">{error}</div> : null}
                  </label>
                );
              }

              return (
                <Input
                  key={field.id}
                  label={t(field.labelKey)}
                  hint={field.hintKey ? t(field.hintKey) : undefined}
                  error={error}
                  type="number"
                  min="0"
                  step={field.type === "currency" ? "0.01" : "1"}
                  value={fieldValue}
                  onChange={(e) => {
                    setFieldValue(field, e.target.value);
                    setErrors((prev) => ({ ...prev, [field.id]: "" }));
                  }}
                />
              );
            })}
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={goBack}
              disabled={clampedStepIndex === 0}
              className="rounded-xl border border-fh-border bg-fh-surface px-4 py-2 text-sm font-medium text-fh-text hover:bg-fh-surface-2 disabled:opacity-50"
            >
              {t("wizard.actions.back")}
            </button>
            <button
              type="button"
              onClick={goNext}
              className="rounded-xl bg-fh-primary px-4 py-2 text-sm font-medium text-fh-primaryFg hover:opacity-90"
            >
              {clampedStepIndex === steps.length - 1 ? t("wizard.actions.finish") : t("wizard.actions.next")}
            </button>
          </div>
        </Card>
      </div>
    </Screen>
  );
}
