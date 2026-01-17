"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Card } from "@/ui/components/Card";
import { InfoBox } from "@/ui/components/InfoBox";
import { Badge } from "@/ui/components/Badge";
import { Screen } from "@/ui/components/Screen";
import { listMySubsidyApplications } from "@/lib/db/subsidies/client";
import { SUBSIDY_ICON_BY_SLUG, isSubsidySlug } from "@/domain/subsidies/registry";
import { SubsidyIcon } from "@/components/subsidies/SubsidyIcon";
import type { SubsidyApplication } from "@/domain/subsidies/types";
import { formatSubsidyError } from "@/domain/subsidies/errorMapper";

export default function SubsidyApplicationsClient() {
  const t = useTranslations("subsidies");
  const [items, setItems] = useState<SubsidyApplication[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await listMySubsidyApplications();
        if (!alive) return;
        setItems(data);
      } catch (e) {
        if (!alive) return;
        setError(formatSubsidyError(e, t));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [t]);

  const empty = !loading && items.length === 0;
  const sorted = useMemo(() => items.slice(), [items]);

  return (
    <Screen className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-wide text-fh-muted">{t("applications.eyebrow")}</div>
        <div className="text-2xl font-semibold text-fh-text">{t("applications.title")}</div>
        <div className="text-sm text-fh-muted">{t("applications.subtitle")}</div>
      </div>

      {error ? (
        <Card>
          <InfoBox title={t("applications.errorTitle")} variant="danger">
            {error}
          </InfoBox>
        </Card>
      ) : null}

      {loading ? (
        <Card>
          <InfoBox title={t("applications.loading")} variant="info">
            {t("applications.loadingDescription")}
          </InfoBox>
        </Card>
      ) : null}

      {empty ? (
        <Card>
          <InfoBox title={t("applications.empty.title")} variant="warning">
            {t("applications.empty.description")}
          </InfoBox>
        </Card>
      ) : null}

      {!loading && !empty ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {sorted.map((app) => {
            const slug = app.slug;
            const icon = isSubsidySlug(slug) ? SUBSIDY_ICON_BY_SLUG[slug] : "home";
            return (
              <Card key={app.id} className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-2xl bg-fh-primary/15 flex items-center justify-center">
                      <SubsidyIcon name={icon} className="text-fh-primary" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-fh-text">{t(`catalog.${slug}.title`)}</div>
                      <div className="text-xs text-fh-muted">{t("applications.createdAt")}: {new Date(app.createdAt).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <Badge variant="neutral">{t(`status.${app.status}`)}</Badge>
                </div>

                <div className="text-xs text-fh-muted">
                  {t("applications.progress")} {t("applications.separator")} {t(`status.${app.status}`)}
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/app/subsidies/applications/${app.id}`}
                    className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm font-medium text-fh-text hover:bg-fh-surface-2"
                  >
                    {t("applications.cta.view")}
                  </Link>
                  <Link
                    href={`/app/subsidies/${slug}`}
                    className="rounded-xl bg-fh-primary px-3 py-2 text-sm font-medium text-fh-primaryFg hover:opacity-90"
                  >
                    {t("applications.cta.details")}
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      ) : null}
    </Screen>
  );
}

