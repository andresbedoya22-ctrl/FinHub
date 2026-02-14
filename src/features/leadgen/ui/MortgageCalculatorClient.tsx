"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Button } from "@/ui/components/Button";
import { Card } from "@/ui/components/Card";
import { Header } from "@/ui/components/Header";
import { InfoBox } from "@/ui/components/InfoBox";
import { Screen } from "@/ui/components/Screen";
import {
  estimateMortgageCapacity,
  mapIncomeBand,
  type MortgageBuyerInput,
} from "./leadgenCalculators";
import {
  createMarketingLead,
  startLeadgenCase,
  submitLeadgenCase,
  type LeadContact,
} from "./leadgenIntakeClient";
import { useLeadIdentity } from "./useLeadIdentity";
import { trackProductEvent } from "@/features/observability/productTelemetry";

type WizardStep = "buyers" | "buyers_data" | "result" | "contact" | "done";

function euro(value: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function buildEmptyBuyer(): MortgageBuyerInput {
  return {
    grossIncome: 5000,
    incomePeriod: "monthly",
    birthDate: "",
    selfEmployed: false,
  };
}

export function MortgageCalculatorClient() {
  const identity = useLeadIdentity();

  const [step, setStep] = useState<WizardStep>("buyers");
  const [buyersCount, setBuyersCount] = useState(1);
  const [activeBuyerIdx, setActiveBuyerIdx] = useState(0);
  const [buyers, setBuyers] = useState<MortgageBuyerInput[]>([buildEmptyBuyer()]);
  const [hasOwnFunds, setHasOwnFunds] = useState(true);
  const [timelineMonths, setTimelineMonths] = useState<"0_3" | "3_6" | "6_12" | "12_plus">("3_6");

  const [contact, setContact] = useState<LeadContact>({
    fullName: "",
    email: "",
    phone: "",
    consent: false,
  });

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [caseId, setCaseId] = useState<string | null>(null);
  const [marketingLeadId, setMarketingLeadId] = useState<string | null>(null);

  const estimate = useMemo(() => estimateMortgageCapacity(buyers.slice(0, buyersCount), hasOwnFunds), [buyers, buyersCount, hasOwnFunds]);

  const wizardProgress = useMemo(() => {
    const total = buyersCount + 3;
    const current =
      step === "buyers" ? 1 :
      step === "buyers_data" ? 1 + activeBuyerIdx + 1 :
      step === "result" ? buyersCount + 2 :
      step === "contact" ? buyersCount + 3 :
      total;
    return { current, total };
  }, [activeBuyerIdx, buyersCount, step]);

  const activeBuyer = buyers[activeBuyerIdx] ?? buildEmptyBuyer();

  function ensureBuyerRows(nextCount: number) {
    const out: MortgageBuyerInput[] = [];
    for (let i = 0; i < nextCount; i += 1) {
      out.push(buyers[i] ?? buildEmptyBuyer());
    }
    setBuyers(out);
  }

  function updateBuyer(index: number, patch: Partial<MortgageBuyerInput>) {
    setBuyers((prev) => {
      const next = [...prev];
      next[index] = { ...(next[index] ?? buildEmptyBuyer()), ...patch };
      return next;
    });
  }

  function canContinueBuyerData(index: number): boolean {
    const buyer = buyers[index];
    if (!buyer) return false;
    return buyer.grossIncome > 0 && buyer.birthDate.length >= 10;
  }

  function nextFromBuyerData() {
    if (!canContinueBuyerData(activeBuyerIdx)) return;
    if (activeBuyerIdx + 1 < buyersCount) {
      setActiveBuyerIdx((v) => v + 1);
      return;
    }
    setStep("result");
  }

  function backFromBuyerData() {
    if (activeBuyerIdx > 0) {
      setActiveBuyerIdx((v) => v - 1);
      return;
    }
    setStep("buyers");
  }

  async function persistLeadAndCase() {
    if (busy) return;
    setBusy(true);
    setError(null);

    try {
      const annualIncome = estimate.annualHouseholdIncome;
      const selectedBuyers = buyers.slice(0, buyersCount);
      const employmentStatus = selectedBuyers.some((b) => b.selfEmployed) ? "self_employed" : "employed";

      if (identity.loggedIn) {
        const cid = caseId ?? (await startLeadgenCase("mortgage"));
        const payload = {
          fullName: identity.fullName || "Authenticated user",
          email: identity.email,
          phone: contact.phone?.trim() || null,
          employmentStatus,
          yearlyIncomeBand: mapIncomeBand(annualIncome),
          timelineMonths,
          hasPartner: buyersCount > 1,
          notes: JSON.stringify({
            calculator: "mortgage_multi_step_v3",
            buyersCount,
            buyers: selectedBuyers,
            hasOwnFunds,
            estimate,
          }),
          consent: true,
        };
        const saved = await submitLeadgenCase("mortgage", cid, payload);
        setCaseId(saved);
      } else {
        const fullName = contact.fullName.trim();
        const email = contact.email.trim().toLowerCase();
        if (!fullName || !email || !contact.consent) {
          throw new Error("Completa nombre, email y consentimiento RGPD para continuar.");
        }

        const leadId = await createMarketingLead({
          contact: { fullName, email, phone: contact.phone?.trim() || "", consent: contact.consent },
          interestedIn: ["mortgage"],
          locale: "es",
        });
        setMarketingLeadId(leadId);
      }

      trackProductEvent("product.leadgen.intake.submit", { route: "/app/mortgage" });
      setStep("done");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "No se pudo completar la solicitud hipotecaria.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen className="space-y-6">
      <Header
        title="Hipoteca Pro"
        subtitle="Calculadora paso a paso inspirada en Domek: clara, rapida y orientada a conversion."
      />

      <Card className="space-y-2">
        <div className="text-xs uppercase tracking-wide text-fh-muted">Progreso</div>
        <div className="h-2 w-full rounded-full bg-fh-surface-2">
          <div
            className="h-2 rounded-full bg-fh-primary transition-all"
            style={{ width: `${Math.round((wizardProgress.current / wizardProgress.total) * 100)}%` }}
          />
        </div>
        <div className="text-xs text-fh-muted">
          Paso {wizardProgress.current} de {wizardProgress.total}
        </div>
      </Card>

      {step === "buyers" ? (
        <Card className="space-y-4">
          <div className="text-sm font-semibold">Cuantos compradores participan?</div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[1, 2, 3, 4].map((count) => (
              <button
                key={count}
                type="button"
                onClick={() => {
                  setBuyersCount(count);
                  ensureBuyerRows(count);
                }}
                className={`rounded-xl border px-3 py-3 text-sm font-semibold ${buyersCount === count ? "border-fh-primary bg-fh-primary/10" : "border-fh-border bg-fh-surface"}`}
              >
                {count} comprador{count > 1 ? "es" : ""}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-end">
            <Button
              onClick={() => {
                setActiveBuyerIdx(0);
                setStep("buyers_data");
              }}
            >
              Continuar
            </Button>
          </div>
        </Card>
      ) : null}

      {step === "buyers_data" ? (
        <Card className="space-y-4">
          <div className="text-sm font-semibold">Datos del comprador {activeBuyerIdx + 1}</div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs uppercase text-fh-muted">Ingresos brutos</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={0}
                  value={activeBuyer.grossIncome}
                  onChange={(e) => updateBuyer(activeBuyerIdx, { grossIncome: Number(e.target.value) || 0 })}
                  className="w-full rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm"
                />
                <div className="inline-flex rounded-xl border border-fh-border bg-fh-surface p-1">
                  {(["monthly", "annual"] as const).map((period) => (
                    <button
                      key={period}
                      type="button"
                      onClick={() => updateBuyer(activeBuyerIdx, { incomePeriod: period })}
                      className={`rounded-lg px-3 py-1 text-xs ${activeBuyer.incomePeriod === period ? "bg-fh-primary text-fh-primaryFg" : "text-fh-muted"}`}
                    >
                      {period === "monthly" ? "Mensual" : "Anual"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase text-fh-muted">Fecha de nacimiento</label>
              <input
                type="date"
                value={activeBuyer.birthDate}
                onChange={(e) => updateBuyer(activeBuyerIdx, { birthDate: e.target.value })}
                className="w-full rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase text-fh-muted">Tiene empresa?</label>
              <div className="inline-flex rounded-xl border border-fh-border bg-fh-surface p-1">
                {[false, true].map((flag) => (
                  <button
                    key={String(flag)}
                    type="button"
                    onClick={() => updateBuyer(activeBuyerIdx, { selfEmployed: flag })}
                    className={`rounded-lg px-3 py-1 text-xs ${activeBuyer.selfEmployed === flag ? "bg-fh-primary text-fh-primaryFg" : "text-fh-muted"}`}
                  >
                    {flag ? "Si" : "No"}
                  </button>
                ))}
              </div>
            </div>

            <label className="md:col-span-2 flex items-center gap-2 rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={hasOwnFunds}
                onChange={(e) => setHasOwnFunds(e.target.checked)}
              />
              Tengo fondos propios para gastos de compra
            </label>
          </div>

          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={backFromBuyerData}>Atras</Button>
            <Button onClick={nextFromBuyerData} disabled={!canContinueBuyerData(activeBuyerIdx)}>Siguiente</Button>
          </div>
        </Card>
      ) : null}

      {step === "result" ? (
        <Card className="space-y-4">
          <div className="text-sm font-semibold">Resultado estimado</div>
          <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4">
            <div className="text-xs uppercase text-fh-muted">Capacidad hipotecaria estimada</div>
            <div className="mt-1 text-3xl font-semibold">{euro(estimate.maxMortgage)}</div>
            <div className="mt-1 text-xs text-fh-muted">
              Basado en {buyersCount} comprador(es), ingresos anuales {euro(estimate.annualHouseholdIncome)} y edad maxima {estimate.oldestAge}.
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-fh-border bg-fh-surface p-3 text-sm">Hasta 0.75% descuento negociado con partners.</div>
            <div className="rounded-xl border border-fh-border bg-fh-surface p-3 text-sm">Asesoria en tu idioma durante todo el proceso.</div>
            <div className="rounded-xl border border-fh-border bg-fh-surface p-3 text-sm">Respuesta inicial en menos de 24h laborables.</div>
          </div>

          <div className="rounded-xl border border-fh-border bg-fh-surface p-3 text-sm text-fh-muted">
            "Nos ayudaron a cerrar la hipoteca sin papeleo infinito y con claridad en cada paso." - Cliente FinHub
          </div>

          <div className="space-y-2">
            <label className="text-xs uppercase text-fh-muted">Cuando quieres comprar?</label>
            <select
              value={timelineMonths}
              onChange={(e) => setTimelineMonths(e.target.value as "0_3" | "3_6" | "6_12" | "12_plus")}
              className="w-full rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm"
            >
              <option value="0_3">0-3 meses</option>
              <option value="3_6">3-6 meses</option>
              <option value="6_12">6-12 meses</option>
              <option value="12_plus">12+ meses</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => setStep("buyers_data")}>Atras</Button>
            <Button onClick={() => setStep("contact")}>Continuar con asesoria</Button>
          </div>
        </Card>
      ) : null}

      {step === "contact" ? (
        <Card className="space-y-4">
          <div className="text-sm font-semibold">Datos para crear tu lead hipotecario</div>

          {identity.loading ? <InfoBox title="Sesion" variant="info">Validando sesion...</InfoBox> : null}

          {!identity.loading && identity.loggedIn ? (
            <InfoBox title="Usuario autenticado" variant="info">
              Usaremos automaticamente tu perfil ({identity.email}).
            </InfoBox>
          ) : null}

          {!identity.loading && !identity.loggedIn ? (
            <div className="grid gap-3 md:grid-cols-2">
              <input
                placeholder="Nombre y apellidos"
                value={contact.fullName}
                onChange={(e) => setContact((prev) => ({ ...prev, fullName: e.target.value }))}
                className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm"
              />
              <input
                placeholder="Email"
                value={contact.email}
                onChange={(e) => setContact((prev) => ({ ...prev, email: e.target.value }))}
                className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm"
              />
              <input
                placeholder="Telefono"
                value={contact.phone ?? ""}
                onChange={(e) => setContact((prev) => ({ ...prev, phone: e.target.value }))}
                className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm md:col-span-2"
              />
              <label className="md:col-span-2 flex items-center gap-2 rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={contact.consent}
                  onChange={(e) => setContact((prev) => ({ ...prev, consent: e.target.checked }))}
                />
                Acepto el uso de datos segun RGPD para gestionar esta solicitud.
              </label>
            </div>
          ) : null}

          <div className="text-xs text-fh-muted">
            Al continuar aceptas nuestra politica de privacidad. <Link href="/privacy" className="underline">Ver politica</Link>
          </div>

          {error ? <InfoBox title="Error" variant="danger">{error}</InfoBox> : null}

          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => setStep("result")}>Atras</Button>
            <Button onClick={() => void persistLeadAndCase()} disabled={busy || identity.loading}>
              {busy ? "Guardando..." : "Finalizar calculo y crear lead"}
            </Button>
          </div>
        </Card>
      ) : null}

      {step === "done" ? (
        <Card className="space-y-3">
          <InfoBox title="Proceso completado" variant="info">
            Tu lead hipotecario fue creado y el equipo puede continuar contigo.
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

          {!identity.loggedIn ? (
            <InfoBox title="Siguiente paso" variant="warning">
              Para continuar con documentos y seguimiento de caso, inicia sesion.
            </InfoBox>
          ) : null}
        </Card>
      ) : null}
    </Screen>
  );
}

