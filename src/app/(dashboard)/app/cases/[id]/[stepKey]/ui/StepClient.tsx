"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { useCaseDrafts } from "@/features/cases/caseDraftsStore";
import { useCases } from "@/features/cases/casesStore";

import { Screen } from "@/ui/components/Screen";
import { Header } from "@/ui/components/Header";
import { Card } from "@/ui/components/Card";
import { InfoBox } from "@/ui/components/InfoBox";

function safeStringify(value: unknown) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "";
  }
}

function normalizeStepKey(stepKey: string) {
  return String(stepKey || "").trim().toLowerCase();
}

export function StepClient({ caseId, stepKey }: { caseId: string; stepKey: string }) {
  const c = useCases((s) => s.getCase(caseId));
  const setStepKey = useCases((s) => s.setStepKey);

  const getDraft = useCaseDrafts((s) => s.getDraft);
  const setDraft = useCaseDrafts((s) => s.setDraft);

  const normalizedStep = normalizeStepKey(stepKey);

  const initialText = useMemo(() => {
    const draft = getDraft(caseId, normalizedStep);
    if (typeof draft === "string") return draft;
    if (draft && typeof draft === "object") return safeStringify(draft);
    return "";
  }, [caseId, normalizedStep, getDraft]);

  const [text, setText] = useState(initialText);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  useEffect(() => {
    // cuando cambias de step, refresca el textarea
    setText(initialText);
  }, [initialText]);

  useEffect(() => {
    // autosave simple (debounce)
    const t = setTimeout(() => {
      setDraft(caseId, normalizedStep, text);
      setSavedAt(new Date());
    }, 350);
    return () => clearTimeout(t);
  }, [caseId, normalizedStep, text, setDraft]);

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

  return (
    <Screen className="space-y-6">
      <Header
        title={`${c.title} · ${normalizedStep}`}
        subtitle={savedAt ? `Autosave: Guardado` : "Autosave: pendiente"}
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
        <InfoBox title="Draft local" variant="info">
          Este contenido se guarda en localStorage para simular el autosave del wizard.
        </InfoBox>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="min-h-[260px] w-full rounded-xl border border-fh-border bg-fh-surface p-3 text-sm outline-none focus:ring-2 focus:ring-fh-border"
          placeholder="Escribe notas/datos del step. (Placeholder v1)"
        />

        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm hover:bg-fh-surface-2"
            onClick={() => {
              setDraft(caseId, normalizedStep, text);
              setSavedAt(new Date());
            }}
          >
            Guardar ahora
          </button>

          <button
            className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm hover:bg-fh-surface-2"
            onClick={() => {
              // avanzar un step "naive": solo marca el stepKey en DB como el actual
              // (la navegación real por steps se hace desde CaseOverview links)
              void setStepKey(caseId, normalizedStep);
            }}
          >
            Siguiente →
          </button>
        </div>
      </Card>
    </Screen>
  );
}