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

/**
 * ----------------------------
 * JSON parsing helpers (NO any)
 * ----------------------------
 */
type JsonObject = Record<string, unknown>;

function isJsonObject(x: unknown): x is JsonObject {
  return x !== null && typeof x === "object" && !Array.isArray(x);
}

function getString(o: JsonObject, key: string): string | null {
  const v = o[key];
  return typeof v === "string" ? v : null;
}

function getNumber(o: JsonObject, key: string): number | null {
  const v = o[key];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function getBoolean(o: JsonObject, key: string): boolean | null {
  const v = o[key];
  return typeof v === "boolean" ? v : null;
}

async function safeReadJson(res: Response): Promise<unknown> {
  try {
    return (await res.json()) as unknown;
  } catch {
    return null;
  }
}

function extractErrorMessage(payload: unknown): string | null {
  if (!isJsonObject(payload)) return null;
  const err = getString(payload, "error");
  if (err) return err;

  // Optional: details could exist
  const details = payload["details"];
  if (typeof details === "string") return details;

  return null;
}

/**
 * ----------------------------
 * Finance types + parsing
 * ----------------------------
 */
type LedgerCategory = {
  id: string;
  key: string;
  label: string;
  sortOrder: number;
  isSystem: boolean;
};

function parseLedgerCategories(payload: unknown): LedgerCategory[] {
  if (!isJsonObject(payload)) return [];
  const catsUnknown = payload["categories"];
  if (!Array.isArray(catsUnknown)) return [];

  const out: LedgerCategory[] = [];
  for (const item of catsUnknown) {
    if (!isJsonObject(item)) continue;

    const id = getString(item, "id");
    const key = getString(item, "key");
    const label = getString(item, "label");
    const sortOrder = getNumber(item, "sortOrder");
    const isSystem = getBoolean(item, "isSystem");

    if (!id || !key || !label) continue;

    out.push({
      id,
      key,
      label,
      sortOrder: sortOrder ?? 0,
      isSystem: isSystem ?? false,
    });
  }

  // stable sort: sortOrder then label
  out.sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.label.localeCompare(b.label);
  });

  return out;
}

type CreateTransactionResponse = { id: string };

function parseCreateTransactionResponse(payload: unknown): CreateTransactionResponse | null {
  if (!isJsonObject(payload)) return null;
  const id = getString(payload, "id");
  if (!id) return null;
  return { id };
}

/**
 * Receipt link API: we only need "ok: true" but tolerate different shapes.
 */
function isOkResponse(payload: unknown): boolean {
  if (!isJsonObject(payload)) return false;
  const ok = payload["ok"];
  return ok === true;
}

