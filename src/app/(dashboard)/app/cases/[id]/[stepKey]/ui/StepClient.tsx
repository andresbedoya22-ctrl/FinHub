"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { useCases } from "@/features/cases/casesStore";
import { normalizeStepKey } from "@/features/cases/steps";
import { getStepData, upsertStepData } from "@/features/cases/caseStepDataClient";

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
  // Convención v1: guardamos { text: string }
  if (isTextPayload(payload)) return payload.text;

  if (typeof payload === "string") return payload;
  if (payload && typeof payload === "object") return safeStringify(payload);
  return "";
}

export function StepClient({ caseId, stepKey }: { caseId: string; stepKey: string }) {
  const c = useCases((s) => s.getCase(caseId));
  const setStepKey = useCases((s) => s.setStepKey);

  const normalizedStep = useMemo(() => normalizeStepKey(stepKey), [stepKey]);

  // Nota lint: evitamos setState síncrono dentro del effect.
  const [text, setText] = useState("");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [isLoadingDraft, setIsLoadingDraft] = useState(true);
  const [draftError, setDraftError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

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
  }, [caseId, normalizedStep]);

  useEffect(() => {
    // autosave (debounce) a DB
    if (isLoadingDraft) return;

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
  }, [caseId, normalizedStep, text, isLoadingDraft]);

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
            Siguiente →
          </button>
        </div>
      </Card>
    </Screen>
  );
}
