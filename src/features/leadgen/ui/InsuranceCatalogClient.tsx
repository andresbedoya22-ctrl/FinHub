"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { Button } from "@/ui/components/Button";
import { Card } from "@/ui/components/Card";
import { Header } from "@/ui/components/Header";
import { InfoBox } from "@/ui/components/InfoBox";
import { Screen } from "@/ui/components/Screen";
import { estimateInsurancePremium, mapIncomeBand } from "./leadgenCalculators";
import {
  createMarketingLead,
  startLeadgenCase,
  submitLeadgenCase,
  type LeadContact,
} from "./leadgenIntakeClient";
import { useLeadIdentity } from "./useLeadIdentity";
import { trackProductEvent } from "@/features/observability/productTelemetry";

type ProductType = "vehicle" | "home" | "life" | "business";

type ProductRef = {
  id: string;
  section: "private" | "business";
  subsection: string;
  productType: ProductType;
  coverages: string[];
};

const PRODUCTS: ProductRef[] = [
  { id: "car", section: "private", subsection: "vehicle", productType: "vehicle", coverages: ["oc", "miniCasco", "autoCasco", "roadside"] },
  { id: "motorbike", section: "private", subsection: "vehicle", productType: "vehicle", coverages: ["liability", "theft", "damage"] },
  { id: "life", section: "private", subsection: "life", productType: "life", coverages: ["death", "funeral", "familySupport"] },
  { id: "home", section: "private", subsection: "home", productType: "home", coverages: ["liability", "accidents", "contents", "legal", "travel"] },
  { id: "businessVehicle", section: "business", subsection: "vehicle", productType: "business", coverages: ["liability", "damage", "roadside"] },
  { id: "avb", section: "business", subsection: "liability", productType: "business", coverages: ["liability", "legal", "thirdParty"] },
  { id: "zzpAccident", section: "business", subsection: "selfEmployed", productType: "business", coverages: ["workAccident", "disability", "dailyPay"] },
  { id: "toolsInVehicle", section: "business", subsection: "operations", productType: "business", coverages: ["tools", "materials", "transport"] },
];

function euro(n: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(n);
}

