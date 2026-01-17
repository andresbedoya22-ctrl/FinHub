"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { calculateSubsidyBenefit } from "@/domain/subsidies/calculators";
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
  const [attemptedNext, setAttemptedNext] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const backButtonRef = useRef<HTMLButtonElement | null>(null);
  const nextButtonRef = useRef<HTMLButtonElement | null>(null);

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
  // Step navigation is controlled by stepIndex; next/back are pure.
  const totalSteps = steps.length;
  const clampedStepIndex = totalSteps > 0 ? Math.min(Math.max(stepIndex, 0), totalSteps - 1) : 0;
  const activeStep = totalSteps > 0 ? steps[clampedStepIndex] : undefined;
  const activeKey = activeStep?.key ?? "";
  const answers = answersBySlug[subsidySlug] ?? {};

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    if (!backButtonRef.current || !nextButtonRef.current) {
      console.warn("[SubsidyWizard] Navigation buttons not mounted.");
    }
  }, []);

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
    setErrors({});
    setAttemptedNext(false);
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

  function toBenefitInput(): Parameters<typeof calculateSubsidyBenefit>[0] {
    const raw = answers;

    if (subsidySlug === "huurtoeslag") {
      return {
        slug: "huurtoeslag",
        input: {
          age: typeof raw.age === "number" ? raw.age : null,
          hasPartner: normalizeToggle(raw.hasPartner),
          householdSize: typeof raw.householdSize === "number" ? raw.householdSize : null,
          annualIncomeApplicant: typeof raw.incomeSelf === "number" ? raw.incomeSelf : null,
          annualIncomePartner: typeof raw.incomePartner === "number" ? raw.incomePartner : null,
          monthlyRent: typeof raw.rent === "number" ? raw.rent : null,
          under21HasChildOrDisability: normalizeToggle(raw.under21HasChildOrDisability),
        },
      };
    }

    if (subsidySlug === "zorgtoeslag") {
      return {
        slug: "zorgtoeslag",
        input: {
          hasPartner: normalizeToggle(raw.hasPartner),
          annualIncomeApplicant: typeof raw.incomeSelf === "number" ? raw.incomeSelf : null,
          annualIncomePartner: typeof raw.incomePartner === "number" ? raw.incomePartner : null,
        },
      };
    }

    if (subsidySlug === "kgb") {
      return {
        slug: "kgb",
        input: {
          hasPartner: normalizeToggle(raw.hasPartner),
          annualIncomeHousehold: typeof raw.incomeHousehold === "number" ? raw.incomeHousehold : null,
          childrenCount: typeof raw.childrenCount === "number" ? raw.childrenCount : null,
          childrenCount12To15: typeof raw.childrenCount12To15 === "number" ? raw.childrenCount12To15 : null,
          childrenCount16To17: typeof raw.childrenCount16To17 === "number" ? raw.childrenCount16To17 : null,
        },
      };
    }

    return {
      slug: "kot",
      input: {
        annualIncomeHousehold: typeof raw.incomeHousehold === "number" ? raw.incomeHousehold : null,
        workedMonths: typeof raw.workedMonths === "number" ? raw.workedMonths : null,
        children:
          typeof raw.childrenCount === "number" && raw.childrenCount > 1
            ? Array.from({ length: raw.childrenCount })
            : [
                {
                  hoursPerMonth: typeof raw.hoursPerMonth === "number" ? raw.hoursPerMonth : null,
                  hourlyRate: typeof raw.costPerHour === "number" ? raw.costPerHour : null,
                  childcareType: (raw.childcareType as "dagopvang" | "bso" | "gastouder" | null) ?? null,
                },
              ],
      },
    };
  }

  function goNext() {
    if (isChecking) return;
    setAttemptedNext(true);
    if (!validateStep()) return;
    const next = steps[clampedStepIndex + 1];
    if (next) {
      setStepIndexAndPersist(clampedStepIndex + 1);
      return;
    }

    try {
      setIsChecking(true);
      const payload = toEligibilityPayload();
      const result = evaluateSubsidyEligibility(subsidySlug, payload, DEFAULT_POLICY_2026);
      const benefitEstimate = calculateSubsidyBenefit(toBenefitInput(), 2026, result.eligible);
      setResult(subsidySlug, { ...result, benefitEstimate });
      router.push(`/app/subsidies/${subsidySlug}/result`);
    } finally {
      setIsChecking(false);
    }
  }

  function goBack() {
    if (isChecking) return;
    if (clampedStepIndex === 0) {
      router.push(`/app/subsidies/${subsidySlug}`);
      return;
    }
    setStepIndexAndPersist(clampedStepIndex - 1);
  }

  return (
    <Screen>
      <div className="grid gap-6 lg:grid-cols-[260px,1fr]">
        <Stepper
          steps={stepperSteps}
          activeKey={activeKey}
          onStepChange={(key) => {
            if (isChecking) return;
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
              const error = attemptedNext ? errors[field.id] : undefined;

              if (field.type === "toggle") {
                return (
                  <div key={field.id} className="space-y-1">
                    <ToggleGroup
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
                    {error ? <div className="text-xs text-red-300">{error}</div> : null}
                  </div>
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

          {/* Keep actions above any decorative layers for reliable clicks. */}
          <div className="relative z-10 flex items-center justify-between">
            <button
              type="button"
              onClick={goBack}
              disabled={isChecking}
              ref={backButtonRef}
              className="rounded-xl border border-fh-border bg-fh-surface px-4 py-2 text-sm font-medium text-fh-text hover:bg-fh-surface-2 disabled:opacity-50"
            >
              {t("wizard.actions.back")}
            </button>
            <button
              type="button"
              onClick={goNext}
              disabled={isChecking}
              ref={nextButtonRef}
              className="rounded-xl bg-fh-primary px-4 py-2 text-sm font-medium text-fh-primaryFg hover:opacity-90 disabled:opacity-60"
            >
              {clampedStepIndex === steps.length - 1 ? t("wizard.actions.finish") : t("wizard.actions.next")}
            </button>
          </div>
        </Card>
      </div>
    </Screen>
  );
}
