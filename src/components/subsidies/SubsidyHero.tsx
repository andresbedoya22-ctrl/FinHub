import { Badge } from "@/ui/components/Badge";
import { SubsidyIcon } from "./SubsidyIcon";
import type { SubsidyIcon as SubsidyIconName } from "@/domain/subsidies/registry";

export function SubsidyHero({
  title,
  subtitle,
  badge,
  icon,
}: {
  title: string;
  subtitle: string;
  badge: string;
  icon: SubsidyIconName;
}) {
  return (
    <div className="rounded-3xl border border-fh-border bg-gradient-to-br from-fh-surface via-fh-surface to-fh-surface-2 p-6 md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-fh-primary/15 flex items-center justify-center">
            <SubsidyIcon name={icon} className="text-fh-primary" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-fh-muted">{badge}</div>
            <h1 className="text-2xl font-semibold text-fh-text">{title}</h1>
            <p className="mt-1 text-sm text-fh-muted max-w-2xl">{subtitle}</p>
          </div>
        </div>
        <Badge variant="success">{badge}</Badge>
      </div>
    </div>
  );
}
