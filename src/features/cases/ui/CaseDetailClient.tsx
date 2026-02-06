"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import type { CaseDetail } from "@/features/cases/casesTypes";
import { getCaseDetail } from "@/features/cases/casesApi";
import { Card } from "@/ui/components/Card";
import { Header } from "@/ui/components/Header";
import { InfoBox } from "@/ui/components/InfoBox";
import { Screen } from "@/ui/components/Screen";

function pill(text: string) {
  return (
    <span className="rounded-xl border border-fh-border bg-fh-surface px-2 py-1 text-xs">
      {text}
    </span>
  );
}

export function CaseDetailClient({ caseId }: { caseId: string }) {
  const t = useTranslations("cases");
  const [detail, setDetail] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await getCaseDetail(caseId);
        if (!alive) return;
        setDetail(data);
        setError(null);
      } catch (e: unknown) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : t("detail.error"));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [caseId, t]);

  const tasks = detail?.tasks ?? [];
  const documents = detail?.documents ?? [];

  const timeline = useMemo(() => {
    if (!detail) return [];
    return [
      { label: t("detail.statusLabel"), value: detail.status },
      { label: t("detail.stepLabel"), value: detail.stepKey },
    ];
  }, [detail, t]);

  return (
    <Screen className="space-y-6">
      <Header
        title={t("detail.title")}
        subtitle={detail ? detail.title : t("detail.subtitle")}
        right={
          <Link
            href="/app/cases"
            className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm hover:bg-fh-surface-2"
          >
            {t("detail.back")}
          </Link>
        }
      />

      {loading ? (
        <Card>
          <InfoBox title={t("detail.loadingTitle")} variant="info">
            {t("detail.loadingBody")}
          </InfoBox>
        </Card>
      ) : null}

      {error ? (
        <Card>
          <InfoBox title={t("detail.errorTitle")} variant="danger">
            {error}
          </InfoBox>
        </Card>
      ) : null}

      {!loading && !error && !detail ? (
        <Card>
          <InfoBox title={t("detail.notFoundTitle")} variant="warning">
            {t("detail.notFoundBody")}
          </InfoBox>
        </Card>
      ) : null}

      {!loading && !error && detail ? (
        <div className="space-y-4">
          <Card className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {pill(detail.type)}
              {detail.productSlug ? pill(detail.productSlug) : null}
              {pill(detail.status)}
              {pill(detail.stepKey)}
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              {timeline.map((item) => (
                <div key={item.label} className="text-sm text-fh-muted">
                  {item.label}: <span className="text-fh-text">{item.value}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="space-y-3">
            <div className="text-sm font-semibold">{t("detail.tasks.title")}</div>
            {tasks.length === 0 ? (
              <InfoBox title={t("detail.tasks.emptyTitle")} variant="warning">
                {t("detail.tasks.emptyBody")}
              </InfoBox>
            ) : (
              <div className="space-y-2">
                {tasks.map((task) => (
                  <div key={task.id} className="rounded-xl border border-fh-border bg-fh-surface-2 p-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-semibold">{task.title}</div>
                      {pill(task.status)}
                      {task.dueAt ? pill(task.dueAt) : null}
                    </div>
                    <div className="text-xs text-fh-muted">
                      {t("detail.tasks.updatedAt")}: {new Date(task.updatedAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="space-y-3">
            <div className="text-sm font-semibold">{t("detail.documents.title")}</div>
            {documents.length === 0 ? (
              <InfoBox title={t("detail.documents.emptyTitle")} variant="warning">
                {t("detail.documents.emptyBody")}
              </InfoBox>
            ) : (
              <div className="overflow-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-left opacity-80">
                    <tr>
                      <th className="py-2 pr-4">{t("detail.documents.table.file")}</th>
                      <th className="py-2 pr-4">{t("detail.documents.table.type")}</th>
                      <th className="py-2 pr-4">{t("detail.documents.table.status")}</th>
                      <th className="py-2 pr-0">{t("detail.documents.table.updatedAt")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documents.map((doc) => (
                      <tr key={doc.id} className="border-t border-fh-border">
                        <td className="py-2 pr-4">{doc.document?.fileName ?? doc.documentId}</td>
                        <td className="py-2 pr-4">{doc.document?.type ?? "-"}</td>
                        <td className="py-2 pr-4">{doc.status}</td>
                        <td className="py-2 pr-0">{new Date(doc.updatedAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      ) : null}
    </Screen>
  );
}
