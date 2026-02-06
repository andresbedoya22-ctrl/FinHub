"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { useCases } from "@/features/cases/casesStore";
import { isLockedStepKey, normalizeStepKey } from "@/features/cases/steps";
import { getStepData, upsertStepData } from "@/features/cases/caseStepDataClient";
import { usePaymentStatus } from "@/features/payments/usePaymentStatus";
import { getMySubsidyApplicationByCaseId } from "@/lib/db/subsidies/client";
import type { SubsidyApplication } from "@/domain/subsidies/types";
import { SubsidyEligibilityStep } from "@/features/subsidies-case/ui/SubsidyEligibilityStep";
import { SubsidyResultStep } from "@/features/subsidies-case/ui/SubsidyResultStep";
import { SubsidyCheckoutStep } from "@/features/subsidies-case/ui/SubsidyCheckoutStep";
import { SubsidyAuthorizationStep } from "@/features/subsidies-case/ui/SubsidyAuthorizationStep";
import { SubsidyDocumentsStep } from "@/features/subsidies-case/ui/SubsidyDocumentsStep";
import { SubsidyReviewStep } from "@/features/subsidies-case/ui/SubsidyReviewStep";
import { SubsidyDoneStep } from "@/features/subsidies-case/ui/SubsidyDoneStep";

import { Screen } from "@/ui/components/Screen";
import { Header } from "@/ui/components/Header";
import { Card } from "@/ui/components/Card";
import { InfoBox } from "@/ui/components/InfoBox";

type TextPayload = { text: string };

function safeStringify(value: unknown) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "";
  }
}
function isTextPayload(v: unknown): v is TextPayload {
  if (!v || typeof v !== "object") return false;
  return "text" in v && typeof (v as Record<string, unknown>).text === "string";
}

function extractTextFromPayload(payload: unknown): string {
  if (isTextPayload(payload)) return payload.text;

  if (typeof payload === "string") return payload;
  if (payload && typeof payload === "object") return safeStringify(payload);
  return "";
}

