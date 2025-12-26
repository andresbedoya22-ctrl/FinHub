"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Screen } from "@/ui/components/Screen";
import { Header } from "@/ui/components/Header";
import { Card } from "@/ui/components/Card";
import { Button } from "@/ui/components/Button";
import { InfoBox } from "@/ui/components/InfoBox";
import {
  requestOcr,
  getDocument,
  getLatestExtraction,
  updateLatestExtraction,
  verifyExtraction,
  type ApiDocumentRow,
  type ApiExtractionRow,
} from "@/features/documents/ocrApiClient";

function parseFieldsJson(s: string): { ok: true; value: Record<string, unknown> } | { ok: false; error: string } {
  try {
    const v: unknown = JSON.parse(s);
    if (v === null || typeof v !== "object" || Array.isArray(v)) {
      return { ok: false, error: "El JSON debe ser un objeto (no array / null)." };
    }
    return { ok: true, value: v as Record<string, unknown> };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : "JSON inválido" };
  }
}

export default function OcrReviewDetailClient() {
  const params = useParams<{ id: string }>();
  const id = (params?.id ?? "").toString();

  const [loading, setLoading] = useState(true);
  const [doc, setDoc] = useState<ApiDocumentRow | null>(null);
  const [extraction, setExtraction] = useState<ApiExtractionRow | null>(null);
  const [fieldsText, setFieldsText] = useState<string>("{}");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const parsed = useMemo(() => parseFieldsJson(fieldsText), [fieldsText]);

  const refresh = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    setError(null);

    try {
      const d = await getDocument(id);
      setDoc(d);

      const ex = await getLatestExtraction(id);
      setExtraction(ex);

      const fields = ex?.fields ?? {};
      setFieldsText(JSON.stringify(fields, null, 2));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function runOcrAction() {
    if (!id) return;
    setBusy("ocr");
    setError(null);
    try {
      await requestOcr(id);
      await refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setBusy(null);
    }
  }

  async function saveAction() {
    if (!id) return;

    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }

    setBusy("save");
    setError(null);
    try {
      await updateLatestExtraction(id, { fields: parsed.value, needsReview: true });
      await refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setBusy(null);
    }
  }

  async function verifyAction() {
    if (!id) return;

    setBusy("verify");
    setError(null);
    try {
      await verifyExtraction(id);
      await refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Screen>
      <Header
        title="OCR Review — Detalle"
        subtitle={doc ? `${doc.file_name} — status: ${doc.status}` : "Cargando documento..."}
        right={
          <Link className="underline text-sm" href="/app/documents/ocr-review">
            Volver
          </Link>
        }
      />

      {error ? <InfoBox>{error}</InfoBox> : null}

      <Card>
        {loading ? (
          <div>Cargando...</div>
        ) : !doc ? (
          <div>No encontrado.</div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="text-sm opacity-70">Document ID: {id}</div>
            <div className="text-sm opacity-70">Type: {doc.type}</div>

            <div className="flex gap-2">
              <Button disabled={busy !== null} onClick={() => void runOcrAction()}>
                {busy === "ocr" ? "Ejecutando..." : "Ejecutar OCR"}
              </Button>
              <Button disabled={busy !== null || !parsed.ok} onClick={() => void saveAction()}>
                {busy === "save" ? "Guardando..." : "Guardar cambios"}
              </Button>
              <Button disabled={busy !== null} onClick={() => void verifyAction()}>
                {busy === "verify" ? "Verificando..." : "Marcar verificado"}
              </Button>
            </div>

            <div className="text-sm">
              needs_review: <b>{String(extraction?.needs_review ?? "n/a")}</b>
            </div>

            <div className="flex flex-col gap-2">
              <div className="font-medium">fields (JSON)</div>
              <textarea
                className="w-full min-h-[320px] rounded-md border p-2 font-mono text-sm"
                value={fieldsText}
                onChange={(e) => setFieldsText(e.target.value)}
              />
              {!parsed.ok ? <div className="text-sm">JSON inválido: {parsed.error}</div> : null}
            </div>
          </div>
        )}
      </Card>
    </Screen>
  );
}