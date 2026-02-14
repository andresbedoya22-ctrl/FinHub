"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Button } from "@/ui/components/Button";
import { Card } from "@/ui/components/Card";
import { Header } from "@/ui/components/Header";
import { InfoBox } from "@/ui/components/InfoBox";
import { Screen } from "@/ui/components/Screen";
import { DocumentUploader } from "@/features/documents/ui/DocumentUploader";
import { estimateCreditSimulation, mapIncomeBand } from "./leadgenCalculators";
import {
  createMarketingLead,
  startLeadgenCase,
  submitLeadgenCase,
  type LeadContact,
} from "./leadgenIntakeClient";
import { useLeadIdentity } from "./useLeadIdentity";
import { trackProductEvent } from "@/features/observability/productTelemetry";

function euro(n: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(n);
}

type Step = "calc" | "apply" | "done";

export function CreditRequestClient() {
  const identity = useLeadIdentity();

  const [step, setStep] = useState<Step>("calc");
  const [amount, setAmount] = useState(15000);
  const [termMonths, setTermMonths] = useState(60);
  const [annualRatePct, setAnnualRatePct] = useState(7.9);

  const [monthlyIncome, setMonthlyIncome] = useState(3200);
  const [monthlyExpenses, setMonthlyExpenses] = useState(1200);
  const [employmentStatus, setEmploymentStatus] = useState<"employed" | "self_employed" | "student" | "unemployed">("employed");
  const [hasPartner, setHasPartner] = useState(false);

  const [contact, setContact] = useState<LeadContact>({
    fullName: "",
    email: "",
    phone: "",
    consent: false,
  });

  const [signatureName, setSignatureName] = useState("");
  const [signatureAccepted, setSignatureAccepted] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [caseId, setCaseId] = useState<string | null>(null);
  const [marketingLeadId, setMarketingLeadId] = useState<string | null>(null);

  const simulation = useMemo(() => {
    return estimateCreditSimulation({ amount, termMonths, annualRatePct });
  }, [amount, termMonths, annualRatePct]);

  async function onStartApplication() {
    if (busy) return;
    setBusy(true);
    setError(null);

    try {
      if (identity.loggedIn) {
        const cid = caseId ?? (await startLeadgenCase("credit"));
        setCaseId(cid);
      }
      setStep("apply");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "No se pudo iniciar el flujo de credito.");
    } finally {
      setBusy(false);
    }
  }

  async function onSubmitApplication() {
    if (busy) return;
    setBusy(true);
    setError(null);

    try {
      if (!signatureAccepted || signatureName.trim().length < 2) {
        throw new Error("Completa la firma digital para continuar.");
      }

      if (identity.loggedIn) {
        const cid = caseId ?? (await startLeadgenCase("credit"));
        const payload = {
          fullName: identity.fullName || "Authenticated user",
          email: identity.email,
          phone: contact.phone?.trim() || null,
          employmentStatus,
          yearlyIncomeBand: mapIncomeBand(monthlyIncome * 12),
          timelineMonths: termMonths <= 36 ? "0_3" : termMonths <= 72 ? "3_6" : "6_12",
          hasPartner,
          notes: JSON.stringify({
            calculator: "credit_request_v3",
            amount,
            termMonths,
            annualRatePct,
            simulation,
            monthlyIncome,
            monthlyExpenses,
            signatureName: signatureName.trim(),
            digitalSignatureAccepted: signatureAccepted,
            process: "no_paperwork_online_fixed_rate",
          }),
          consent: true,
        };
        const saved = await submitLeadgenCase("credit", cid, payload);
        setCaseId(saved);
      } else {
        const fullName = contact.fullName.trim();
        const email = contact.email.trim().toLowerCase();
        if (!fullName || !email || !contact.consent) {
          throw new Error("Completa nombre, email y consentimiento RGPD para crear el lead.");
        }

        const leadId = await createMarketingLead({
          contact: { fullName, email, phone: contact.phone?.trim() || "", consent: contact.consent },
          interestedIn: ["credit"],
          locale: "es",
        });
        setMarketingLeadId(leadId);
      }

      trackProductEvent("product.leadgen.intake.submit", { route: "/app/credit" });
      setStep("done");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "No se pudo enviar la solicitud de credito.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen className="space-y-6">
      <Header
        title="Creditos Pro"
        subtitle="Calcula en segundos, solicita online, sube documentos y firma digital sin papeleo."
      />
      {process.env.NODE_ENV === "development" ? (
        <div className="inline-flex rounded-full border border-fh-primary/40 bg-fh-primary/10 px-3 py-1 text-xs font-semibold text-fh-primary">
          Credit Flow v1
        </div>
      ) : null}

      {step === "calc" ? (
        <Card className="space-y-5">
          <div className="text-sm font-semibold">Cuanto prestamo necesitas?</div>

          <div className="rounded-2xl border border-fh-border bg-fh-surface p-4">
            <label className="text-xs uppercase text-fh-muted">Monto solicitado</label>
            <input
              type="number"
              min={1000}
              step={500}
              value={amount}
              onChange={(e) => setAmount(Math.max(0, Number(e.target.value) || 0))}
              className="mt-2 w-full rounded-xl border border-fh-border bg-fh-bg px-4 py-4 text-3xl font-semibold"
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-xs uppercase text-fh-muted">Plazo (meses)</label>
              <input
                type="number"
                min={6}
                max={120}
                value={termMonths}
                onChange={(e) => setTermMonths(Number(e.target.value) || 6)}
                className="mt-1 w-full rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs uppercase text-fh-muted">Interes anual (%)</label>
              <input
                type="number"
                min={0}
                max={29.99}
                step={0.1}
                value={annualRatePct}
                onChange={(e) => setAnnualRatePct(Number(e.target.value) || 0)}
                className="mt-1 w-full rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4">
            <div className="text-xs uppercase text-fh-muted">Simulacion</div>
            <div className="mt-2 grid gap-2 sm:grid-cols-3 text-sm">
              <div>Cuota mensual: <span className="font-semibold">{euro(simulation.monthlyInstallment)}</span></div>
              <div>Total a pagar: <span className="font-semibold">{euro(simulation.totalRepayable)}</span></div>
              <div>Interes total: <span className="font-semibold">{euro(simulation.totalInterest)}</span></div>
            </div>
          </div>

          {error ? <InfoBox title="Error" variant="danger">{error}</InfoBox> : null}

          <div className="flex justify-end">
            <Button onClick={() => void onStartApplication()} disabled={busy || amount < 1000}>
              {busy ? "Procesando..." : "Calcular tu prestamo y continuar"}
            </Button>
          </div>
        </Card>
      ) : null}

      {step === "apply" ? (
        <div className="space-y-4">
          <Card className="space-y-4">
            <div className="text-sm font-semibold">Solicitud online</div>
            <div className="grid gap-3 md:grid-cols-2">
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
              <div>
                <label className="text-xs uppercase text-fh-muted">Gastos mensuales fijos</label>
                <input
                  type="number"
                  min={0}
                  value={monthlyExpenses}
                  onChange={(e) => setMonthlyExpenses(Number(e.target.value) || 0)}
                  className="mt-1 w-full rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs uppercase text-fh-muted">Situacion laboral</label>
                <select
                  value={employmentStatus}
                  onChange={(e) => setEmploymentStatus(e.target.value as typeof employmentStatus)}
                  className="mt-1 w-full rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm"
                >
                  <option value="employed">Empleado</option>
                  <option value="self_employed">Autonomo</option>
                  <option value="student">Estudiante</option>
                  <option value="unemployed">Desempleado</option>
                </select>
              </div>
              <label className="mt-6 flex items-center gap-2 rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={hasPartner}
                  onChange={(e) => setHasPartner(e.target.checked)}
                />
                Solicitud con pareja
              </label>
            </div>

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
              <InfoBox title="Perfil reutilizado" variant="info">
                Sesion detectada: {identity.email}. No pedimos datos personales de nuevo.
              </InfoBox>
            ) : null}

            <div className="rounded-xl border border-fh-border bg-fh-surface p-3">
              <div className="text-sm font-medium">Firma digital</div>
              <div className="mt-2 grid gap-3 md:grid-cols-2">
                <input
                  placeholder="Escribe tu nombre como firma"
                  value={signatureName}
                  onChange={(e) => setSignatureName(e.target.value)}
                  className="rounded-xl border border-fh-border bg-fh-bg px-3 py-2 text-sm"
                />
                <label className="flex items-center gap-2 rounded-xl border border-fh-border bg-fh-bg px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={signatureAccepted}
                    onChange={(e) => setSignatureAccepted(e.target.checked)}
                  />
                  Confirmo firma digital de esta solicitud
                </label>
              </div>
            </div>

            <div className="text-xs text-fh-muted">
              Sin papeleo fisico. Todo se procesa online con tasa fija y transparente. <Link href="/privacy" className="underline">Politica de privacidad</Link>
            </div>

            {error ? <InfoBox title="Error" variant="danger">{error}</InfoBox> : null}

            <div className="flex items-center justify-between">
              <Button variant="ghost" onClick={() => setStep("calc")}>Atras</Button>
              <Button onClick={() => void onSubmitApplication()} disabled={busy || identity.loading}>
                {busy ? "Enviando..." : "Enviar solicitud de credito"}
              </Button>
            </div>
          </Card>

          {identity.loggedIn && caseId ? (
            <DocumentUploader caseId={caseId} />
          ) : (
            <InfoBox title="Documentos" variant="warning">
              Inicia sesion para subir identificacion, nominas y documentos del prestamo dentro del caso.
            </InfoBox>
          )}
        </div>
      ) : null}

      {step === "done" ? (
        <Card className="space-y-3">
          <InfoBox title="Solicitud registrada" variant="info">
            Tu solicitud de credito se registro correctamente.
          </InfoBox>

          {caseId ? (
            <Link
              href={`/app/cases/${caseId}`}
              className="inline-flex rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm hover:bg-fh-surface-2"
            >
              Abrir caso {caseId.slice(0, 8)}
            </Link>
          ) : null}

          {marketingLeadId ? (
            <div className="text-sm text-fh-muted">Lead CRM: {marketingLeadId.slice(0, 8)}...</div>
          ) : null}
        </Card>
      ) : null}
    </Screen>
  );
}
