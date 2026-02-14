"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { Button } from "@/ui/components/Button";
import { Card } from "@/ui/components/Card";
import { Header } from "@/ui/components/Header";
import { InfoBox } from "@/ui/components/InfoBox";
import { Screen } from "@/ui/components/Screen";
import { startLeadgenCase, submitLeadgenCase } from "./leadgenIntakeClient";
import { useLeadIdentity } from "./useLeadIdentity";
import { trackProductEvent } from "@/features/observability/productTelemetry";

type Product = {
  key: string;
  section: string;
  name: string;
  teaser: string;
  baseMonthly: number;
};

const PRODUCTS: Product[] = [
  { key: "health_basic", section: "Health", name: "Basic Health Insurance", teaser: "Avoid high medical costs with mandatory NL health cover.", baseMonthly: 145 },
  { key: "health_dental", section: "Health", name: "Dental Add-on", teaser: "Protect against expensive dental treatments and emergencies.", baseMonthly: 22 },
  { key: "home_contents", section: "Home", name: "Home Contents", teaser: "Cover theft, fire and water damage inside your home.", baseMonthly: 14 },
  { key: "liability", section: "Home", name: "Personal Liability", teaser: "Stay protected against accidental damage claims.", baseMonthly: 8 },
  { key: "car_wa", section: "Mobility", name: "Car WA + Casco", teaser: "Protect your car and avoid unexpected liability payments.", baseMonthly: 62 },
  { key: "bike", section: "Mobility", name: "Bike Insurance", teaser: "Cover theft and damage for your bike or e-bike.", baseMonthly: 11 },
  { key: "travel", section: "Lifestyle", name: "Travel Insurance", teaser: "Get assistance and cost protection while abroad.", baseMonthly: 9 },
  { key: "income_protection", section: "Income", name: "Income Protection", teaser: "Secure monthly income if you become unable to work.", baseMonthly: 48 },
];

function estimatePremium(base: number, age: number, household: number, deductible: number): number {
  const ageFactor = age <= 30 ? 0.92 : age <= 45 ? 1 : age <= 60 ? 1.12 : 1.25;
  const householdFactor = household > 1 ? 1 + (household - 1) * 0.08 : 1;
  const deductibleFactor = deductible >= 500 ? 0.88 : deductible >= 250 ? 0.94 : 1;
  return Math.max(4, Math.round(base * ageFactor * householdFactor * deductibleFactor));
}

export function InsuranceCatalogClient() {
  const identity = useLeadIdentity();
  const [age, setAge] = useState("34");
  const [household, setHousehold] = useState("2");
  const [deductible, setDeductible] = useState("385");
  const [selected, setSelected] = useState<Product>(PRODUCTS[0] as Product);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [caseId, setCaseId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const map = new Map<string, Product[]>();
    for (const p of PRODUCTS) {
      if (!map.has(p.section)) map.set(p.section, []);
      map.get(p.section)?.push(p);
    }
    return Array.from(map.entries());
  }, []);

  const premium = useMemo(() => {
    return estimatePremium(
      selected.baseMonthly,
      Number(age) || 34,
      Number(household) || 1,
      Number(deductible) || 385
    );
  }, [selected, age, household, deductible]);

  async function onSubmitLead() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const cid = await startLeadgenCase("insurance");
      const nameOut = identity.loggedIn ? identity.fullName || "Authenticated user" : fullName.trim();
      const emailOut = identity.loggedIn ? identity.email : email.trim().toLowerCase();
      if (!identity.loggedIn && (!nameOut || !emailOut || !consent)) {
        throw new Error("Completa nombre, email y consentimiento.");
      }
      const payload = {
        fullName: nameOut,
        email: emailOut,
        phone: phone.trim(),
        employmentStatus: "employed",
        yearlyIncomeBand: "25_50k",
        timelineMonths: "0_3",
        hasPartner: Number(household) > 1,
        notes: JSON.stringify({
          calculator: "insurance_v2",
          product: selected.key,
          productName: selected.name,
          age: Number(age) || 0,
          household: Number(household) || 1,
          deductible: Number(deductible) || 385,
          estimatedPremiumMonthly: premium,
        }),
        consent: identity.loggedIn ? true : consent,
      };
      const saved = await submitLeadgenCase("insurance", cid, payload);
      trackProductEvent("product.leadgen.intake.submit", { route: "/app/insurance" });
      setCaseId(saved);
      setSubmitted(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "No se pudo enviar la solicitud.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen className="space-y-6">
      <Header
        title="Insurance Marketplace"
        subtitle="Catálogo por secciones + micro-calculadora para estimar prima y convertir a lead."
      />

      {grouped.map(([section, items]) => (
        <Card key={section} className="space-y-3">
          <div className="text-sm font-semibold">{section}</div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {items.map((p) => {
              const active = selected.key === p.key;
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setSelected(p)}
                  className={`rounded-xl border p-3 text-left ${active ? "border-emerald-400/50 bg-emerald-400/10" : "border-fh-border bg-fh-surface hover:bg-fh-surface-2"}`}
                >
                  <div className="text-sm font-medium">{p.name}</div>
                  <div className="mt-1 text-xs text-fh-muted">{p.teaser}</div>
                </button>
              );
            })}
          </div>
        </Card>
      ))}

      <Card className="space-y-4">
        <div className="text-sm font-semibold">Estimate monthly premium for: {selected.name}</div>
        <div className="grid gap-3 md:grid-cols-3">
          <input value={age} onChange={(e) => setAge(e.target.value)} placeholder="Age" className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm" />
          <input value={household} onChange={(e) => setHousehold(e.target.value)} placeholder="Household size" className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm" />
          <input value={deductible} onChange={(e) => setDeductible(e.target.value)} placeholder="Deductible" className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm" />
        </div>
        <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4">
          <div className="text-sm text-fh-muted">Estimated premium/month</div>
          <div className="mt-1 text-3xl font-semibold">EUR {premium}</div>
        </div>
      </Card>

      <Card className="space-y-4">
        <div className="text-sm font-semibold">Request advice for this insurance</div>
        {!identity.loading && !identity.loggedIn ? (
          <div className="grid gap-3 md:grid-cols-2">
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name" className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm" />
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm" />
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone (optional)" className="md:col-span-2 rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm" />
            <label className="md:col-span-2 flex items-center gap-2 rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              I agree to be contacted for insurance advice.
            </label>
          </div>
        ) : null}
        {!identity.loading && identity.loggedIn ? (
          <InfoBox title="Authenticated flow" variant="info">
            Logged in as {identity.email}. Contact details are reused automatically.
          </InfoBox>
        ) : null}
        {error ? <InfoBox title="Error" variant="danger">{error}</InfoBox> : null}
        <Button onClick={() => void onSubmitLead()} disabled={busy || identity.loading}>
          {busy ? "Submitting..." : "Request insurance callback"}
        </Button>
      </Card>

      {submitted && caseId ? (
        <Card>
          <InfoBox title="Request created" variant="info">Insurance request created and assigned to operations.</InfoBox>
          <div className="mt-3">
            <Link href={`/app/cases/${caseId}`} className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm hover:bg-fh-surface-2">
              Open case {caseId.slice(0, 8)}
            </Link>
          </div>
        </Card>
      ) : null}
    </Screen>
  );
}
