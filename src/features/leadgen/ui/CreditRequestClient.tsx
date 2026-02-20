"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { Button } from "@/ui/components/Button";
import { Card } from "@/ui/components/Card";
import { Header } from "@/ui/components/Header";
import { InfoBox } from "@/ui/components/InfoBox";
import { Screen } from "@/ui/components/Screen";
import { DocumentUploader } from "@/features/documents/ui/DocumentUploader";
import { startLeadgenCase, submitLeadgenCase } from "./leadgenIntakeClient";
import { useLeadIdentity } from "./useLeadIdentity";
import { trackProductEvent } from "@/features/observability/productTelemetry";

type ContactForm = { fullName: string; email: string; phone: string; consent: boolean };

function euro(n: number): string {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

function estimateCredit(monthlyIncome: number, housing: number, loans: number): number {
  const capacity = Math.max(0, monthlyIncome - housing - loans);
  return Math.round(capacity * 24);
}

export function CreditRequestClient() {
  const identity = useLeadIdentity();
  const [income, setIncome] = useState("3200");
  const [partnerIncome, setPartnerIncome] = useState("0");
  const [housingCost, setHousingCost] = useState("1200");
  const [existingLoans, setExistingLoans] = useState("200");
  const [requestedAmount, setRequestedAmount] = useState("15000");
  const [caseId, setCaseId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contact, setContact] = useState<ContactForm>({ fullName: "", email: "", phone: "", consent: false });

  const affordability = useMemo(() => {
    const totalIncome = (Number(income) || 0) + (Number(partnerIncome) || 0);
    return estimateCredit(totalIncome, Number(housingCost) || 0, Number(existingLoans) || 0);
  }, [income, partnerIncome, housingCost, existingLoans]);

  async function onSubmit() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const cid = caseId ?? (await startLeadgenCase("credit"));
      const fullName = identity.loggedIn ? identity.fullName || "Authenticated user" : contact.fullName.trim();
      const email = identity.loggedIn ? identity.email : contact.email.trim().toLowerCase();
      if (!identity.loggedIn && (!fullName || !email || !contact.consent)) {
        throw new Error("Completa nombre, email y consentimiento para continuar.");
      }

      const payload = {
        fullName,
        email,
        phone: contact.phone.trim(),
        employmentStatus: "employed",
        yearlyIncomeBand: "25_50k",
        timelineMonths: "0_3",
        hasPartner: Number(partnerIncome) > 0,
        notes: JSON.stringify({
          calculator: "credit_v2",
          monthlyIncome: Number(income) || 0,
          partnerIncome: Number(partnerIncome) || 0,
          housingCost: Number(housingCost) || 0,
          existingLoans: Number(existingLoans) || 0,
          affordability,
          requestedAmount: Number(requestedAmount) || 0,
        }),
        consent: identity.loggedIn ? true : contact.consent,
      };

      const saved = await submitLeadgenCase("credit", cid, payload);
      trackProductEvent("product.leadgen.intake.submit", { route: "/app/credit" });
      setCaseId(saved);
      setSubmitted(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "No se pudo crear la solicitud de crédito.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen className="space-y-6">
      <Header
        title="Credit Request"
        subtitle="Calcula capacidad de crédito, envía solicitud y sube documentos en el mismo flujo."
      />

      <Card className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <input placeholder="Monthly net income" className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm" value={income} onChange={(e) => setIncome(e.target.value)} />
          <input placeholder="Partner net income (optional)" className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm" value={partnerIncome} onChange={(e) => setPartnerIncome(e.target.value)} />
          <input placeholder="Monthly housing cost" className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm" value={housingCost} onChange={(e) => setHousingCost(e.target.value)} />
          <input placeholder="Other loan obligations / month" className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm" value={existingLoans} onChange={(e) => setExistingLoans(e.target.value)} />
          <input placeholder="Requested amount" className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm md:col-span-2" value={requestedAmount} onChange={(e) => setRequestedAmount(e.target.value)} />
        </div>
        <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4">
          <div className="text-sm text-fh-muted">Estimated affordable credit</div>
          <div className="mt-1 text-3xl font-semibold">{euro(affordability)}</div>
        </div>
      </Card>

      <Card className="space-y-4">
        <div className="text-sm font-semibold">Submit credit request</div>
        {!identity.loading && !identity.loggedIn ? (
          <div className="grid gap-3 md:grid-cols-2">
            <input placeholder="Full name" className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm" value={contact.fullName} onChange={(e) => setContact((p) => ({ ...p, fullName: e.target.value }))} />
            <input placeholder="Email" className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm" value={contact.email} onChange={(e) => setContact((p) => ({ ...p, email: e.target.value }))} />
            <input placeholder="Phone (optional)" className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm md:col-span-2" value={contact.phone} onChange={(e) => setContact((p) => ({ ...p, phone: e.target.value }))} />
            <label className="md:col-span-2 flex items-center gap-2 rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm">
              <input type="checkbox" checked={contact.consent} onChange={(e) => setContact((p) => ({ ...p, consent: e.target.checked }))} />
              I agree to be contacted for this credit request.
            </label>
          </div>
        ) : null}
        {!identity.loading && identity.loggedIn ? (
          <InfoBox title="Authenticated flow" variant="info">
            Logged in as {identity.email}. We will reuse your account identity automatically.
          </InfoBox>
        ) : null}
        {error ? <InfoBox title="Error" variant="danger">{error}</InfoBox> : null}
        <Button onClick={() => void onSubmit()} disabled={busy || identity.loading}>
          {busy ? "Submitting..." : "Send credit request"}
        </Button>
      </Card>

      {submitted && caseId ? (
        <>
          <Card>
            <InfoBox title="Request created" variant="info">
              Your credit case is now active. Upload documents now to speed up review.
            </InfoBox>
            <div className="mt-3">
              <Link href={`/app/cases/${caseId}`} className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm hover:bg-fh-surface-2">
                Open case {caseId.slice(0, 8)}
              </Link>
            </div>
          </Card>
          <DocumentUploader caseId={caseId} />
        </>
      ) : null}
    </Screen>
  );
}
