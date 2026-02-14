"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

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

type InsuranceProduct = {
  id: string;
  section: "particular" | "empresa";
  subsection: string;
  title: string;
  teaser: string;
  highlights: string[];
  coverages: string[];
  productType: ProductType;
};

const PRODUCTS: InsuranceProduct[] = [
  {
    id: "car",
    section: "particular",
    subsection: "Vehiculo",
    title: "Seguro de coche",
    teaser: "Ahorra hasta EUR 29/mes y cotiza en menos de 2 minutos.",
    highlights: ["Aceptamos anos sin siniestros", "Atencion en tu idioma", "Alta online rapida"],
    coverages: ["OC", "MiniCasco", "AutoCasco", "Asistencia en carretera"],
    productType: "vehicle",
  },
  {
    id: "moto",
    section: "particular",
    subsection: "Vehiculo",
    title: "Seguro de moto y scooter",
    teaser: "Proteccion flexible para movilidad diaria.",
    highlights: ["Contratacion digital", "Comparativa transparente", "Descuento por historial"],
    coverages: ["Responsabilidad civil", "Robo", "Danos propios"],
    productType: "vehicle",
  },
  {
    id: "life",
    section: "particular",
    subsection: "Vida",
    title: "Seguro de vida",
    teaser: "Protege a tu familia con una cuota mensual predecible.",
    highlights: ["Emision agil", "Cobertura por fallecimiento", "Opcional funeral"],
    coverages: ["Fallecimiento", "Gastos funerarios", "Asesoria familiar"],
    productType: "life",
  },
  {
    id: "home",
    section: "particular",
    subsection: "Hogar",
    title: "Paquete hogar",
    teaser: "Combina hogar, responsabilidad civil y asistencia legal.",
    highlights: ["Plan para inquilino", "Cobertura de bienes", "Soporte de siniestros"],
    coverages: ["Responsabilidad civil", "Accidentes", "Contenido", "Asistencia legal", "Viaje"],
    productType: "home",
  },
  {
    id: "avb",
    section: "empresa",
    subsection: "Responsabilidad",
    title: "AVB empresas",
    teaser: "Blindaje legal para actividad profesional y operativa.",
    highlights: ["Cotizacion rapida", "Coberturas modulares", "Asistencia de reclamaciones"],
    coverages: ["Responsabilidad civil", "Gastos legales", "Danos a terceros"],
    productType: "business",
  },
  {
    id: "zelf",
    section: "empresa",
    subsection: "Autonomos",
    title: "Accidentes autonomos",
    teaser: "Mantiene ingresos ante incapacidad temporal.",
    highlights: ["Para ZZP", "Sin papeleo", "Activacion online"],
    coverages: ["Accidente laboral", "Incapacidad", "Pago diario"],
    productType: "business",
  },
  {
    id: "tools",
    section: "empresa",
    subsection: "Operaciones",
    title: "Herramientas en vehiculo",
    teaser: "Proteccion para herramientas y material de montaje.",
    highlights: ["Robo y danos", "Extensiones por actividad", "Gestion digital"],
    coverages: ["Herramientas", "Material instalado", "Transporte"],
    productType: "business",
  },
];

function euro(n: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(n);
}

