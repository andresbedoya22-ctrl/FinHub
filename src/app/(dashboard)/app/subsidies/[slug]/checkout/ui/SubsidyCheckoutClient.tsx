"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Card } from "@/ui/components/Card";
import { InfoBox } from "@/ui/components/InfoBox";
import { Screen } from "@/ui/components/Screen";
import { DEFAULT_POLICY_2026 } from "@/domain/subsidies/policy";
import { isSubsidySlug } from "@/domain/subsidies/registry";

export default function SubsidyCheckoutClient({ slug }: { slug: string }) {
  const t = useTranslations("subsidies");
  const params = useSearchParams();
  const applicationId = params.get("applicationId") ?? "";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const priceLabel = useMemo(() => {
    const { serviceFeeCents, currency } = DEFAULT_POLICY_2026.pricing;
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(serviceFeeCents / 100);
  }, []);

  if (!isSubsidySlug(slug)) {
    return (
      <Card>
        <InfoBox title={t("detail.invalid.title")} variant="warning">
          {t("detail.invalid.description")}
        </InfoBox>
      </Card>
    );
  }

  if (!applicationId) {
    return (
      <Card>
        <InfoBox title={t("checkout.missing.title")} variant="warning">
          {t("checkout.missing.description")}
        </InfoBox>
      </Card>
    );
  }

  async function startCheckout() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/subsidies/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ applicationId, slug }),
      });

      const json = (await res.json().catch(() => null)) as { ok?: boolean; url?: string; error?: string } | null;
      if (!res.ok || !json?.ok || !json.url) {
        throw new Error(json?.error || t("checkout.error"));
      }

      window.location.assign(json.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("checkout.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen className="space-y-6">
      {error ? (
        <Card>
          <InfoBox title={t("checkout.errorTitle")} variant="danger">
            {error}
          </InfoBox>
        </Card>
      ) : null}

      <Card className="space-y-4">
        <div className="text-sm uppercase text-fh-muted">{t("checkout.title")}</div>
        <div className="text-2xl font-semibold text-fh-text">{t("checkout.subtitle")}</div>
        <div className="text-sm text-fh-muted">{t("checkout.description")}</div>
        <div className="rounded-2xl border border-fh-border bg-fh-surface-2 p-4">
          <div className="text-xs uppercase text-fh-muted">{t("checkout.priceLabel")}</div>
          <div className="text-xl font-semibold text-fh-text">{priceLabel}</div>
          <div className="text-xs text-fh-muted">{t("checkout.sla")}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={startCheckout}
            disabled={busy}
            className="rounded-xl bg-fh-primary px-4 py-2 text-sm font-medium text-fh-primaryFg hover:opacity-90 disabled:opacity-50"
          >
            {busy ? t("checkout.processing") : t("checkout.cta")}
          </button>
          <Link
            href={`/app/subsidies/${slug}/result`}
            className="rounded-xl border border-fh-border bg-fh-surface px-4 py-2 text-sm font-medium text-fh-text hover:bg-fh-surface-2"
          >
            {t("checkout.back")}
          </Link>
        </div>
      </Card>
    </Screen>
  );
}
