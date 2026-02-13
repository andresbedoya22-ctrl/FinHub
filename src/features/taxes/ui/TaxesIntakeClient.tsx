"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import type { CaseDetail } from "@/features/cases/casesTypes";
import { trackProductEvent } from "@/features/observability/productTelemetry";
import { Card } from "@/ui/components/Card";
import { Header } from "@/ui/components/Header";
import { InfoBox } from "@/ui/components/InfoBox";
import { Screen } from "@/ui/components/Screen";
import { Button } from "@/ui/components/Button";

type TaxesIntake = {
  fiscalYear: number;
  hasPartner: boolean;
  hasFreelanceIncome: boolean;
  hasOwnHome: boolean;
  hasForeignIncome: boolean;
  wantsTaxCreditsReview: boolean;
  notes: string;
};

type TaxesBootstrapResponse = {
  ok: boolean;
  case: CaseDetail | null;
  intake?: Partial<TaxesIntake> | null;
  error?: string;
};

const CURRENT_YEAR = new Date().getFullYear();

export function TaxesIntakeClient() {
  const [form, setForm] = useState<TaxesIntake>({
    fiscalYear: CURRENT_YEAR - 1,
    hasPartner: false,
    hasFreelanceIncome: false,
    hasOwnHome: false,
    hasForeignIncome: false,
    wantsTaxCreditsReview: true,
    notes: "",
  });
  const [caseDetail, setCaseDetail] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [handoffBusy, setHandoffBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const hasServiceConsent = useMemo(
    () => Boolean(caseDetail?.consents.some((c) => c.consentType === "service_authorization" && c.granted)),
    [caseDetail]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/taxes/intake", { method: "GET" });
      const json = (await res.json().catch(() => null)) as TaxesBootstrapResponse | null;
      if (!res.ok || !json?.ok) {
        setError(json?.error ?? "No se pudo cargar Taxes Pro.");
        return;
      }
      setCaseDetail(json.case ?? null);
      if (json.intake) {
        setForm((prev) => ({
          ...prev,
          fiscalYear: Number(json.intake?.fiscalYear ?? prev.fiscalYear),
          hasPartner: json.intake?.hasPartner === true,
          hasFreelanceIncome: json.intake?.hasFreelanceIncome === true,
          hasOwnHome: json.intake?.hasOwnHome === true,
          hasForeignIncome: json.intake?.hasForeignIncome === true,
          wantsTaxCreditsReview: json.intake?.wantsTaxCreditsReview !== false,
          notes: typeof json.intake?.notes === "string" ? json.intake.notes : prev.notes,
        }));
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "No se pudo cargar Taxes Pro.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function submitIntake() {
    if (busy) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/taxes/intake", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; case?: CaseDetail | null; error?: string } | null;
      if (!res.ok || !json?.ok || !json.case) {
        setError(json?.error ?? "No se pudo guardar el intake de impuestos.");
        return;
      }
      trackProductEvent("product.taxes.intake.submit", { route: "/app/taxes" });
      setCaseDetail(json.case);
      setSuccess("Intake guardado y checklist creado.");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "No se pudo guardar el intake de impuestos.");
    } finally {
      setBusy(false);
    }
  }

  async function authorizeCase() {
    if (!caseDetail?.id || authBusy || hasServiceConsent) return;
    setAuthBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/cases/${encodeURIComponent(caseDetail.id)}/consents`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          consentType: "service_authorization",
          granted: true,
          source: "taxes_pro_v1",
          version: 1,
        }),
      });
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(json?.error ?? "No se pudo registrar la autorización.");
        return;
      }
      await load();
      setSuccess("Autorización registrada correctamente.");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "No se pudo registrar la autorización.");
    } finally {
      setAuthBusy(false);
    }
  }

  async function handoffToOperations() {
    if (!caseDetail?.id || handoffBusy) return;
    setHandoffBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/cases/${encodeURIComponent(caseDetail.id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          status: "ready_for_review",
          stepKey: "eligibility",
        }),
      });
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(json?.error ?? "No se pudo enviar el caso a operación.");
        return;
      }
      await load();
      setSuccess("Caso enviado a operación correctamente.");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "No se pudo enviar el caso a operación.");
    } finally {
      setHandoffBusy(false);
    }
  }

  return (
    <Screen className="space-y-6">
      <Header
        title="Taxes Pro v1"
        subtitle="Intake fiscal, checklist documental y autorización integrada para pasar a operación."
        right={
          caseDetail ? (
            <Link href={`/app/cases/${caseDetail.id}`} className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm hover:bg-fh-surface-2">
              Abrir caso
            </Link>
          ) : null
        }
      />

      {loading ? (
        <Card>
          <InfoBox title="Cargando" variant="info">Cargando estado de Taxes Pro...</InfoBox>
        </Card>
      ) : null}

      {error ? (
        <Card>
          <InfoBox title="Error" variant="danger">{error}</InfoBox>
        </Card>
      ) : null}

      {success ? (
        <Card>
          <InfoBox title="OK" variant="info">{success}</InfoBox>
        </Card>
      ) : null}

      <Card className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm font-medium">Año fiscal</label>
            <input
              type="number"
              min={2020}
              max={2035}
              value={form.fiscalYear}
              onChange={(e) => setForm((prev) => ({ ...prev, fiscalYear: Number(e.target.value) }))}
              className="w-full rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-fh-accent/30"
            />
          </div>
          <label className="flex items-center gap-2 rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm">
            <input type="checkbox" checked={form.hasPartner} onChange={(e) => setForm((prev) => ({ ...prev, hasPartner: e.target.checked }))} />
            Tengo pareja fiscal
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm">
            <input type="checkbox" checked={form.hasFreelanceIncome} onChange={(e) => setForm((prev) => ({ ...prev, hasFreelanceIncome: e.target.checked }))} />
            Tengo ingresos freelance / ZZP
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm">
            <input type="checkbox" checked={form.hasOwnHome} onChange={(e) => setForm((prev) => ({ ...prev, hasOwnHome: e.target.checked }))} />
            Tengo vivienda propia / hipoteca
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm">
            <input type="checkbox" checked={form.hasForeignIncome} onChange={(e) => setForm((prev) => ({ ...prev, hasForeignIncome: e.target.checked }))} />
            Tuve ingresos del extranjero
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm">
            <input type="checkbox" checked={form.wantsTaxCreditsReview} onChange={(e) => setForm((prev) => ({ ...prev, wantsTaxCreditsReview: e.target.checked }))} />
            Quiero revisión de deducciones/créditos
          </label>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Notas (opcional)</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
            className="min-h-[100px] w-full rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-fh-accent/30"
            placeholder="Contexto adicional para el equipo fiscal"
          />
        </div>

        <Button onClick={() => void submitIntake()} disabled={busy}>
          {busy ? "Guardando..." : "Guardar intake de Taxes Pro"}
        </Button>
      </Card>

      <Card className="space-y-3">
        <div className="text-sm font-semibold">Autorización de servicio</div>
        <InfoBox title={hasServiceConsent ? "Autorizado" : "Pendiente"} variant={hasServiceConsent ? "info" : "warning"}>
          {hasServiceConsent
            ? "Ya existe consentimiento para operar tu caso de impuestos."
            : "Necesitas autorizar para que el equipo procese y envíe el caso en tu nombre."}
        </InfoBox>
        <Button variant="secondary" disabled={!caseDetail || authBusy || hasServiceConsent} onClick={() => void authorizeCase()}>
          {authBusy ? "Registrando autorización..." : hasServiceConsent ? "Autorización ya otorgada" : "Autorizar servicio ahora"}
        </Button>
      </Card>

      <Card className="space-y-3">
        <div className="text-sm font-semibold">Checklist documental</div>
        {!caseDetail || caseDetail.tasks.length === 0 ? (
          <InfoBox title="Sin checklist" variant="warning">Guarda el intake para generar automáticamente el checklist.</InfoBox>
        ) : (
          <div className="space-y-2">
            {caseDetail.tasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm">
                <span>{task.title}</span>
                <span className="text-xs text-fh-muted">{task.status}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="space-y-3">
        <div className="text-sm font-semibold">Paso final</div>
        <InfoBox title="Handoff a operación" variant={hasServiceConsent ? "info" : "warning"}>
          {hasServiceConsent
            ? "Con autorización lista, puedes enviar el caso a revisión operativa."
            : "Primero autoriza el servicio para permitir el envío a operación."}
        </InfoBox>
        <Button
          disabled={!caseDetail || !hasServiceConsent || handoffBusy}
          onClick={() => void handoffToOperations()}
        >
          {handoffBusy ? "Enviando a operación..." : "Enviar caso a operación"}
        </Button>
      </Card>
    </Screen>
  );
}