/**
 * ----------------------------
 * Machtigingsregistratie extra JSON parsing
 * ----------------------------
 */
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

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function monthNow(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function eurosToCents(input: string): number | null {
  const normalized = input.replace(",", ".").trim();
  if (!normalized) return null;
  const n = Number(normalized);
  if (!Number.isFinite(n)) return null;
  // allow negatives (outflows) if user wants
  return Math.round(n * 100);
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

  /**
   * Finance conversion UI state
   */
  const [convertCats, setConvertCats] = useState<LedgerCategory[]>([]);
  const [convertMonth, setConvertMonth] = useState<string>(monthNow());
  const [convertOccurredOn, setConvertOccurredOn] = useState<string>(todayIso());
  const [convertMerchant, setConvertMerchant] = useState<string>("Recibo");
  const [convertAmountEur, setConvertAmountEur] = useState<string>("");
  const [convertCategoryId, setConvertCategoryId] = useState<string>("");
  const [convertNote, setConvertNote] = useState<string>("");

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

      // Default conversion merchant based on document name (if usable)
      if (d?.file_name && typeof d.file_name === "string") {
        const base = d.file_name.replace(/\.[^/.]+$/, "").trim();
        if (base) setConvertMerchant(base.slice(0, 80));
      }

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

  const loadLedgerCategories = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`/api/finances/ledger?month=${encodeURIComponent(convertMonth)}`, { method: "GET" });
      const payload = await safeReadJson(res);
      if (!res.ok) {
        const msg = extractErrorMessage(payload) ?? "No se pudo cargar categorías del ledger.";
        throw new Error(msg);
      }
      const cats = parseLedgerCategories(payload);
      setConvertCats(cats);
      if (!convertCategoryId && cats.length) setConvertCategoryId(cats[0]!.id);
    } catch (e: unknown) {
      setConvertCats([]);
      setError(e instanceof Error ? e.message : "Error cargando categorías.");
    }
  }, [convertMonth, convertCategoryId]);

  useEffect(() => {
    void loadLedgerCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convertMonth]);

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

  async function convertToTransactionAction() {
    if (!id) return;

    // Basic validation
    if (!/^\d{4}-\d{2}-\d{2}$/.test(convertOccurredOn)) {
      setError("Fecha inválida: occurredOn debe ser YYYY-MM-DD.");
      return;
    }
    const merchantName = convertMerchant.trim();
    if (!merchantName) {
      setError("merchantName requerido.");
      return;
    }
    const amountCents = eurosToCents(convertAmountEur);
    if (amountCents === null) {
      setError("Monto inválido. Usa un número, ej: 12.34");
      return;
    }

    setBusy("convert");
    setError(null);

    try {
      // 1) Create transaction
      const txRes = await fetch("/api/finances/transactions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          occurredOn: convertOccurredOn,
          merchantName,
          categoryId: convertCategoryId || null,
          amountCents,
          note: convertNote.trim() || null,
        }),
      });

      const txPayload = await safeReadJson(txRes);

      if (!txRes.ok) {
        const msg = extractErrorMessage(txPayload) ?? "No se pudo crear la transacción.";
        throw new Error(msg);
      }

      const created = parseCreateTransactionResponse(txPayload);
      if (!created) {
        throw new Error("Respuesta inválida al crear transacción: falta id.");
      }

      // 2) Link receipt -> transaction
      const linkRes = await fetch("/api/finances/receipt-links", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          documentId: id,
          transactionId: created.id,
        }),
      });

      const linkPayload = await safeReadJson(linkRes);
      if (!linkRes.ok) {
        const msg = extractErrorMessage(linkPayload) ?? "No se pudo vincular el documento a la transacción.";
        throw new Error(msg);
      }

      // tolerate different ok shapes, but prefer ok=true
      if (linkPayload !== null && !isOkResponse(linkPayload)) {
        // not fatal: some APIs might not return ok
      }

      // Done
      setError(null);
      // small UX: reset amount/note, keep category
      setConvertAmountEur("");
      setConvertNote("");
      await refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error convirtiendo a transacción.");
    } finally {
      setBusy(null);
    }
  }

  const canShowConversion = useMemo(() => {
    // We only show the conversion panel if this looks like a receipt-type document.
    // We do NOT assume OCR kind. This prevents confusing UX on machtigingsregistratie.
    const t = (doc?.type ?? "").toString().toLowerCase();
    const k = (doc?.ocr_kind ?? "").toString().toLowerCase();
    return t.includes("receipt") || t.includes("bon") || k.includes("receipt") || k.includes("bon");
  }, [doc]);

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

            {/* Finance conversion panel (guarded to receipt-like docs) */}
            {canShowConversion ? (
              <Card>
                <div className="flex flex-col gap-3">
                  <div className="text-sm font-semibold">Convertir a transacción (Finanzas)</div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="flex flex-col gap-1">
                      <div className="text-sm font-medium">Mes (para cargar categorías)</div>
                      <input
                        className="w-full rounded-md border p-2 text-sm"
                        value={convertMonth}
                        onChange={(e) => setConvertMonth(e.target.value)}
                        placeholder="YYYY-MM"
                      />
                      <div className="text-xs opacity-70">Ej: 2026-01. Se usa para /api/finances/ledger.</div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="text-sm font-medium">Fecha (occurredOn)</div>
                      <input
                        className="w-full rounded-md border p-2 text-sm"
                        value={convertOccurredOn}
                        onChange={(e) => setConvertOccurredOn(e.target.value)}
                        placeholder="YYYY-MM-DD"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="text-sm font-medium">Comercio (merchantName)</div>
                      <input
                        className="w-full rounded-md border p-2 text-sm"
                        value={convertMerchant}
                        onChange={(e) => setConvertMerchant(e.target.value)}
                        placeholder="Ej: Albert Heijn"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="text-sm font-medium">Monto (€) (se convierte a cents)</div>
                      <input
                        className="w-full rounded-md border p-2 text-sm"
                        value={convertAmountEur}
                        onChange={(e) => setConvertAmountEur(e.target.value)}
                        placeholder="Ej: -12.34"
                      />
                      <div className="text-xs opacity-70">Usa negativo para gasto, positivo para ingreso.</div>
                    </div>

                    <div className="flex flex-col gap-1 md:col-span-2">
                      <div className="text-sm font-medium">Categoría</div>
                      <select
                        className="w-full rounded-md border p-2 text-sm"
                        value={convertCategoryId}
                        onChange={(e) => setConvertCategoryId(e.target.value)}
                      >
                        {convertCats.length === 0 ? (
                          <option value="">(sin categorías)</option>
                        ) : (
                          convertCats.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.label} ({c.key})
                            </option>
                          ))
                        )}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1 md:col-span-2">
                      <div className="text-sm font-medium">Nota</div>
                      <input
                        className="w-full rounded-md border p-2 text-sm"
                        value={convertNote}
                        onChange={(e) => setConvertNote(e.target.value)}
                        placeholder="Opcional"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button disabled={busy !== null} onClick={() => void loadLedgerCategories()}>
                      {busy === "cats" ? "Cargando..." : "Recargar categorías"}
                    </Button>
                    <Button disabled={busy !== null} onClick={() => void convertToTransactionAction()}>
                      {busy === "convert" ? "Convirtiendo..." : "Crear transacción y vincular documento"}
                    </Button>
                    <Link className="underline text-sm self-center" href="/app/finances">
                      Ir a Finanzas
                    </Link>
                  </div>
                </div>
              </Card>
            ) : (
              <div className="text-xs opacity-60">
                Conversión a transacción: disponible solo para documentos tipo recibo/bon (para evitar confusión en machtigingsregistratie).
              </div>
            )}
          </div>
        )}
      </Card>
    </Screen>
  );
}