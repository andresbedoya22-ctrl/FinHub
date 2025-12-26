"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useCases } from "@/features/cases/casesStore";
import { stepsForCaseType, getCurrentAndNextStep } from "@/features/cases/steps";
import { useDocuments } from "@/features/documents/documentsStore";
import { Card } from "@/ui/components/Card";
import { InfoBox } from "@/ui/components/InfoBox";

function pill(text: string) {
  return <span className="rounded-xl border border-fh-border bg-fh-surface px-2 py-1 text-xs">{text}</span>;
}

export function CaseOverviewClient({ caseId }: { caseId: string }) {
  const c = useCases((s) => s.getCase(caseId));
  const setStatus = useCases((s) => s.setStatus);
  const setStepKey = useCases((s) => s.setStepKey);

  const { state: docsState } = useDocuments();

  const docsForCase = useMemo(() => {
    const arr = docsState.documents.filter((d) => (d.caseId ?? "") === caseId);
    return arr.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  }, [docsState.documents, caseId]);

  if (!c) {
    return (
      <Card>
        <InfoBox title="No encontrado" variant="warning">
          Este caso no existe (o fue eliminado).
        </InfoBox>
      </Card>
    );
  }

  const steps = stepsForCaseType(String(c.type));
  const { current, next } = getCurrentAndNextStep(steps, c.stepKey);

  async function startCheckout() {
    try {
      const safeCaseId = c?.id;
      if (!safeCaseId) {
        alert("Caso no encontrado.");
        return;
      }

      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ caseId: safeCaseId, productKey: "case_unlock" }),
      });

      const json = (await res.json().catch(() => null)) as { ok?: boolean; url?: string; error?: string } | null;
      if (!res.ok || !json?.ok || !json.url) {
        const msg = json?.error || "No se pudo iniciar el checkout.";
        alert(msg);
        return;
      }

      window.location.href = json.url;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error desconocido";
      alert(msg);
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-sm">
        <div className="font-semibold">{c.title}</div>
        <div className="opacity-80">type: {String(c.type)} Â· status: {c.status} Â· step: {c.stepKey}</div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm hover:bg-fh-surface-2"
          onClick={() => void setStepKey(c.id, next.key)}
        >
          Continuar
        </button>

        <button
          className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm hover:bg-fh-surface-2"
          onClick={() => void startCheckout()}
        >
          Pagar
        </button>

        <Link
          href={`/app/cases/${c.id}/${current.key}`}
          className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm hover:bg-fh-surface-2"
        >
          Ir al step actual
        </Link>

        <button
          className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm hover:bg-fh-surface-2"
          onClick={() => void setStatus(c.id, "under_review")}
        >
          Marcar "under_review"
        </button>

        <button
          className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm hover:bg-fh-surface-2"
          onClick={() => void setStatus(c.id, "completed")}
        >
          Marcar "completed"
        </button>
      </div>

      <Card className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold">Documentos vinculados</div>
          <Link className="underline text-sm" href={`/app/documents?caseId=${c.id}`}>
            Abrir Vault filtrado
          </Link>
        </div>

        <div className="flex flex-wrap gap-2">
          {pill(`${docsForCase.length} docs`)}
          {docsForCase.length ? pill("Ãºltimos cambios arriba") : null}
        </div>

        {docsForCase.length === 0 ? (
          <InfoBox title="VacÃ­o" variant="warning">
            Este caso aÃºn no tiene documentos asignados.
          </InfoBox>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left opacity-80">
                <tr>
                  <th className="py-2 pr-4">Archivo</th>
                  <th className="py-2 pr-4">Tipo</th>
                  <th className="py-2 pr-4">Estado</th>
                  <th className="py-2 pr-0">Actualizado</th>
                </tr>
              </thead>
              <tbody>
                {docsForCase.slice(0, 10).map((d) => (
                  <tr key={d.id} className="border-t border-fh-border">
                    <td className="py-2 pr-4">{d.fileName}</td>
                    <td className="py-2 pr-4">{d.type}</td>
                    <td className="py-2 pr-4">{d.status}</td>
                    <td className="py-2 pr-0">{new Date(d.updatedAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="space-y-3">
        <div className="text-sm font-semibold">Pasos</div>
        <div className="flex flex-wrap gap-2">
          {steps.map((s) => (
            <Link
              key={s.key}
              href={`/app/cases/${c.id}/${s.key}`}
              className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm hover:bg-fh-surface-2"
            >
              {s.label}
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}



