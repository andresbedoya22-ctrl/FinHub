"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Card } from "@/ui/components/Card";
import { InfoBox } from "@/ui/components/InfoBox";
import { Screen } from "@/ui/components/Screen";
import { DEFAULT_POLICY_2026 } from "@/domain/subsidies/policy";
import { isSubsidySlug } from "@/domain/subsidies/registry";
import type { EligibilityResult, SubsidySlug } from "@/domain/subsidies/types";
import { useSubsidyWizardStore } from "@/domain/subsidies/wizardStore";
import { createSubsidyApplication } from "@/app/(dashboard)/app/subsidies/actions";

export default function SubsidyResultClient({ slug }: { slug: string }) {
  const t = useTranslations("subsidies");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const answersBySlug = useSubsidyWizardStore((s) => s.answersBySlug);
  const resultBySlug = useSubsidyWizardStore((s) => s.resultBySlug);

  const priceLabel = useMemo(() => {
    const { serviceFeeCents, currency } = DEFAULT_POLICY_2026.pricing;
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(serviceFeeCents / 100);
  }, []);

  const formatEuro = useMemo(
    () => (valueCents: number) =>
      new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: "EUR",
        minimumFractionDigits: 0,
      }).format(valueCents / 100),
    []
  );

  if (!isSubsidySlug(slug)) {
    return (
      <Card>
        <InfoBox title={t("detail.invalid.title")} variant="warning">
          {t("detail.invalid.description")}
        </InfoBox>
      </Card>
    );
  }

  const subsidySlug = slug as SubsidySlug;
  const result = resultBySlug[subsidySlug];
  const answers = answersBySlug[subsidySlug] ?? {};

  if (!result) {
    return (
      <Card>
        <InfoBox title={t("result.empty.title")} variant="warning">
          {t("result.empty.description")}
        </InfoBox>
      </Card>
    );
  }
  const eligibilitySnapshot = result as EligibilityResult;
  const benefit = result.benefitEstimate;

  async function handleContinue() {
    setError(null);
    setBusy(true);
    try {
      const applicationId = await createSubsidyApplication({
        slug: subsidySlug,
        eligibilitySnapshot,
        intakeData: answers,
      });
      router.push(`/app/subsidies/${subsidySlug}/checkout?applicationId=${encodeURIComponent(applicationId)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("result.actions.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen className="space-y-6">
      {error ? (
        <Card>
          <InfoBox title={t("result.actions.errorTitle")} variant="danger">
            {error}
          </InfoBox>
        </Card>
      ) : null}

      <Card className="space-y-3">
        <div className="text-sm uppercase text-fh-muted">{t("result.header.label")}</div>
        <div className="text-2xl font-semibold text-fh-text">
          {result.eligible ? t("result.header.eligible") : t("result.header.notEligible")}
        </div>
        <div className="text-sm text-fh-muted">
          {result.eligible ? t("result.header.eligibleDescription") : t("result.header.notEligibleDescription")}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-2">
          <div className="text-sm font-semibold text-fh-text">{t("result.reasons.title")}</div>
          <div className="space-y-1">
            {(result.eligible ? result.reasons : result.blockingReasons).map((reason, idx) => (
              <div key={`${reason}-${idx}`} className="text-sm text-fh-muted">
                - {t(reason)}
              </div>
            ))}
          </div>
        </Card>

        <Card className="space-y-3">
          <div className="text-sm font-semibold text-fh-text">{t("result.benefit.title")}</div>
          {benefit?.monthlyCents !== undefined ? (
            <>
              <div className="rounded-2xl border border-fh-border bg-fh-surface-2 p-4">
                <div className="text-xs uppercase text-fh-muted">{t("result.benefit.monthlyLabel")}</div>
                <div className="text-2xl font-semibold text-fh-text">{formatEuro(benefit.monthlyCents)}</div>
                {benefit.yearlyCents !== undefined ? (
                  <div className="text-xs text-fh-muted">
                    {t("result.benefit.annualLabel")}: {formatEuro(benefit.yearlyCents)}
                  </div>
                ) : null}
              </div>
              {benefit.breakdownKeys.length ? (
                <div className="space-y-1 text-sm text-fh-muted">
                  <div className="text-xs uppercase text-fh-muted">{t("result.benefit.breakdownLabel")}</div>
                  {benefit.breakdownKeys.map((key) => (
                    <div key={key}>- {t(key)}</div>
                  ))}
                </div>
              ) : null}
              {benefit.assumptionsKeys.length ? (
                <div className="space-y-1 text-xs text-fh-muted">
                  <div className="text-xs uppercase text-fh-muted">{t("result.benefit.assumptionsLabel")}</div>
                  {benefit.assumptionsKeys.map((key) => (
                    <div key={key}>- {t(key)}</div>
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <>
              <div className="text-sm text-fh-muted">
                {benefit?.explanationKey ? t(benefit.explanationKey) : t("result.benefit.notAvailableDescription")}
              </div>
              {benefit?.missingInputs?.length ? (
                <div className="space-y-1 text-xs text-fh-muted">
                  <div className="text-xs uppercase text-fh-muted">{t("result.benefit.missingInputsLabel")}</div>
                  {benefit.missingInputs.map((key) => (
                    <div key={key}>- {t(key)}</div>
                  ))}
                </div>
              ) : null}
            </>
          )}
        </Card>

        <Card className="space-y-3">
          <div className="text-sm font-semibold text-fh-text">{t("result.next.title")}</div>
          <div className="text-sm text-fh-muted">{t("result.next.description")}</div>
          <div className="rounded-2xl border border-fh-border bg-fh-surface-2 p-4">
            <div className="text-xs uppercase text-fh-muted">{t("result.paywall.label")}</div>
            <div className="text-xl font-semibold text-fh-text">{priceLabel}</div>
            <div className="text-xs text-fh-muted">{t("result.paywall.sla")}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            {result.eligible ? (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleContinue}
                  className="rounded-xl bg-fh-primary px-4 py-2 text-sm font-medium text-fh-primaryFg hover:opacity-90 disabled:opacity-50"
                >
                  {busy ? t("result.actions.processing") : t("result.actions.continue")}
                </button>
                <Link
                  href={`/app/subsidies/${subsidySlug}/wizard`}
                  className="rounded-xl border border-fh-border bg-fh-surface px-4 py-2 text-sm font-medium text-fh-text hover:bg-fh-surface-2"
                >
                  {t("result.actions.review")}
                </Link>
              </>
            ) : (
              <Link
                href={`/app/subsidies/${subsidySlug}/wizard`}
                className="rounded-xl bg-fh-primary px-4 py-2 text-sm font-medium text-fh-primaryFg hover:opacity-90"
              >
                {t("result.actions.review")}
              </Link>
            )}
          </div>
        </Card>
      </div>
    </Screen>
  );
}
