import Link from "next/link";
import { Card } from "@/ui/components/Card";
import { Badge } from "@/ui/components/Badge";
import { SubsidyIcon } from "./SubsidyIcon";
import type { SubsidyIcon as SubsidyIconName } from "@/domain/subsidies/registry";

export function SubsidyCard({
  title,
  description,
  badgeLabel,
  coverageLabel,
  coverageValue,
  audienceLabel,
  audienceValue,
  quickFactsLabel,
  signalsLabel,
  metrics,
  facts,
  timelineLabel,
  timelineValue,
  ctaLabel,
  href,
  icon,
}: {
  title: string;
  description: string;
  badgeLabel: string;
  coverageLabel: string;
  coverageValue: string;
  audienceLabel: string;
  audienceValue: string;
  quickFactsLabel: string;
  signalsLabel: string;
  metrics: { label: string; value: string }[];
  facts: { label: string; value: string }[];
  timelineLabel: string;
  timelineValue: string;
  ctaLabel: string;
  href: string;
  icon: SubsidyIconName;
}) {
  const [primaryMetric, ...secondaryMetrics] = metrics;

  return (
    <Card className="flex h-full flex-col gap-4 bg-gradient-to-br from-fh-surface via-fh-surface to-fh-surface-2">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-fh-primary/15">
            <SubsidyIcon name={icon} className="text-fh-primary" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-fh-muted">{description}</div>
            <div className="text-lg font-semibold text-fh-text">{title}</div>
          </div>
        </div>
        <Badge variant="neutral">{badgeLabel}</Badge>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-fh-border/70 bg-fh-surface-2 px-3 py-2 text-sm">
          <div className="text-[11px] uppercase text-fh-muted">{coverageLabel}</div>
          <div className="text-sm font-medium text-fh-text">{coverageValue}</div>
        </div>
        <div className="rounded-xl border border-fh-border/70 bg-fh-surface-2 px-3 py-2 text-sm">
          <div className="text-[11px] uppercase text-fh-muted">{audienceLabel}</div>
          <div className="text-sm font-medium text-fh-text">{audienceValue}</div>
        </div>
        {primaryMetric ? (
          <div className="rounded-xl border border-fh-border/70 bg-fh-surface-2 px-3 py-2 text-sm">
            <div className="text-[11px] uppercase text-fh-muted">{primaryMetric.label}</div>
            <div className="text-sm font-medium text-fh-text">{primaryMetric.value}</div>
          </div>
        ) : null}
      </div>

      <div className="space-y-2">
        <div className="text-xs uppercase text-fh-muted">{quickFactsLabel}</div>
        <div className="flex flex-wrap gap-2">
          {facts.map((fact) => (
            <div
              key={`${fact.label}-${fact.value}`}
              className="flex items-center gap-2 rounded-full border border-fh-border/60 bg-fh-surface-2 px-3 py-1 text-xs"
            >
              <span className="text-[10px] uppercase text-fh-muted">{fact.label}</span>
              <span className="text-fh-text">{fact.value}</span>
            </div>
          ))}
        </div>
      </div>

      {secondaryMetrics.length ? (
        <div className="space-y-2">
          <div className="text-xs uppercase text-fh-muted">{signalsLabel}</div>
          <div className="flex flex-wrap gap-2">
            {secondaryMetrics.map((metric) => (
              <div
                key={`${metric.label}-${metric.value}`}
                className="flex items-center gap-2 rounded-full border border-fh-border/60 bg-fh-surface-2 px-3 py-1 text-xs"
              >
                <span className="text-[10px] uppercase text-fh-muted">{metric.label}</span>
                <span className="text-fh-text">{metric.value}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-auto flex items-center justify-between gap-4">
        <div className="text-xs text-fh-muted">
          {timelineLabel}: {timelineValue}
        </div>
        <Link
          href={href}
          className="rounded-xl bg-fh-primary px-4 py-2 text-sm font-medium text-fh-primaryFg hover:opacity-90"
        >
          {ctaLabel}
        </Link>
      </div>
    </Card>
  );
}
