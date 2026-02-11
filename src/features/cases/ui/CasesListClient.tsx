"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Card } from "@/ui/components/Card";
import { Header } from "@/ui/components/Header";
import { InfoBox } from "@/ui/components/InfoBox";
import { Screen } from "@/ui/components/Screen";
import { useCases } from "@/features/cases/casesStore";

function pill(text: string) {
  return (
    <span className="rounded-xl border border-fh-border bg-fh-surface px-2 py-1 text-xs">
      {text}
    </span>
  );
}

export function CasesListClient() {
  const t = useTranslations("cases");
  const cases = useCases((s) => s.state.cases);
  const isLoading = useCases((s) => s.state.isLoading);
  const error = useCases((s) => s.state.error);
  const loadCases = useCases((s) => s.loadCases);

  return (
    <Screen className="space-y-6">
      <Header
        title={t("list.title")}
        subtitle={t("list.subtitle")}
        right={
          <Link
            href="/app/cases/new"
            className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm hover:bg-fh-surface-2"
          >
            {t("list.create")}
          </Link>
        }
      />

      {isLoading ? (
        <Card>
          <InfoBox title={t("list.loadingTitle")} variant="info">
            {t("list.loadingBody")}
          </InfoBox>
        </Card>
      ) : null}

      {error ? (
        <Card className="space-y-3">
          <InfoBox title={t("list.errorTitle")} variant="danger">
            {error}
          </InfoBox>
          <button
            onClick={() => void loadCases()}
            className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm hover:bg-fh-surface-2"
          >
            {t("list.retry")}
          </button>
        </Card>
      ) : null}

      {!isLoading && !error && (!cases || cases.length === 0) ? (
        <Card className="space-y-3">
          <InfoBox title={t("list.emptyTitle")} variant="warning">
            {t("list.emptyBody")}
          </InfoBox>
          <button
            onClick={() => void loadCases()}
            className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm hover:bg-fh-surface-2"
          >
            {t("list.refresh")}
          </button>
        </Card>
      ) : null}

      {!isLoading && !error && cases.length > 0 ? (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button
              onClick={() => void loadCases()}
              className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm hover:bg-fh-surface-2"
            >
              {t("list.refresh")}
            </button>
          </div>

          {cases.map((c) => (
            <Card key={c.id} className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-sm font-semibold">{c.title}</div>
                  {pill(c.type)}
                  {c.productSlug ? pill(c.productSlug) : null}
                  {pill(c.status)}
                  {pill(`${t("list.stepLabel")}: ${c.stepKey}`)}
                  {pill(`${t("list.authorizationLabel")}: ${c.authorizationStatus}`)}
                </div>
                <div className="text-xs text-fh-muted">
                  {t("list.updatedAt")}: {new Date(c.updatedAt).toLocaleString()}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/app/cases/${c.id}`}
                  className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm hover:bg-fh-surface-2"
                >
                  {t("list.open")}
                </Link>
              </div>
            </Card>
          ))}
        </div>
      ) : null}
    </Screen>
  );
}
