"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { Card } from "@/ui/components/Card";
import { Header } from "@/ui/components/Header";
import { InfoBox } from "@/ui/components/InfoBox";
import { Screen } from "@/ui/components/Screen";
import { Button } from "@/ui/components/Button";
import { startLeadgenCase, submitLeadgenCase } from "./leadgenIntakeClient";
import { useLeadIdentity } from "./useLeadIdentity";
import { trackProductEvent } from "@/features/observability/productTelemetry";

type ContactForm = { fullName: string; email: string; phone: string; consent: boolean };

function monthlyToMortgage(income1: number, income2: number, ageYears: number, hasOwnFunds: boolean): number {
  const annual = (income1 + income2) * 12;
  const ageFactor = ageYears < 30 ? 4.7 : ageYears < 40 ? 4.5 : ageYears < 50 ? 4.2 : 3.8;
  const fundsBonus = hasOwnFunds ? 1.06 : 1;
  return Math.max(0, Math.round(annual * ageFactor * fundsBonus));
}

function euro(n: number): string {
  return new Intl.NumberFormat("en-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

export function MortgageCalculatorClient() {
  const identity = useLeadIdentity();
  const [income1, setIncome1] = useState("5000");
  const [income2, setIncome2] = useState("0");
  const [age, setAge] = useState("33");
  const [hasOwnFunds, setHasOwnFunds] = useState(true);
  const [caseId, setCaseId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contact, setContact] = useState<ContactForm>({
    fullName: "",
    email: "",
    phone: "",
    consent: false,
  });

  const estimate = useMemo(() => {
    const i1 = Number(income1) || 0;
    const i2 = Number(income2) || 0;
    const a = Number(age) || 35;
    return monthlyToMortgage(i1, i2, a, hasOwnFunds);
  }, [income1, income2, age, hasOwnFunds]);

  async function onCreateLead() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const cid = caseId ?? (await startLeadgenCase("mortgage"));
      const fullName = identity.loggedIn ? identity.fullName || "Authenticated user" : contact.fullName.trim();
      const email = identity.loggedIn ? identity.email : contact.email.trim().toLowerCase();
      if (!identity.loggedIn) {
        if (!fullName || !email || !contact.consent) throw new Error("Completa nombre, email y consentimiento.");
      }

      const payload = {
        fullName,
        email,
        phone: contact.phone.trim(),
        employmentStatus: "employed",
        yearlyIncomeBand: "50_90k",
        timelineMonths: "3_6",
        hasPartner: Number(income2) > 0,
        notes: JSON.stringify({
          calculator: "mortgage_v2",
          monthlyIncome1: Number(income1) || 0,
          monthlyIncome2: Number(income2) || 0,
          age: Number(age) || 0,
          hasOwnFunds,
          estimatedMaxMortgage: estimate,
        }),
        consent: identity.loggedIn ? true : contact.consent,
      };

      const saved = await submitLeadgenCase("mortgage", cid, payload);
      trackProductEvent("product.leadgen.intake.submit", { route: "/app/mortgage" });
      setCaseId(saved);
      setSubmitted(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "No se pudo crear la solicitud.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen className="space-y-6">
      <Header
        title="Mortgage Calculator"
        subtitle="Flujo estilo Domek: calcula primero tu capacidad hipotecaria y luego solicita acompañamiento."
      />

      <Card className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Monthly gross income (person 1)</label>
            <input className="w-full rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm" value={income1} onChange={(e) => setIncome1(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">Monthly gross income (person 2)</label>
            <input className="w-full rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm" value={income2} onChange={(e) => setIncome2(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">Oldest applicant age</label>
            <input className="w-full rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm" value={age} onChange={(e) => setAge(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm mt-6">
            <input type="checkbox" checked={hasOwnFunds} onChange={(e) => setHasOwnFunds(e.target.checked)} />
            Own funds available for buying costs
          </label>
        </div>

        <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4">
          <div className="text-sm text-fh-muted">Estimated maximum mortgage</div>
          <div className="mt-1 text-3xl font-semibold">{euro(estimate)}</div>
        </div>
      </Card>

      <Card className="space-y-4">
        <div className="text-sm font-semibold">Continue with this estimate</div>
        {identity.loading ? <InfoBox title="Loading" variant="info">Checking session...</InfoBox> : null}
        {!identity.loading && !identity.loggedIn ? (
          <div className="grid gap-3 md:grid-cols-2">
            <input placeholder="Full name" className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm" value={contact.fullName} onChange={(e) => setContact((p) => ({ ...p, fullName: e.target.value }))} />
            <input placeholder="Email" className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm" value={contact.email} onChange={(e) => setContact((p) => ({ ...p, email: e.target.value }))} />
            <input placeholder="Phone (optional)" className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm md:col-span-2" value={contact.phone} onChange={(e) => setContact((p) => ({ ...p, phone: e.target.value }))} />
            <label className="md:col-span-2 flex items-center gap-2 rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm">
              <input type="checkbox" checked={contact.consent} onChange={(e) => setContact((p) => ({ ...p, consent: e.target.checked }))} />
              I agree to be contacted about this mortgage request.
            </label>
          </div>
        ) : null}
        {!identity.loading && identity.loggedIn ? (
          <InfoBox title="Authenticated flow" variant="info">
            You are logged in as {identity.email}. Personal contact details are reused automatically.
          </InfoBox>
        ) : null}
        {error ? <InfoBox title="Error" variant="danger">{error}</InfoBox> : null}
        <Button onClick={() => void onCreateLead()} disabled={busy || identity.loading}>
          {busy ? "Submitting..." : "Start mortgage request"}
        </Button>
      </Card>

      {submitted && caseId ? (
        <Card>
          <InfoBox title="Request created" variant="info">Your mortgage case is ready for advisor follow-up.</InfoBox>
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
