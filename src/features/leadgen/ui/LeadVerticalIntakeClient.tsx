"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import type { LeadgenVertical } from "@/features/verticals/server";
import { trackProductEvent } from "@/features/observability/productTelemetry";
import { Card } from "@/ui/components/Card";
import { Header } from "@/ui/components/Header";
import { InfoBox } from "@/ui/components/InfoBox";
import { Screen } from "@/ui/components/Screen";
import { Button } from "@/ui/components/Button";

type LeadFormState = {
  fullName: string;
  email: string;
  phone: string;
  employmentStatus: "employed" | "self_employed" | "student" | "unemployed";
  yearlyIncomeBand: "lt_25k" | "25_50k" | "50_90k" | "90k_plus";
  timelineMonths: "0_3" | "3_6" | "6_12" | "12_plus";
  hasPartner: boolean;
  notes: string;
  consent: boolean;
};

function copyFor(vertical: LeadgenVertical) {
  if (vertical === "mortgage") {
    return {
      title: "Mortgage Lead v1",
      subtitle: "Intake mínimo para hipoteca con tracking start/submit/abandon y case sync-ready.",
    };
  }
  if (vertical === "credit") {
    return {
      title: "Credit Lead v1",
      subtitle: "Intake mínimo para crédito con creación de case y handoff operativo.",
    };
  }
  return {
    title: "Insurance Lead v1",
    subtitle: "Intake mínimo para seguros con case operativo y trazabilidad completa.",
  };
}

export function LeadVerticalIntakeClient({ vertical }: { vertical: LeadgenVertical }) {
  const c = useMemo(() => copyFor(vertical), [vertical]);

  const [form, setForm] = useState<LeadFormState>({
    fullName: "",
    email: "",
    phone: "",
    employmentStatus: "employed",
    yearlyIncomeBand: "25_50k",
    timelineMonths: "3_6",
    hasPartner: false,
    notes: "",
    consent: false,
  });
  const [caseId, setCaseId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    trackProductEvent("product.leadgen.intake.start", { route: `/app/${vertical}` });
    void fetch("/api/verticals/intake", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "start", vertical }),
    })
      .then(async (res) => {
        const json = (await res.json().catch(() => null)) as { ok?: boolean; caseId?: string | null } | null;
        if (res.ok && json?.ok && json.caseId) {
          setCaseId(json.caseId);
        }
      })
      .catch(() => undefined);
  }, [vertical]);

  useEffect(() => {
    return () => {
      if (submitted) return;
      trackProductEvent("product.leadgen.intake.abandon", { route: `/app/${vertical}` });
      void fetch("/api/verticals/intake", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "abandon", vertical, caseId }),
        keepalive: true,
      }).catch(() => undefined);
    };
  }, [caseId, submitted, vertical]);

  async function onSubmit() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/verticals/intake", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "submit",
          vertical,
          caseId,
          payload: form,
        }),
      });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; caseId?: string | null; error?: string } | null;
      if (!res.ok || !json?.ok || !json.caseId) {
        setError(json?.error ?? "No se pudo enviar el intake.");
        return;
      }
      trackProductEvent("product.leadgen.intake.submit", { route: `/app/${vertical}` });
      setCaseId(json.caseId);
      setSubmitted(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "No se pudo enviar el intake.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen className="space-y-6">
      <Header title={c.title} subtitle={c.subtitle} />

      {error ? (
        <Card>
          <InfoBox title="Error" variant="danger">{error}</InfoBox>
        </Card>
      ) : null}

      <Card className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm font-medium">Nombre completo</label>
            <input value={form.fullName} onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))} className="w-full rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Email</label>
            <input value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} className="w-full rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Teléfono (opcional)</label>
            <input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} className="w-full rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Situación laboral</label>
            <select value={form.employmentStatus} onChange={(e) => setForm((p) => ({ ...p, employmentStatus: e.target.value as LeadFormState["employmentStatus"] }))} className="w-full rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm">
              <option value="employed">Empleado</option>
              <option value="self_employed">Autónomo</option>
              <option value="student">Estudiante</option>
              <option value="unemployed">Desempleado</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Rango de ingresos anuales</label>
            <select value={form.yearlyIncomeBand} onChange={(e) => setForm((p) => ({ ...p, yearlyIncomeBand: e.target.value as LeadFormState["yearlyIncomeBand"] }))} className="w-full rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm">
              <option value="lt_25k">Menos de 25k</option>
              <option value="25_50k">25k - 50k</option>
              <option value="50_90k">50k - 90k</option>
              <option value="90k_plus">Más de 90k</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Cuándo quieres avanzar</label>
            <select value={form.timelineMonths} onChange={(e) => setForm((p) => ({ ...p, timelineMonths: e.target.value as LeadFormState["timelineMonths"] }))} className="w-full rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm">
              <option value="0_3">0-3 meses</option>
              <option value="3_6">3-6 meses</option>
              <option value="6_12">6-12 meses</option>
              <option value="12_plus">12+ meses</option>
            </select>
          </div>
        </div>

        <label className="flex items-center gap-2 rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm">
          <input type="checkbox" checked={form.hasPartner} onChange={(e) => setForm((p) => ({ ...p, hasPartner: e.target.checked }))} />
          Tengo pareja/co-aplicante
        </label>

        <div className="space-y-1">
          <label className="text-sm font-medium">Notas (opcional)</label>
          <textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} className="min-h-[96px] w-full rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm" />
        </div>

        <label className="flex items-center gap-2 rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm">
          <input type="checkbox" checked={form.consent} onChange={(e) => setForm((p) => ({ ...p, consent: e.target.checked }))} />
          Confirmo que la información es correcta y autorizo contacto operativo.
        </label>

        <Button onClick={() => void onSubmit()} disabled={busy}>
          {busy ? "Enviando..." : "Enviar intake"}
        </Button>
      </Card>

      {submitted && caseId ? (
        <Card>
          <InfoBox title="Intake enviado" variant="info">
            Caso creado y listo para backoffice/sync.
          </InfoBox>
          <div className="mt-3">
            <Link href={`/app/cases/${caseId}`} className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm hover:bg-fh-surface-2">
              Abrir caso {caseId.slice(0, 8)}
            </Link>
          </div>
        </Card>
      ) : null}
    </Screen>
  );
}
