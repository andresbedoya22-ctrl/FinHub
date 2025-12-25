"use client";

import { useMemo, useState } from "react";
import { Card } from "@/ui/components/Card";
import { InfoBox } from "@/ui/components/InfoBox";

import type { DocumentStatus, DocumentType } from "@/features/documents/documentsTypes";
import { useDocuments } from "@/features/documents/documentsStore";
import { useCases } from "@/features/cases/casesStore";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const TYPE_OPTIONS: { value: DocumentType; label: string }[] = [
  { value: "id", label: "Identidad" },
  { value: "income", label: "Ingresos" },
  { value: "bank", label: "Banco" },
  { value: "rental", label: "Vivienda/Alquiler" },
  { value: "tax", label: "Impuestos" },
  { value: "other", label: "Otro" },
];

const STATUS_OPTIONS: { value: DocumentStatus; label: string }[] = [
  { value: "uploaded", label: "Subido" },
  { value: "under_review", label: "En revisión" },
  { value: "approved", label: "Aprobado" },
];

function pill(text: string) {
  return <span className="rounded-xl border border-fh-border bg-fh-surface px-2 py-1 text-xs">{text}</span>;
}

export function DocumentsClient() {
  const { state: docsState, addDocument, deleteDocument, setStatus, setCase, setNotes } = useDocuments();
  const { state: casesState } = useCases();

  const [file, setFile] = useState<File | null>(null);
  const [type, setType] = useState<DocumentType>("income");
  const [caseId, setCaseId] = useState<string>("");
  const [notes, setNotesLocal] = useState("");
  const [filterStatus, setFilterStatus] = useState<DocumentStatus | "all">("all");
  const [busyUpload, setBusyUpload] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const casesForSelect = useMemo(() => casesState.cases, [casesState.cases]);

  const filteredDocs = useMemo(() => {
    if (filterStatus === "all") return docsState.documents;
    return docsState.documents.filter((d) => d.status === filterStatus);
  }, [docsState.documents, filterStatus]);

  const canAdd = !!file && file.name.trim().length >= 3;

  async function onAdd() {
    if (!file) return;
    setUploadError(null);
    setBusyUpload(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw new Error(userErr.message);
      if (!userData.user) throw new Error("No authenticated user");

      const safeName = file.name.trim().replace(/[^a-zA-Z0-9._-]/g, "_");
      const storagePath = `${userData.user.id}/${Date.now()}_${safeName}`; // relativo al bucket

      const up = await supabase.storage.from("vault").upload(storagePath, file, { upsert: false });
      if (up.error) throw new Error(up.error.message);

      await addDocument({
        fileName: file.name,
        type,
        caseId: caseId || undefined,
        notes: notes.trim() || undefined,
        storagePath, // relativo (sin 'vault/')
      });

      setFile(null);
      setNotesLocal("");
      setCaseId("");
      setType("income");

      const el = document.getElementById("fh-file") as HTMLInputElement | null;
      if (el) el.value = "";
    } catch (e: unknown) {
      setUploadError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setBusyUpload(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <div className="text-sm font-semibold">Subir documento (real v1)</div>

        {uploadError ? (
          <InfoBox title="Error" variant="danger">
            {uploadError}
          </InfoBox>
        ) : null}

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm font-medium">Archivo</label>
            <input
              id="fh-file"
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-fh-accent/30"
            />
            <div className="text-xs text-fh-muted">Se guarda en Vault privado.</div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Tipo</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as DocumentType)}
              className="w-full rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-fh-accent/30"
            >
              {TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Asignar a caso (opcional)</label>
            <select
              value={caseId}
              onChange={(e) => setCaseId(e.target.value)}
              className="w-full rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-fh-accent/30"
            >
              <option value="">Sin asignar</option>
              {casesForSelect.map((c: { id: string; title: string }) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Notas (opcional)</label>
            <input
              value={notes}
              onChange={(e) => setNotesLocal(e.target.value)}
              placeholder="ej: falta la última página"
              className="w-full rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-fh-accent/30"
            />
          </div>
        </div>

        <button
          disabled={!canAdd || busyUpload}
          onClick={onAdd}
          className="w-full rounded-xl bg-fh-accent px-4 py-2 text-sm font-medium text-white hover:opacity-95 disabled:opacity-50"
        >
          {busyUpload ? "Subiendo..." : "Añadir a Vault"}
        </button>

        {casesForSelect.length === 0 ? (
          <InfoBox title="Tip" variant="info">
            No tienes casos creados. Crea uno en "œCasos" para poder asignar documentos.
          </InfoBox>
        ) : null}
      </Card>

      <Card className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="text-sm font-semibold">Vault</div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="text-xs text-fh-muted">Filtrar por estado:</div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as DocumentStatus | "all")}
            className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-fh-accent/30"
          >
            <option value="all">Todos</option>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {pill(`${filteredDocs.length} docs`)}
        </div>
      </Card>

      {filteredDocs.length === 0 ? (
        <Card>
          <InfoBox title="Vacío" variant="warning">
            No hay documentos en el vault con el filtro actual.
          </InfoBox>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredDocs.map((d) => (
            <Card key={d.id} className="space-y-3">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <div className="text-sm font-semibold">{d.fileName}</div>
                  <div className="flex flex-wrap gap-2">
                    {pill(d.type)}
                    {pill(d.status)}
                    {d.caseId ? pill("asignado") : pill("sin caso")}
                  </div>
                  <div className="text-xs text-fh-muted">Actualizado: {new Date(d.updatedAt).toLocaleString()}</div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={d.status}
                    onChange={(e) => setStatus(d.id, e.target.value as DocumentStatus)}
                    className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-fh-accent/30"
                  >
                    {STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>

                  <select
                    value={d.caseId ?? ""}
                    onChange={(e) => setCase(d.id, e.target.value || undefined)}
                    className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-fh-accent/30"
                  >
                    <option value="">Sin asignar</option>
                    {casesForSelect.map((c: { id: string; title: string }) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={() => deleteDocument(d.id)}
                    className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm hover:bg-fh-surface-2"
                  >
                    Eliminar
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Notas</label>
                <input
                  value={d.notes ?? ""}
                  onChange={(e) => setNotes(d.id, e.target.value)}
                  placeholder="Notas internas"
                  className="w-full rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-fh-accent/30"
                />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}