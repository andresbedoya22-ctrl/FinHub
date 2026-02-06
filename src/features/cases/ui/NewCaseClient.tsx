"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import type { CaseType } from "@/features/cases/casesTypes";
import { defaultTitleForCaseType } from "@/features/cases/casesConfig";
import { useCases } from "@/features/cases/casesStore";
import { Card } from "@/ui/components/Card";
import { Header } from "@/ui/components/Header";
import { Screen } from "@/ui/components/Screen";

const OPTIONS: { value: CaseType; labelKey: string }[] = [
  { value: "toeslagen", labelKey: "types.toeslagen" },
  { value: "taxes", labelKey: "types.taxes" },
  { value: "mortgage", labelKey: "types.mortgage" },
  { value: "credit", labelKey: "types.credit" },
  { value: "insurance", labelKey: "types.insurance" },
];

export function NewCaseClient() {
  const t = useTranslations("cases");
  const router = useRouter();
  const createCase = useCases((s) => s.createCase);

  const [type, setType] = useState<CaseType>("toeslagen");
  const [title, setTitle] = useState("");
  const [productSlug, setProductSlug] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const placeholder = useMemo(() => defaultTitleForCaseType(type), [type]);

  async function onCreate() {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErr(null);

    try {
      const id = await createCase(type, title, productSlug);
      router.push(`/app/cases/${id}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t("new.error");
      setErr(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Screen className="space-y-6">
      <Header title={t("new.title")} subtitle={t("new.subtitle")} />

      <Card className="space-y-4">
        <div className="space-y-1">
          <label className="text-sm font-medium">{t("new.form.type")}</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as CaseType)}
            className="w-full rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-fh-accent/30"
          >
            {OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {t(`new.${o.labelKey}` as never)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">{t("new.form.productSlug")}</label>
          <input
            value={productSlug}
            onChange={(e) => setProductSlug(e.target.value)}
            placeholder={t("new.form.productSlugPlaceholder")}
            className="w-full rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-fh-accent/30"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">{t("new.form.title")}</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={placeholder}
            className="w-full rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-fh-accent/30"
          />
        </div>

        {err ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm">
            {err}
          </div>
        ) : null}

        <button
          onClick={() => void onCreate()}
          disabled={isSubmitting}
          className="w-full rounded-xl bg-fh-accent px-4 py-2 text-sm font-medium text-white hover:opacity-95 disabled:opacity-60"
        >
          {isSubmitting ? t("new.form.submitting") : t("new.form.submit")}
        </button>
      </Card>
    </Screen>
  );
}