export function InsuranceCatalogClient() {
  const identity = useLeadIdentity();

  const [selected, setSelected] = useState<InsuranceProduct>(PRODUCTS[0] as InsuranceProduct);
  const [assetValue, setAssetValue] = useState(18000);
  const [birthDate, setBirthDate] = useState("");
  const [noClaimsYears, setNoClaimsYears] = useState(5);
  const [monthlyIncome, setMonthlyIncome] = useState(3000);
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
    const bySection = new Map<string, Map<string, InsuranceProduct[]>>();
    for (const item of PRODUCTS) {
      if (!bySection.has(item.section)) bySection.set(item.section, new Map());
      const subsectionMap = bySection.get(item.section) as Map<string, InsuranceProduct[]>;
      if (!subsectionMap.has(item.subsection)) subsectionMap.set(item.subsection, []);
      (subsectionMap.get(item.subsection) as InsuranceProduct[]).push(item);
    }
    return bySection;
  }, []);

  async function onCalculateAndSaveLead() {
    if (busy) return;
    setBusy(true);
    setError(null);

    try {
      if (!birthDate) throw new Error("Indica fecha de nacimiento para cotizar.");

      const nextPremium = estimateInsurancePremium({
        productType: selected.productType,
        assetValue,
        birthDate,
        noClaimsYears: selected.productType === "vehicle" ? noClaimsYears : undefined,
      });
      setPremium(nextPremium);

      const intakeNotes = {
        calculator: "insurance_catalog_v3",
        productId: selected.id,
        productTitle: selected.title,
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
        const fullName = contact.fullName.trim();
        const email = contact.email.trim().toLowerCase();
        if (!fullName || !email || !contact.consent) {
          throw new Error("Completa nombre, email y consentimiento RGPD para guardar la cotizacion.");
        }
        const leadId = await createMarketingLead({
          contact: { fullName, email, phone: contact.phone?.trim() || "", consent: contact.consent },
          interestedIn: ["insurance", selected.id],
          locale: "es",
        });
        setMarketingLeadId(leadId);
      }

      trackProductEvent("product.leadgen.intake.submit", { route: "/app/insurance" });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "No se pudo calcular o guardar la cotizacion.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen className="space-y-6">
      <Header
        title="Seguros Pro"
        subtitle="Catalogo estructurado por secciones, con calculadora rapida y conversion a lead."
      />
      {process.env.NODE_ENV === "development" ? (
        <div className="inline-flex rounded-full border border-fh-primary/40 bg-fh-primary/10 px-3 py-1 text-xs font-semibold text-fh-primary">
          Insurance Catalog v1
        </div>
      ) : null}

      <Card className="space-y-3">
        <div className="text-sm font-semibold">Particulares</div>
        {Array.from(grouped.get("particular")?.entries() ?? []).map(([subsection, items]) => (
          <div key={subsection} className="space-y-2">
            <div className="text-xs uppercase tracking-wide text-fh-muted">{subsection}</div>
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
                    <div className="text-sm font-semibold">{product.title}</div>
                    <div className="mt-1 text-xs text-fh-muted">{product.teaser}</div>
                    <div className="mt-2 text-xs text-fh-muted">{product.highlights.join(" • ")}</div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </Card>

      <Card className="space-y-3">
        <div className="text-sm font-semibold">Empresas</div>
        {Array.from(grouped.get("empresa")?.entries() ?? []).map(([subsection, items]) => (
          <div key={subsection} className="space-y-2">
            <div className="text-xs uppercase tracking-wide text-fh-muted">{subsection}</div>
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
                    <div className="text-sm font-semibold">{product.title}</div>
                    <div className="mt-1 text-xs text-fh-muted">{product.teaser}</div>
                    <div className="mt-2 text-xs text-fh-muted">{product.highlights.join(" • ")}</div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </Card>

      <Card className="space-y-4">
        <div className="text-sm font-semibold">Calcular prima: {selected.title}</div>

        <div className="rounded-xl border border-fh-border bg-fh-surface p-3">
          <div className="text-xs uppercase text-fh-muted">Coberturas</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {selected.coverages.map((item) => (
              <span key={item} className="rounded-full border border-fh-border bg-fh-bg px-2 py-1 text-xs">
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <label className="text-xs uppercase text-fh-muted">Valor asegurado (EUR)</label>
            <input
              type="number"
              min={1000}
              value={assetValue}
              onChange={(e) => setAssetValue(Number(e.target.value) || 0)}
              className="mt-1 w-full rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs uppercase text-fh-muted">Fecha de nacimiento</label>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="mt-1 w-full rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs uppercase text-fh-muted">Ingresos mensuales</label>
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
            <label className="text-xs uppercase text-fh-muted">Anos sin siniestros</label>
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
          Quiero que me contacten para cerrar este seguro
        </label>

        {!identity.loading && !identity.loggedIn ? (
          <div className="grid gap-3 rounded-xl border border-fh-border bg-fh-surface p-3 md:grid-cols-2">
            <input
              placeholder="Nombre y apellidos"
              value={contact.fullName}
              onChange={(e) => setContact((prev) => ({ ...prev, fullName: e.target.value }))}
              className="rounded-xl border border-fh-border bg-fh-bg px-3 py-2 text-sm"
            />
            <input
              placeholder="Email"
              value={contact.email}
              onChange={(e) => setContact((prev) => ({ ...prev, email: e.target.value }))}
              className="rounded-xl border border-fh-border bg-fh-bg px-3 py-2 text-sm"
            />
            <input
              placeholder="Telefono"
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
              Acepto politica de privacidad y tratamiento de datos (RGPD).
            </label>
          </div>
        ) : null}

        {!identity.loading && identity.loggedIn ? (
          <InfoBox title="Sesion activa" variant="info">
            Perfil detectado: {identity.email}. No pedimos datos personales de nuevo.
          </InfoBox>
        ) : null}

        {premium !== null ? (
          <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4">
            <div className="text-xs uppercase text-fh-muted">Prima estimada mensual</div>
            <div className="mt-1 text-3xl font-semibold">{euro(premium)}</div>
            <div className="text-xs text-fh-muted">Cotizacion orientativa obtenida en menos de 2 minutos.</div>
          </div>
        ) : null}

        <div className="text-xs text-fh-muted">
          Al cotizar aceptas nuestra politica de privacidad. <Link href="/privacy" className="underline">Ver politica</Link>
        </div>

        {error ? <InfoBox title="Error" variant="danger">{error}</InfoBox> : null}

        <div className="flex items-center justify-between">
          <Button variant="secondary" onClick={() => setPremium(null)}>Reiniciar</Button>
          <Button onClick={() => void onCalculateAndSaveLead()} disabled={busy || identity.loading}>
            {busy ? "Procesando..." : "Calcular prima"}
          </Button>
        </div>
      </Card>

      {(caseId || marketingLeadId) ? (
        <Card className="space-y-3">
          <InfoBox title="Lead guardado" variant="info">
            La cotizacion y datos de interes ya estan en CRM para seguimiento.
          </InfoBox>

          {caseId ? (
            <Link
              href={`/app/cases/${caseId}`}
              className="inline-flex rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm hover:bg-fh-surface-2"
            >
              Abrir caso {caseId.slice(0, 8)}
            </Link>
          ) : null}

          {marketingLeadId ? <div className="text-sm text-fh-muted">Lead CRM: {marketingLeadId.slice(0, 8)}...</div> : null}
        </Card>
      ) : null}
    </Screen>
  );
}
