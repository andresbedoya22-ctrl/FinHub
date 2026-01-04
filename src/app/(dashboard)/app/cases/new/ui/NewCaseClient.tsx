"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { CaseType } from "@/features/cases/casesTypes";
import { defaultTitleForCaseType } from "@/features/cases/casesConfig";
import { useCases } from "@/features/cases/casesStore";

const OPTIONS: { value: CaseType; label: string }[] = [
  { value: "toeslag_huur", label: "Huurtoeslag" },
  { value: "toeslag_zorg", label: "Zorgtoeslag" },
  { value: "toeslag_kinderopvang", label: "Kinderopvangtoeslag" },
  { value: "tax_ib", label: "IB Aangifte" },
  { value: "tax_voorlopige_aanslag", label: "Voorlopige aanslag" },
  { value: "finances_intake", label: "Finanzas personales (intake)" },
  { value: "document_review", label: "Revisión de documentos" },
];

export function NewCaseClient() {
  const router = useRouter();
  const createCase = useCases((s) => s.createCase);

  const [type, setType] = useState<CaseType>("toeslag_huur");
  const [title, setTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const placeholder = useMemo(() => defaultTitleForCaseType(type), [type]);

  async function onCreate() {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErr(null);

    try {
      const id = await createCase(type, title);
      router.push(`/app/cases/${id}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error desconocido al crear el caso";
      setErr(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <label className="text-sm font-medium">Tipo</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as CaseType)}
          className="w-full rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-fh-accent/30"
        >
          {OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Título (opcional)</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-fh-accent/30"
        />
      </div>

      {err ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm">
          {err}
        </div>
      ) : null}

      <button
        onClick={() => void onCreate()}
        disabled={isSubmitting}
        className="w-full rounded-xl bg-fh-accent px-4 py-2 text-sm font-medium text-white hover:opacity-95 disabled:opacity-60"
      >
        {isSubmitting ? "Creando..." : "Crear y abrir"}
      </button>
    </div>
  );
}