export function StepClient({ caseId, stepKey }: { caseId: string; stepKey: string }) {
  const c = useCases((s) => s.getCase(caseId));
  const setStepKey = useCases((s) => s.setStepKey);

  const normalizedStep = useMemo(() => normalizeStepKey(stepKey), [stepKey]);
  const isSubsidyCase = c?.type === "toeslagen";

  const { state: payStateRaw } = usePaymentStatus(caseId);
  const paid = Boolean(payStateRaw?.paid);
  const payLoading = Boolean(payStateRaw?.loading);

  const [application, setApplication] = useState<SubsidyApplication | null>(null);
  const [applicationLoading, setApplicationLoading] = useState(isSubsidyCase);
  const [applicationError, setApplicationError] = useState<string | null>(null);

  const [text, setText] = useState("");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [isLoadingDraft, setIsLoadingDraft] = useState(true);
  const [draftError, setDraftError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    if (isSubsidyCase) {
      setText("");
      setDraftError(null);
      setIsLoadingDraft(false);
      return () => {
        alive = false;
      };
    }

    (async () => {
      try {
        const row = await getStepData(caseId, normalizedStep);
        if (!alive) return;

        const loaded = row ? extractTextFromPayload(row.data) : "";
        setText(loaded);
        setDraftError(null);
        setIsLoadingDraft(false);
      } catch (e) {
        if (!alive) return;
        setDraftError(e instanceof Error ? e.message : "Error loading draft");
        setIsLoadingDraft(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [caseId, normalizedStep, isSubsidyCase]);

  useEffect(() => {
    let alive = true;
    if (!isSubsidyCase) {
      setApplication(null);
      setApplicationLoading(false);
      setApplicationError(null);
      return () => {
        alive = false;
      };
    }

    setApplicationLoading(true);
    setApplicationError(null);
    (async () => {
      try {
        const app = await getMySubsidyApplicationByCaseId(caseId);
        if (!alive) return;
        setApplication(app);
      } catch (e) {
        if (!alive) return;
        setApplicationError(e instanceof Error ? e.message : "Error loading subsidy application");
      } finally {
        if (alive) setApplicationLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [caseId, isSubsidyCase]);

  useEffect(() => {
    if (isLoadingDraft || isSubsidyCase) return;

    const t = setTimeout(() => {
      void (async () => {
        try {
          await upsertStepData(caseId, normalizedStep, { text });
          setSavedAt(new Date());
        } catch {
          // no rompemos UX por fallo de red
        }
      })();
    }, 450);

    return () => clearTimeout(t);
  }, [caseId, normalizedStep, text, isLoadingDraft, isSubsidyCase]);

  if (!c) {
    return (
      <Screen className="space-y-6">
        <Header
          title="Step"
          subtitle="Caso no encontrado"
          right={
            <Link
              href="/app/cases"
              className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm hover:bg-fh-surface-2"
            >
              Volver
            </Link>
          }
        />
        <Card>
          <InfoBox title="No encontrado" variant="warning">
            Este case no existe (o fue eliminado).
          </InfoBox>
        </Card>
      </Screen>
    );
  }

  if (isSubsidyCase) {
    const locked = isLockedStepKey(normalizedStep) && !paid && !payLoading;

    if (payLoading) {
      return (
        <Screen className="space-y-6">
          <Header
            title={`${c.title} - ${normalizedStep}`}
            subtitle="Verificando pago..."
            right={
              <Link
                href={`/app/cases/${c.id}`}
                className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm hover:bg-fh-surface-2"
              >
                Volver al caso
              </Link>
            }
          />
          <Card>
            <InfoBox title="Pago en verificacion" variant="info">
              Estamos verificando el estado del pago.
            </InfoBox>
          </Card>
        </Screen>
      );
    }

    if (locked) {
      return (
        <Screen className="space-y-6">
          <Header
            title={`${c.title} - ${normalizedStep}`}
            subtitle="Acceso bloqueado"
            right={
              <Link
                href={`/app/cases/${c.id}`}
                className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm hover:bg-fh-surface-2"
              >
                Volver al caso
              </Link>
            }
          />
          <Card>
            <InfoBox title="Pago requerido" variant="warning">
              Debes completar el pago para acceder a este paso.
            </InfoBox>
          </Card>
          <div className="flex gap-2">
            <Link
              href={`/app/cases/${caseId}/checkout`}
              className="rounded-xl bg-fh-primary px-4 py-2 text-sm font-medium text-fh-primaryFg hover:opacity-90"
            >
              Ir a checkout
            </Link>
          </div>
        </Screen>
      );
    }

    if (applicationLoading) {
      return (
        <Screen className="space-y-6">
          <Header
            title={`${c.title} - ${normalizedStep}`}
            subtitle="Cargando aplicacion..."
            right={
              <Link
                href={`/app/cases/${c.id}`}
                className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm hover:bg-fh-surface-2"
              >
                Volver al caso
              </Link>
            }
          />
          <Card>
            <InfoBox title="Cargando" variant="info">
              Obteniendo datos de tu solicitud de subsidio.
            </InfoBox>
          </Card>
        </Screen>
      );
    }

    if (applicationError || !application) {
      return (
        <Screen className="space-y-6">
          <Header
            title={`${c.title} - ${normalizedStep}`}
            subtitle="Aplicacion no encontrada"
            right={
              <Link
                href={`/app/cases/${c.id}`}
                className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm hover:bg-fh-surface-2"
              >
                Volver al caso
              </Link>
            }
          />
          <Card>
            <InfoBox title="Sin aplicacion" variant="warning">
              {applicationError ?? "No pudimos cargar la aplicacion de subsidio."}
            </InfoBox>
          </Card>
        </Screen>
      );
    }

    switch (normalizedStep) {
      case "intake":
      case "eligibility":
        return <SubsidyEligibilityStep application={application} caseId={caseId} />;
      case "result":
        return <SubsidyResultStep application={application} caseId={caseId} />;
      case "checkout":
        return <SubsidyCheckoutStep application={application} caseId={caseId} />;
      case "authorization":
        return <SubsidyAuthorizationStep application={application} caseId={caseId} />;
      case "documents":
        return <SubsidyDocumentsStep application={application} caseId={caseId} />;
      case "review":
      case "submitted":
        return <SubsidyReviewStep application={application} caseId={caseId} />;
      case "done":
        return <SubsidyDoneStep application={application} />;
      default:
        return (
          <Screen className="space-y-6">
            <Header
              title={`${c.title} - ${normalizedStep}`}
              subtitle="Paso no soportado"
              right={
                <Link
                  href={`/app/cases/${c.id}`}
                  className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm hover:bg-fh-surface-2"
                >
                  Volver al caso
                </Link>
              }
            />
            <Card>
              <InfoBox title="Paso invalido" variant="warning">
                Este paso no esta disponible para el caso de subsidios.
              </InfoBox>
            </Card>
          </Screen>
        );
    }
  }

  return (
    <Screen className="space-y-6">
      <Header
        title={`${c.title} - ${normalizedStep}`}
        subtitle={
          isLoadingDraft
            ? "Cargando draft..."
            : draftError
              ? `Error: ${draftError}`
              : savedAt
                ? "Autosave: Guardado"
                : "Autosave: pendiente"
        }
        right={
          <Link
            href={`/app/cases/${c.id}`}
            className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm hover:bg-fh-surface-2"
          >
            Volver al caso
          </Link>
        }
      />

      <Card className="space-y-3">
        <InfoBox title="Draft (DB)" variant="info">
          Este contenido se guarda en Supabase (case_step_data) para simular autosave del wizard.
        </InfoBox>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="min-h-[260px] w-full rounded-xl border border-fh-border bg-fh-surface p-3 text-sm outline-none focus:ring-2 focus:ring-fh-border"
          placeholder="Escribe notas/datos del step. (Placeholder v1)"
          disabled={isLoadingDraft}
        />

        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm hover:bg-fh-surface-2 disabled:opacity-50"
            disabled={isLoadingDraft}
            onClick={() => {
              void (async () => {
                await upsertStepData(caseId, normalizedStep, { text });
                setSavedAt(new Date());
              })();
            }}
          >
            Guardar ahora
          </button>

          <button
            className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm hover:bg-fh-surface-2"
            onClick={() => {
              void setStepKey(caseId, normalizedStep);
            }}
          >
            Siguiente {"->"}
          </button>
        </div>
      </Card>
    </Screen>
  );
}
