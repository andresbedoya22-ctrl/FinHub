"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Card } from "@/ui/components/Card";
import { Screen } from "@/ui/components/Screen";
import { InfoBox } from "@/ui/components/InfoBox";
import { SubsidyHero } from "@/components/subsidies/SubsidyHero";
import { getSubsidyBySlug } from "@/domain/subsidies/registry";

export default function SubsidyDetailClient({ slug }: { slug: string }) {
  const t = useTranslations("subsidies");
  const subsidy = getSubsidyBySlug(slug);

  if (!subsidy) {
    return (
      <Card>
        <InfoBox title={t("detail.invalid.title")} variant="warning">
          {t("detail.invalid.description")}
        </InfoBox>
      </Card>
    );
  }

  return (
    <Screen className="space-y-6">
      <SubsidyHero
        icon={subsidy.icon}
        title={t(subsidy.detail.titleKey)}
        subtitle={t(subsidy.detail.subtitleKey)}
        badge={t("detail.badge")}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="space-y-2 lg:col-span-2">
          <div className="text-sm font-semibold text-fh-text">{t("detail.sections.whatIs")}</div>
          <p className="text-sm text-fh-muted">{t(subsidy.detail.whatIsKey)}</p>
        </Card>

        <Card className="space-y-2">
          <div className="text-sm font-semibold text-fh-text">{t("detail.sections.coverage")}</div>
          <p className="text-sm text-fh-muted">{t(subsidy.detail.coverageKey)}</p>
          <div className="space-y-1">
            {subsidy.detail.benefitsKeys.map((benefitKey) => (
              <div key={benefitKey} className="text-xs text-fh-muted">
                - {t(benefitKey)}
              </div>
            ))}
          </div>
          <div className="mt-2 text-xs text-fh-muted">{t("detail.disclaimer")}</div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-2">
          <div className="text-sm font-semibold text-fh-text">{t("detail.sections.requirements")}</div>
          <div className="space-y-1">
            {subsidy.detail.requirementsKeys.map((requirementKey) => (
              <div key={requirementKey} className="text-sm text-fh-muted">
                - {t(requirementKey)}
              </div>
            ))}
          </div>
        </Card>

        <Card className="space-y-2">
          <div className="text-sm font-semibold text-fh-text">{t("detail.sections.needs")}</div>
          <div className="space-y-1">
            {subsidy.detail.needsKeys.map((needKey) => (
              <div key={needKey} className="text-sm text-fh-muted">
                - {t(needKey)}
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-sm font-semibold text-fh-text">{t("detail.cta.title")}</div>
          <div className="text-xs text-fh-muted">{t("detail.cta.description")}</div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/app/subsidies"
            className="rounded-xl border border-fh-border bg-fh-surface px-4 py-2 text-sm font-medium text-fh-text hover:bg-fh-surface-2"
          >
            {t("detail.cta.back")}
          </Link>
          <Link
            href={`/app/subsidies/${slug}/wizard`}
            className="rounded-xl bg-fh-primary px-4 py-2 text-sm font-medium text-fh-primaryFg hover:opacity-90"
          >
            {t("detail.cta.check")}
          </Link>
        </div>
      </Card>
    </Screen>
  );
}
