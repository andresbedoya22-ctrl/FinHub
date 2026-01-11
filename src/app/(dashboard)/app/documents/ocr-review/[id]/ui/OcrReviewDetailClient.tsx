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

type LedgerCategory = { id: string; key: string; label: string; sortOrder: number; isSystem: boolean };

function parseExtraJson(s: string): { ok: true; value: Record<string, unknown> } | { ok: false; error: string } {
  try {
    const v: unknown = JSON.parse(s);
    if (v === null || typeof v !== "object" || Array.isArray(v)) {
      return { ok: false, error: "extra debe ser un objeto JSON (no array / null)." };
    }
    return { ok: true, value: v as Record<string, unknown> };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : "JSON invÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡lido" };
  }
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function monthFromIsoDate(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return new Date().toISOString().slice(0, 7);
  return iso.slice(0, 7);
}

function euroToCents(input: string): number | null {
  const s = input.trim().replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

type ErrorResponse = { error?: string };


type LedgerResponse = {
  categories?: LedgerCategory[];
};export default function OcrReviewDetailClient() {
  const params = useParams<{ id: string }>();
  const id = (params?.id ?? "").toString();

  const [loading, setLoading] = useState(true);
  const [doc, setDoc] = useState<ApiDocumentRow | null>(null);
  const [extraction, setExtraction] = useState<ApiExtractionRow | null>(null);

  const [fields, setFields] = useState<MachtigingsregistratieFieldsV1>(emptyMachtigingsregistratieFieldsV1());
  const [extraText, setExtraText] = useState<string>("{}");

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  // --- Convert to transaction (F11.5) ---
  const [convertOpen, setConvertOpen] = useState(false);
  const [convertCats, setConvertCats] = useState<LedgerCategory[]>([]);
  const [convertLoadingCats, setConvertLoadingCats] = useState(false);

  const [txDate, setTxDate] = useState<string>(todayIso());
  const [txMerchant, setTxMerchant] = useState<string>("Recibo");
  const [txAmountEur, setTxAmountEur] = useState<string>("");
  const [txCategoryId, setTxCategoryId] = useState<string>("");
  const [txNote, setTxNote] = useState<string>("");

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
        setFields(emptyMachtigingsregistratieFieldsV1());
        setExtraText("{}");
        setError(`Fields invÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡lidos en extracciÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n: ${validated.error}`);
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
      setError(`extra invÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡lido: ${parsedExtra.error}`);
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
      setError("No puedes verificar todavÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­a: falta activeringscode vÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡lido.");
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

  async function openConvertModal() {
    setError(null);
    setTxDate(todayIso());
    setTxMerchant(doc?.file_name ? doc.file_name.replace(/\.[^/.]+$/, "") : "Recibo");
    setTxAmountEur("");
    setTxCategoryId("");
    setTxNote(`doc:${id}`);

    setConvertOpen(true);

    setConvertLoadingCats(true);
    try {
      const month = monthFromIsoDate(todayIso());
      const res = await fetch(`/api/finances/ledger?month=${encodeURIComponent(month)}`, { method: "GET" });
      if (!res.ok) {
        const errUnknown = (await res.json().catch(() => null)) as unknown;
        const errJson = (errUnknown && typeof errUnknown === "object") ? (errUnknown as ErrorResponse) : {};
        throw new Error(errJson.error ?? "No se pudo cargar ledger.");
      }
      const jUnknown = (await res.json().catch(() => null)) as unknown;
      const j = (jUnknown && typeof jUnknown === "object") ? (jUnknown as LedgerResponse) : {};
      setConvertCats(Array.isArray(j.categories) ? j.categories : []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error cargando categorÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­as.");
      setConvertCats([]);
    } finally {
      setConvertLoadingCats(false);
    }
  }

  async function convertToTransaction() {
    if (!id) return;

    const occurredOn = txDate.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(occurredOn)) {
      setError("Fecha invÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡lida. Usa YYYY-MM-DD.");
      return;
    }

    const merchantName = txMerchant.trim();
    if (!merchantName) {
      setError("Merchant requerido.");
      return;
    }

    const centsAbs = euroToCents(txAmountEur);
    if (centsAbs === null) {
      setError("Monto invÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡lido. Usa un nÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Âºmero (ej. 12.34).");
      return;
    }
    if (centsAbs <= 0) {
      setError("Monto debe ser > 0.");
      return;
    }

    const amountCents = -Math.abs(centsAbs);

    setBusy("convert");
    setError(null);

    try {
      const txRes = await fetch("/api/finances/transactions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          occurredOn,
          merchantName,
          categoryId: txCategoryId ? txCategoryId : null,
          amountCents,
          note: txNote ? txNote : null,
        }),
      });

      const txJson = (await txRes.json().catch(() => null)) as unknown;
      if (!txRes.ok) {
        throw new Error(txJson?.error ?? "No se pudo crear la transacciÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n.");
      }
      const transactionId = String(txJson?.id ?? "");
      if (!transactionId) throw new Error("Respuesta invÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡lida: falta transaction id.");

      const linkRes = await fetch("/api/finances/receipt-links", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ documentId: id, transactionId }),
      });
      const linkUnknown = (await linkRes.json().catch(() => null)) as unknown;
      const linkJson = (linkUnknown && typeof linkUnknown === "object") ? (linkUnknown as ReceiptLinkResponse) : {};
      if (!linkRes.ok) {
        throw new Error(linkJson.error ?? "No se pudo vincular el recibo.");
      }

      setConvertOpen(false);
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Screen>
      <Header
        title="OCR Review ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â Detalle"
        subtitle={doc ? `${doc.file_name} ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â status: ${doc.status}` : "Cargando documento..."}
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
          <div>
            Este documento no es ocr_kind <b>machtigingsregistratie</b>.
          </div>
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
                {busy === "extract" ? "Extrayendo..." : "Ejecutar extracciÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n IA"}
              </Button>
              <Button disabled={busy !== null || !parsedExtra.ok} onClick={() => void saveAction()}>
                {busy === "save" ? "Guardando..." : "Guardar cambios"}
              </Button>
              <Button disabled={busy !== null || !verifyReady} onClick={() => void verifyAction()}>
                {busy === "verify" ? "Verificando..." : "Marcar verificado"}
              </Button>

              <div className="w-full h-px bg-black/10 my-2" />

              <Button disabled={busy !== null} onClick={() => void openConvertModal()}>
                Convertir a transacciÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n
              </Button>
              <Link className="underline text-sm self-center" href="/app/finances">
                Ir a Finanzas
              </Link>
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
                  placeholder="9 dÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­gitos"
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
              {!parsedExtra.ok ? <div className="text-sm">extra invÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡lido: {parsedExtra.error}</div> : null}
            </div>
          </div>
        )}
      </Card>

      {convertOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-xl bg-white p-4 shadow-lg">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-base font-semibold">Convertir a transacciÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n</div>
                <div className="text-sm opacity-70">Documento: {id}</div>
              </div>
              <button
                className="rounded-md border px-3 py-1 text-sm"
                onClick={() => setConvertOpen(false)}
                disabled={busy !== null}
              >
                Cerrar
              </button>
            </div>

            <div className="mt-4 grid gap-3">
              <div className="grid gap-2 md:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <div className="text-sm font-medium">Fecha</div>
                  <input
                    className="w-full rounded-md border p-2 text-sm"
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                    placeholder="YYYY-MM-DD"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="text-sm font-medium">Monto (EUR)</div>
                  <input
                    className="w-full rounded-md border p-2 text-sm"
                    value={txAmountEur}
                    onChange={(e) => setTxAmountEur(e.target.value)}
                    placeholder="Ej: 12.34"
                    inputMode="decimal"
                  />
                  <div className="text-xs opacity-70">Se guardarÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ como gasto (negativo) en P0.</div>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <div className="text-sm font-medium">Merchant</div>
                <input
                  className="w-full rounded-md border p-2 text-sm"
                  value={txMerchant}
                  onChange={(e) => setTxMerchant(e.target.value)}
                  placeholder="Ej: Albert Heijn"
                />
              </div>

              <div className="flex flex-col gap-1">
                <div className="text-sm font-medium">CategorÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­a</div>
                <select
                  className="w-full rounded-md border p-2 text-sm"
                  value={txCategoryId}
                  onChange={(e) => setTxCategoryId(e.target.value)}
                  disabled={convertLoadingCats}
                >
                  <option value="">{convertLoadingCats ? "Cargando..." : "Sin categorÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­a"}</option>
                  {convertCats.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <div className="text-sm font-medium">Nota</div>
                <input
                  className="w-full rounded-md border p-2 text-sm"
                  value={txNote}
                  onChange={(e) => setTxNote(e.target.value)}
                  placeholder="Opcional"
                />
              </div>

              <div className="mt-2 flex flex-wrap justify-end gap-2">
                <Button disabled={busy !== null} onClick={() => setConvertOpen(false)}>
                  Cancelar
                </Button>
                <Button disabled={busy !== null} onClick={() => void convertToTransaction()}>
                  {busy === "convert" ? "Guardando..." : "Crear transacciÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n + vincular"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </Screen>
  );
}