"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/ui/components/Button";
import { Card } from "@/ui/components/Card";
import { Header } from "@/ui/components/Header";
import { Screen } from "@/ui/components/Screen";
import { getProductsByType, type ProductType } from "./insuranceCatalogData";

type Props = {
  type: ProductType;
};

export function InsuranceTypeFlowClient({ type }: Props) {
  const t = useTranslations("leadgen.insurance");
  const [step, setStep] = useState<"products" | "next">("products");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  const products = useMemo(() => getProductsByType(type), [type]);
  const selectedProduct = products.find((item) => item.id === selectedProductId) ?? null;

  return (
    <Screen className="space-y-6">
      <Header
        title={t("typeFlow.title", { type: t(`types.${type}.title`) })}
        subtitle={t("typeFlow.subtitle")}
      />

      {step === "products" ? (
        <Card className="space-y-4">
          <div className="text-sm font-semibold">{t("typeFlow.selectProduct")}</div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => {
              const active = selectedProductId === product.id;
              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => setSelectedProductId(product.id)}
                  aria-pressed={active}
                  className={`rounded-xl border p-3 text-left ${active ? "border-fh-primary bg-fh-primary/10" : "border-fh-border bg-fh-surface hover:bg-fh-surface-2"}`}
                >
                  <div className="text-sm font-semibold">{t(`products.${product.id}.title`)}</div>
                  <div className="mt-1 text-xs text-fh-muted">{t(`products.${product.id}.teaser`)}</div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {product.coverages.slice(0, 3).map((coverage) => (
                      <span key={coverage} className="rounded-full border border-fh-border bg-fh-bg px-2 py-1 text-[11px]">
                        {t(`coverages.${coverage}`)}
                      </span>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between">
            <Link href="/app/insurance" className="text-sm text-fh-muted underline">{t("typeFlow.backToTypes")}</Link>
            <Button onClick={() => setStep("next")} disabled={!selectedProduct}>
              {t("typeFlow.continue")}
            </Button>
          </div>
        </Card>
      ) : null}

      {step === "next" ? (
        <Card className="space-y-3">
          <div className="text-sm font-semibold">{t("typeFlow.nextStepTitle")}</div>
          <div className="text-sm text-fh-muted">
            {t("typeFlow.nextStepBody", { product: selectedProduct ? t(`products.${selectedProduct.id}.title`) : "-" })}
          </div>
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => setStep("products")}>{t("typeFlow.changeProduct")}</Button>
            <Button>{t("typeFlow.nextStepCta")}</Button>
          </div>
        </Card>
      ) : null}
    </Screen>
  );
}
