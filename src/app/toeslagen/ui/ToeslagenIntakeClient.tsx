"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { Button } from "@/ui/components/Button";
import { Card } from "@/ui/components/Card";
import { Screen } from "@/ui/components/Screen";

export default function ToeslagenIntakeClient() {
  const t = useTranslations("toeslagenIntake");

  return (
    <Screen className="space-y-6">
      <div className="space-y-2">
        <div className="text-xs uppercase tracking-wide text-fh-muted">{t("eyebrow")}</div>
        <h1 className="text-2xl font-semibold text-fh-text">{t("title")}</h1>
        <p className="max-w-3xl text-sm text-fh-muted">{t("subtitle")}</p>
      </div>

      <Card className="space-y-4">
        <div className="text-sm font-semibold">{t("flow.title")}</div>
        <div className="space-y-1 text-sm text-fh-muted">
          <div>1. {t("flow.eligibility")}</div>
          <div>2. {t("flow.result")}</div>
          <div>3. {t("flow.checkout")}</div>
          <div>4. {t("flow.authorization")}</div>
          <div>5. {t("flow.documents")}</div>
          <div>6. {t("flow.final")}</div>
        </div>

        <Link href="/app/subsidies/eligibility" className="inline-flex">
          <Button>{t("actions.check")}</Button>
        </Link>
      </Card>
    </Screen>
  );
}
