"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Screen } from "@/ui/components/Screen";
import { Header } from "@/ui/components/Header";
import { Card } from "@/ui/components/Card";
import { Button } from "@/ui/components/Button";
import { InfoBox } from "@/ui/components/InfoBox";
import { listMyDocuments } from "@/features/documents/documentsClient";
import type { DocumentEntity } from "@/features/documents/documentsTypes";
import { requestOcr, getLatestExtraction } from "@/features/documents/ocrApiClient";

export default function OcrReviewListClient() {
  const [loading, setLoading] = useState(true);
  const [docs, setDocs] = useState<DocumentEntity[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function refresh() {
    setError(null);
    setLoading(true);
    try {
      const d = await listMyDocuments();
      setDocs(d);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const items = useMemo(() => docs.filter((d) => d.extraction_type === "machtigingsregistratie"), [docs]);

  async function runOcr(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await requestOcr(id);
      await getLatestExtraction(id);
      await refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Screen>
      <Header title="OCR Review" subtitle="Machtigingsregistratie: ejecutar OCR, editar y verificar campos." />

      <InfoBox>
        Esta pantalla es el flujo dedicado de OCR. AquÃ­ solo aparecen documentos con tipo <b>machtigingsregistratie</b>.
      </InfoBox>

      {error ? <InfoBox>{error}</InfoBox> : null}

      <Card>
        {loading ? (
          <div>Cargando...</div>
        ) : items.length === 0 ? (
          <div>No tienes documentos machtigingsregistratie todavÃ­a.</div>
        ) : (
          <div className="flex flex-col gap-3">
            {items.map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium truncate">{d.fileName}</div>
                  <div className="text-sm opacity-70">status: {d.status}</div>
                </div>

                <div className="flex items-center gap-2">
                  <Link className="underline text-sm" href={`/app/documents/ocr-review/${d.id}`}>
                    Abrir
                  </Link>
                  <Button disabled={busyId === d.id} onClick={() => void runOcr(d.id)}>
                    {busyId === d.id ? "Ejecutando..." : "Ejecutar OCR"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </Screen>
  );
}
