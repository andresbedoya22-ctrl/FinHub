"use client";

import { useTranslations } from "next-intl";
import { Screen } from "@/ui/components/Screen";
import { Card } from "@/ui/components/Card";
import { SubsidyCard } from "@/components/subsidies/SubsidyCard";
import { SUBSIDIES } from "@/domain/subsidies/registry";

export default function SubsidiesHomeClient() {
  const t = useTranslations("subsidies");

  return (
    <Screen className="space-y-8">
      <div className="space-y-2">
        <div className="text-xs uppercase tracking-wide text-fh-muted">{t("home.eyebrow")}</div>
        <h1 className="text-2xl font-semibold text-fh-text">{t("home.title")} </h1>
        <p className="text-sm text-fh-muted max-w-3xl">{t("home.subtitle")}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {SUBSIDIES.map((subsidy) => (
          <SubsidyCard
            key={subsidy.slug}
            variant="compact"
            title={t(subsidy.catalog.titleKey)}
            description={t(subsidy.catalog.descriptionKey)}
            badgeLabel={t("home.badge")}
            coverageLabel={t("home.labels.coverage")}
            coverageValue={t(subsidy.catalog.coverageKey)}
            audienceLabel={t("home.labels.audience")}
            audienceValue={t(subsidy.catalog.audienceKey)}
            timelineLabel={t("home.labels.timeline")}
            timelineValue={t(subsidy.catalog.timelineKey)}
            ctaLabel={t("home.cta.viewDetails")}
            href={`/app/subsidies/${subsidy.slug}`}
            icon={subsidy.icon}
          />
        ))}
      </div>

      <Card className="space-y-4">
        <div className="text-lg font-semibold text-fh-text">{t("home.howItWorks.title")}</div>
        <div className="grid gap-3 md:grid-cols-3">
          {[1, 2, 3].map((idx) => (
            <div key={idx} className="rounded-2xl border border-fh-border bg-fh-surface-2 p-4">
              <div className="text-xs uppercase text-fh-muted">{t(`home.howItWorks.steps.${idx}.eyebrow`)}</div>
              <div className="mt-1 text-sm font-semibold text-fh-text">{t(`home.howItWorks.steps.${idx}.title`)}</div>
              <div className="mt-1 text-xs text-fh-muted">{t(`home.howItWorks.steps.${idx}.description`)}</div>
            </div>
          ))}
        </div>
      </Card>
    </Screen>
  );
}
