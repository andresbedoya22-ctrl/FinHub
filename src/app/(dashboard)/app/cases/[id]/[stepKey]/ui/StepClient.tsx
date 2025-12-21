"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import type { StepKey } from "@/features/cases/casesTypes";
import { InfoBox } from "@/ui/components/InfoBox";
import { useCases } from "@/features/cases/casesStore";

function safeStringify(v: unknown) {
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return "";
  }
}

export function StepClient({
  caseId,
  stepKey,
}: {
  caseId: string;
  stepKey: string;
}) {
  const router = useRouter();
  const { getCase, getDraft, saveDraft, setStep } = useCases();

  const c = getCase(caseId);
  const normalizedStep = stepKey as StepKey;

  const initialText = useMemo(() => {
    const draft = getDraft(caseId, normalizedStep);
    if (typeof draft === "string") return draft;
    if (draft && typeof draft === "object") return safeStringify(draft);
    return "";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId, normalizedStep]);

  const [value, setValue] = useState(initialText);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");

  const timerRef = useRef<number | null>(null);

  // Si cambias de step, refrescamos el textarea con el draft del nuevo step.
  useEffect(() => {
    setValue(initialText);
    setStatus("idle");
  }, [initialText]);

  // Autosave con debounce
  useEffect(() => {
    if (!c) return;

    // Limpia timer previo
    if (timerRef.current) window.clearTimeout(timerRef.current);

    setStatus("saving");
    timerRef.current = window.setTimeout(() => {
      saveDraft(caseId, normalizedStep, value);
      setStatus("saved");
      timerRef.current = null;
    }, 700);

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, caseId, normalizedStep]);

  if (!c) {
    return (
      <InfoBox title="No encontrado" variant="warning">
        Este case no existe.
      </InfoBox>
    );
  }

  const stepIndex = c.steps.findIndex((s) => s.key === normalizedStep);
  const prev = stepIndex > 0 ? c.steps[stepIndex - 1] : null;
  const next =
    stepIndex >= 0 && stepIndex < c.steps.length - 1
      ? c.steps[stepIndex + 1]
      : null;

  if (stepIndex < 0) {
    return (
      <InfoBox title="Step inválido" variant="warning">
        Este step no pertenece a este case.
      </InfoBox>
    );
  }

  const statusLabel =
    status === "saving" ? "Guardando…" : status === "saved" ? "Guardado" : "—";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-semibold">
          {c.title} — {c.steps[stepIndex]?.label}
        </div>
        <div className="text-xs text-fh-muted">Autosave: {statusLabel}</div>
      </div>

      <InfoBox title="Draft local" variant="info">
        Este contenido se guarda en localStorage para simular el autosave del wizard.
      </InfoBox>

      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={10}
        placeholder="Escribe notas/datos del step. (Placeholder v1)"
        className="w-full rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-fh-accent/30"
      />

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => saveDraft(caseId, normalizedStep, value)}
          className="rounded-xl bg-fh-accent px-4 py-2 text-sm font-medium text-white hover:opacity-95"
        >
          Guardar ahora
        </button>

        {prev ? (
          <button
            onClick={() => {
              setStep(caseId, prev.key);
              router.push(`/app/cases/${caseId}/${prev.key}`);
            }}
            className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm hover:bg-fh-surface-2"
          >
            ← Anterior
          </button>
        ) : null}

        {next ? (
          <button
            onClick={() => {
              setStep(caseId, next.key);
              router.push(`/app/cases/${caseId}/${next.key}`);
            }}
            className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm hover:bg-fh-surface-2"
          >
            Siguiente →
          </button>
        ) : (
          <button
            onClick={() => router.push(`/app/cases/${caseId}`)}
            className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm hover:bg-fh-surface-2"
          >
            Finalizar
          </button>
        )}
      </div>
    </div>
  );
}
