import Link from "next/link";
import { Card } from "@/ui/components/Card";
import { Badge } from "@/ui/components/Badge";
import { SubsidyIcon } from "./SubsidyIcon";
import type { SubsidyIcon as SubsidyIconName } from "@/domain/subsidies/registry";

export function SubsidyCard({
  title,
  description,
  coverageLabel,
  coverageValue,
  audienceLabel,
  audienceValue,
  timelineLabel,
  timelineValue,
  ctaLabel,
  href,
  icon,
}: {
  title: string;
  description: string;
  coverageLabel: string;
  coverageValue: string;
  audienceLabel: string;
  audienceValue: string;
  timelineLabel: string;
  timelineValue: string;
  ctaLabel: string;
  href: string;
  icon: SubsidyIconName;
}) {
  return (
    <Card className="space-y-4 bg-gradient-to-br from-fh-surface via-fh-surface to-fh-surface-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-fh-primary/15 flex items-center justify-center">
              <SubsidyIcon name={icon} className="text-fh-primary" />
            </div>
            <div>
              <div className="text-sm text-fh-muted">{description}</div>
              <div className="text-lg font-semibold text-fh-text">{title}</div>
            </div>
          </div>
        <Badge variant="neutral">{timelineValue}</Badge>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-fh-border/70 bg-fh-surface-2 px-3 py-2 text-sm">
          <div className="text-xs uppercase text-fh-muted">{coverageLabel}</div>
          <div className="text-sm text-fh-text">{coverageValue}</div>
        </div>
        <div className="rounded-xl border border-fh-border/70 bg-fh-surface-2 px-3 py-2 text-sm">
          <div className="text-xs uppercase text-fh-muted">{audienceLabel}</div>
          <div className="text-sm text-fh-text">{audienceValue}</div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
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
