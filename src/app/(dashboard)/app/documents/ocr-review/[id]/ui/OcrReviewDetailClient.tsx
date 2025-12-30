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
  runExtraction,
  getDocument,
  getLatestExtraction,
  updateLatestExtraction,
  verifyExtraction,
  type ApiDocumentRow,
  type ApiExtractionRow,
} from "@/features/documents/ocrApiClient";
import {
  emptyMachtigingsregistratieFieldsV1,
  validateForSaveMachtigingsregistratieFieldsV1,
  validateForVerifyMachtigingsregistratieFieldsV1,
  type MachtigingsregistratieFieldsV1,
} from "@/features/documents/machtigingsregistratieSchema";

function parseExtraJson(s: string): { ok: true; value: Record<string, unknown> } | { ok: false; error: string } {
  try {
    const v: unknown = JSON.parse(s);
    if (v === null || typeof v !== "object" || Array.isArray(v)) {
      return { ok: false, error: "extra debe ser un objeto JSON (no array / null)." };
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

  const [fields, setFields] = useState<MachtigingsregistratieFieldsV1>(emptyMachtigingsregistratieFieldsV1());
  const [extraText, setExtraText] = useState<string>("{}");

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const parsedExtra = useMemo(() => parseExtraJson(extraText), [extraText]);

  const verifyReady = useMemo(() => {
    const candidate: MachtigingsregistratieFieldsV1 = { ...fields, extra: parsedExtra.ok ? parsedExtra.value : fields.extra };
    const v = validateForVerifyMachtigingsregistratieFieldsV1(candidate);
    return v.ok;
  }, [fields, parsedExtra]);

  const refresh = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    setError(null);

    try {
      const d = await getDocument(id);
      setDoc(d);

      const ex = await getLatestExtraction(id);
      setExtraction(ex);

      const rawFields = (ex?.fields ?? {}) as unknown;
      const validated = validateForSaveMachtigingsregistratieFieldsV1(rawFields);
      if (validated.ok) {
        setFields({ ...emptyMachtigingsregistratieFieldsV1(), ...validated.value });
        setExtraText(JSON.stringify(validated.value.extra ?? {}, null, 2));
      } else {
        // Si hay basura en DB, no rompemos UI; mostramos error pero dejamos editable.
        setFields(emptyMachtigingsregistratieFieldsV1());
        setExtraText("{}");
        setError(`Fields inválidos en extracción: ${validated.error}`);
      }
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

  async function runExtractionAction() {
    if (!id) return;
    setBusy("extract");
    setError(null);
    try {
      await runExtraction(id);
      await refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setBusy(null);
    }
  }

  async function saveAction() {
    if (!id) return;

    if (!parsedExtra.ok) {
      setError(`extra inválido: ${parsedExtra.error}`);
      return;
    }

    const candidate: MachtigingsregistratieFieldsV1 = { ...fields, extra: parsedExtra.value };
    const validated = validateForSaveMachtigingsregistratieFieldsV1(candidate);
    if (!validated.ok) {
      setError(validated.error);
      return;
    }

    setBusy("save");
    setError(null);
    try {
      await updateLatestExtraction(id, { fields: validated.value as unknown as Record<string, unknown>, needsReview: true });
      await refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setBusy(null);
    }
  }

  async function verifyAction() {
    if (!id) return;

    if (!verifyReady) {
      setError("No puedes verificar todavía: falta activeringscode válido.");
      return;
    }

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

  function setField<K extends keyof MachtigingsregistratieFieldsV1>(key: K, value: MachtigingsregistratieFieldsV1[K]) {
    setFields((prev) => ({ ...prev, [key]: value }));
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
        ) : doc.ocr_kind !== "machtigingsregistratie" ? (
          <div>Este documento no es ocr_kind <b>machtigingsregistratie</b>.</div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="text-sm opacity-70">Document ID: {id}</div>
            <div className="text-sm opacity-70">Type: {doc.type}</div>
            <div className="text-sm">
              needs_review: <b>{String(extraction?.needs_review ?? "n/a")}</b>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button disabled={busy !== null} onClick={() => void runOcrAction()}>
                {busy === "ocr" ? "Ejecutando..." : "Ejecutar OCR"}
              </Button>
              <Button disabled={busy !== null} onClick={() => void runExtractionAction()}>
                {busy === "extract" ? "Extrayendo..." : "Ejecutar extracción IA"}
              </Button>
              <Button disabled={busy !== null || !parsedExtra.ok} onClick={() => void saveAction()}>
                {busy === "save" ? "Guardando..." : "Guardar cambios"}
              </Button>
              <Button disabled={busy !== null || !verifyReady} onClick={() => void verifyAction()}>
                {busy === "verify" ? "Verificando..." : "Marcar verificado"}
              </Button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="flex flex-col gap-1">
                <div className="text-sm font-medium">Activeringscode (requerido)</div>
                <input
                  className="w-full rounded-md border p-2 text-sm"
                  value={(fields.activeringscode ?? "").toString()}
                  onChange={(e) => setField("activeringscode", e.target.value)}
                  placeholder="Ej: ABC12345"
                />
                <div className="text-xs opacity-70">Se normaliza (sin espacios/guiones, uppercase) al guardar.</div>
              </div>

              <div className="flex flex-col gap-1">
                <div className="text-sm font-medium">Briefkenmerk</div>
                <input
                  className="w-full rounded-md border p-2 text-sm"
                  value={(fields.briefkenmerk ?? "").toString()}
                  onChange={(e) => setField("briefkenmerk", e.target.value)}
                  placeholder="Ej: 2026.01.12345.01"
                />
              </div>

              <div className="flex flex-col gap-1">
                <div className="text-sm font-medium">Intrekkingscode</div>
                <input
                  className="w-full rounded-md border p-2 text-sm"
                  value={(fields.intrekkingscode ?? "").toString()}
                  onChange={(e) => setField("intrekkingscode", e.target.value)}
                  placeholder="Ej: INT123456"
                />
              </div>

              <div className="flex flex-col gap-1">
                <div className="text-sm font-medium">Naam</div>
                <input
                  className="w-full rounded-md border p-2 text-sm"
                  value={(fields.naam ?? "").toString()}
                  onChange={(e) => setField("naam", e.target.value)}
                  placeholder="Nombre y apellidos"
                />
              </div>

              <div className="flex flex-col gap-1">
                <div className="text-sm font-medium">Geboortedatum</div>
                <input
                  className="w-full rounded-md border p-2 text-sm"
                  value={(fields.geboortedatum ?? "").toString()}
                  onChange={(e) => setField("geboortedatum", e.target.value)}
                  placeholder="YYYY-MM-DD o DD-MM-YYYY"
                />
              </div>

              <div className="flex flex-col gap-1">
                <div className="text-sm font-medium">BSN</div>
                <input
                  className="w-full rounded-md border p-2 text-sm"
                  value={(fields.bsn ?? "").toString()}
                  onChange={(e) => setField("bsn", e.target.value)}
                  placeholder="9 dígitos"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="text-sm font-medium">extra (JSON)</div>
              <textarea
                className="w-full min-h-[220px] rounded-md border p-2 font-mono text-sm"
                value={extraText}
                onChange={(e) => setExtraText(e.target.value)}
              />
              {!parsedExtra.ok ? <div className="text-sm">extra inválido: {parsedExtra.error}</div> : null}
            </div>
          </div>
        )}
      </Card>
    </Screen>
  );
}