export function InsuranceCatalogClient() {
  const t = useTranslations("leadgen.insurance");
  const common = useTranslations("leadgen.common");
  const validationT = useTranslations("leadgen.validation");
  const locale = useLocale();
  const identity = useLeadIdentity();

  const [selected, setSelected] = useState<ProductRef>(PRODUCTS[0] as ProductRef);
  const [assetValue, setAssetValue] = useState(18_000);
  const [birthDate, setBirthDate] = useState("");
  const [noClaimsYears, setNoClaimsYears] = useState(5);
  const [monthlyIncome, setMonthlyIncome] = useState(3_000);
  const [requestAdvice, setRequestAdvice] = useState(false);

  const [contact, setContact] = useState<LeadContact>({
    fullName: "",
    email: "",
    phone: "",
    consent: false,
  });

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [premium, setPremium] = useState<number | null>(null);
  const [caseId, setCaseId] = useState<string | null>(null);
  const [marketingLeadId, setMarketingLeadId] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const bySection = new Map<string, Map<string, ProductRef[]>>();
    for (const item of PRODUCTS) {
      if (!bySection.has(item.section)) bySection.set(item.section, new Map());
      const subsectionMap = bySection.get(item.section) as Map<string, ProductRef[]>;
      if (!subsectionMap.has(item.subsection)) subsectionMap.set(item.subsection, []);
      (subsectionMap.get(item.subsection) as ProductRef[]).push(item);
    }
    return bySection;
  }, []);

  function validateContact(): string | null {
    if (identity.loggedIn) return null;
    if (contact.fullName.trim().length < 2) return validationT("fullName");
    if (!contact.email.includes("@") || contact.email.trim().length < 6) return validationT("email");
    if (!contact.consent) return validationT("consent");
    return null;
  }

  async function onCalculateAndSaveLead() {
    if (busy) return;
    setBusy(true);
    setError(null);

    try {
      if (!birthDate) throw new Error(validationT("birthDate"));

      const nextPremium = estimateInsurancePremium({
        productType: selected.productType,
        assetValue,
        birthDate,
        noClaimsYears: selected.productType === "vehicle" ? noClaimsYears : undefined,
      });
      setPremium(nextPremium);

      const contactValidation = validateContact();
      if (contactValidation) throw new Error(contactValidation);

      const intakeNotes = {
        calculator: "insurance_catalog_v4_i18n",
        productId: selected.id,
        productType: selected.productType,
        assetValue,
        birthDate,
        noClaimsYears: selected.productType === "vehicle" ? noClaimsYears : null,
        estimatedPremium: nextPremium,
        requestAdvice,
      };

      if (identity.loggedIn) {
        const cid = caseId ?? (await startLeadgenCase("insurance"));
        const payload = {
          fullName: identity.fullName || "Authenticated user",
          email: identity.email,
          phone: contact.phone?.trim() || null,
          employmentStatus: "employed",
          yearlyIncomeBand: mapIncomeBand(monthlyIncome * 12),
          timelineMonths: "0_3",
          hasPartner: false,
          notes: JSON.stringify(intakeNotes),
          consent: true,
        };
        const saved = await submitLeadgenCase("insurance", cid, payload);
        setCaseId(saved);
      } else {
        const leadId = await createMarketingLead({
          contact: {
            fullName: contact.fullName.trim(),
            email: contact.email.trim().toLowerCase(),
            phone: contact.phone?.trim() || "",
            consent: contact.consent,
          },
          interestedIn: ["insurance", selected.id],
          locale,
        });
        setMarketingLeadId(leadId);
      }

      trackProductEvent("product.leadgen.intake.submit", { route: "/app/insurance" });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : common("submitError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen className="space-y-6">
      <Header title={t("title")} subtitle={t("subtitle")} />
      {process.env.NODE_ENV === "development" ? (
        <div className="inline-flex rounded-full border border-fh-primary/40 bg-fh-primary/10 px-3 py-1 text-xs font-semibold text-fh-primary">
          {t("devMarker")}
        </div>
      ) : null}

      <Card className="space-y-3">
        <div className="text-sm font-semibold">{t("sections.private")}</div>
        {Array.from(grouped.get("private")?.entries() ?? []).map(([subsection, items]) => (
          <div key={subsection} className="space-y-2">
            <div className="text-xs uppercase tracking-wide text-fh-muted">{t(`subsections.${subsection}`)}</div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {items.map((product) => {
                const active = selected.id === product.id;
                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => setSelected(product)}
                    className={`rounded-xl border p-3 text-left ${active ? "border-fh-primary bg-fh-primary/10" : "border-fh-border bg-fh-surface hover:bg-fh-surface-2"}`}
                  >
                    <div className="text-sm font-semibold">{t(`products.${product.id}.title`)}</div>
                    <div className="mt-1 text-xs text-fh-muted">{t(`products.${product.id}.teaser`)}</div>
                    <div className="mt-2 text-xs text-fh-muted">{t(`products.${product.id}.highlights`)}</div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </Card>

      <Card className="space-y-3">
        <div className="text-sm font-semibold">{t("sections.business")}</div>
        {Array.from(grouped.get("business")?.entries() ?? []).map(([subsection, items]) => (
          <div key={subsection} className="space-y-2">
            <div className="text-xs uppercase tracking-wide text-fh-muted">{t(`subsections.${subsection}`)}</div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {items.map((product) => {
                const active = selected.id === product.id;
                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => setSelected(product)}
                    className={`rounded-xl border p-3 text-left ${active ? "border-fh-primary bg-fh-primary/10" : "border-fh-border bg-fh-surface hover:bg-fh-surface-2"}`}
                  >
                    <div className="text-sm font-semibold">{t(`products.${product.id}.title`)}</div>
                    <div className="mt-1 text-xs text-fh-muted">{t(`products.${product.id}.teaser`)}</div>
                    <div className="mt-2 text-xs text-fh-muted">{t(`products.${product.id}.highlights`)}</div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </Card>

      <Card className="space-y-4">
        <div className="text-sm font-semibold">{t("calculator.title", { product: t(`products.${selected.id}.title`) })}</div>

        <div className="rounded-xl border border-fh-border bg-fh-surface p-3">
          <div className="text-xs uppercase text-fh-muted">{t("calculator.coverages")}</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {selected.coverages.map((item) => (
              <span key={item} className="rounded-full border border-fh-border bg-fh-bg px-2 py-1 text-xs">
                {t(`coverages.${item}`)}
              </span>
            ))}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <label className="text-xs uppercase text-fh-muted">{t("calculator.assetValue")}</label>
            <input
              type="number"
              min={1000}
              value={assetValue}
              onChange={(e) => setAssetValue(Number(e.target.value) || 0)}
              className="mt-1 w-full rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs uppercase text-fh-muted">{t("calculator.birthDate")}</label>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="mt-1 w-full rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs uppercase text-fh-muted">{t("calculator.monthlyIncome")}</label>
            <input
              type="number"
              min={0}
              value={monthlyIncome}
              onChange={(e) => setMonthlyIncome(Number(e.target.value) || 0)}
              className="mt-1 w-full rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm"
            />
          </div>
        </div>

        {selected.productType === "vehicle" ? (
          <div>
            <label className="text-xs uppercase text-fh-muted">{t("calculator.noClaimsYears")}</label>
            <input
              type="number"
              min={0}
              max={30}
              value={noClaimsYears}
              onChange={(e) => setNoClaimsYears(Number(e.target.value) || 0)}
              className="mt-1 w-full rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm md:max-w-[320px]"
            />
          </div>
        ) : null}

        <label className="flex items-center gap-2 rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm">
          <input
            type="checkbox"
            checked={requestAdvice}
            onChange={(e) => setRequestAdvice(e.target.checked)}
          />
          {t("calculator.requestAdvice")}
        </label>

        {!identity.loading && !identity.loggedIn ? (
          <div className="grid gap-3 rounded-xl border border-fh-border bg-fh-surface p-3 md:grid-cols-2">
            <input
              placeholder={common("fullName")}
              value={contact.fullName}
              onChange={(e) => setContact((prev) => ({ ...prev, fullName: e.target.value }))}
              className="rounded-xl border border-fh-border bg-fh-bg px-3 py-2 text-sm"
            />
            <input
              placeholder={common("email")}
              value={contact.email}
              onChange={(e) => setContact((prev) => ({ ...prev, email: e.target.value }))}
              className="rounded-xl border border-fh-border bg-fh-bg px-3 py-2 text-sm"
            />
            <input
              placeholder={common("phone")}
              value={contact.phone ?? ""}
              onChange={(e) => setContact((prev) => ({ ...prev, phone: e.target.value }))}
              className="rounded-xl border border-fh-border bg-fh-bg px-3 py-2 text-sm md:col-span-2"
            />
            <label className="md:col-span-2 flex items-center gap-2 text-sm text-fh-muted">
              <input
                type="checkbox"
                checked={contact.consent}
                onChange={(e) => setContact((prev) => ({ ...prev, consent: e.target.checked }))}
              />
              {common("consent")}
            </label>
          </div>
        ) : null}

        {!identity.loading && identity.loggedIn ? (
          <InfoBox title={common("authenticated")} variant="info">
            {common("reuseIdentity", { email: identity.email })}
          </InfoBox>
        ) : null}

        {premium !== null ? (
          <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4">
            <div className="text-xs uppercase text-fh-muted">{t("calculator.premiumLabel")}</div>
            <div className="mt-1 text-3xl font-semibold">{euro(premium)}</div>
            <div className="text-xs text-fh-muted">{t("calculator.premiumHint")}</div>
          </div>
        ) : null}

        <div className="text-xs text-fh-muted">
          {common("privacyHint")} <Link href="/privacy" className="underline">{common("privacyLink")}</Link>
        </div>

        {error ? <InfoBox title={common("error")} variant="danger">{error}</InfoBox> : null}

        <div className="flex items-center justify-between">
          <Button variant="secondary" onClick={() => setPremium(null)}>{common("reset")}</Button>
          <Button onClick={() => void onCalculateAndSaveLead()} disabled={busy || identity.loading}>
            {busy ? common("processing") : t("calculator.submit")}
          </Button>
        </div>
      </Card>

      {(caseId || marketingLeadId) ? (
        <Card className="space-y-3">
          <InfoBox title={t("done.title")} variant="info">
            {t("done.body")}
          </InfoBox>

          {caseId ? (
            <Link
              href={`/app/cases/${caseId}`}
              className="inline-flex rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm hover:bg-fh-surface-2"
            >
              {t("done.openCase", { id: caseId.slice(0, 8) })}
            </Link>
          ) : null}

          {marketingLeadId ? <div className="text-sm text-fh-muted">{t("done.leadCreated", { id: marketingLeadId.slice(0, 8) })}</div> : null}
        </Card>
      ) : null}
    </Screen>
  );
}
