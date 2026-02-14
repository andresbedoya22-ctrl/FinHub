"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { Card } from "@/ui/components/Card";
import { Header } from "@/ui/components/Header";
import { Screen } from "@/ui/components/Screen";
import type { ProductType } from "./insuranceCatalogData";

const TYPE_GROUPS: Array<{ section: "private" | "business"; items: ProductType[] }> = [
  { section: "private", items: ["vehicle", "home", "life"] },
  { section: "business", items: ["business"] },
];

export function InsuranceCatalogClient() {
  const t = useTranslations("leadgen.insurance");

  return (
    <Screen className="space-y-6">
      <Header title={t("title")} subtitle={t("subtitle")} />
      {process.env.NODE_ENV === "development" ? (
        <div className="inline-flex rounded-full border border-fh-primary/40 bg-fh-primary/10 px-3 py-1 text-xs font-semibold text-fh-primary">
          {t("devMarker")}
        </div>
      ) : null}

      <div className="space-y-4">
        {TYPE_GROUPS.map((group) => (
          <Card key={group.section} className="space-y-3">
            <div className="text-sm font-semibold">{t(`sections.${group.section}`)}</div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {group.items.map((type) => (
                <Link
                  key={type}
                  href={`/app/insurance/${type}`}
                  className="rounded-xl border border-fh-border bg-fh-surface p-4 text-left transition hover:border-fh-primary/40 hover:bg-fh-surface-2"
                >
                  <div className="text-sm font-semibold">{t(`types.${type}.title`)}</div>
                  <div className="mt-1 text-xs text-fh-muted">{t(`types.${type}.subtitle`)}</div>
                </Link>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </Screen>
  );
}
