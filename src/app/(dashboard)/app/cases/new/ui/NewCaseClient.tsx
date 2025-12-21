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
  const { createCase } = useCases();

  const [type, setType] = useState<CaseType>("toeslag_huur");
  const [title, setTitle] = useState("");

  const placeholder = useMemo(() => defaultTitleForCaseType(type), [type]);

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

      <button
        onClick={() => {
          const id = createCase(type, title);
          router.push(`/app/cases/${id}`);
        }}
        className="w-full rounded-xl bg-fh-accent px-4 py-2 text-sm font-medium text-white hover:opacity-95"
      >
        Crear y abrir
      </button>
    </div>
  );
}
