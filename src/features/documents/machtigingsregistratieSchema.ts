import { normalizeActiveringscode } from "../authorization";

export const MACHTIGINGSREGISTRATIE_SCHEMA_VERSION = 1 as const;

export type MachtigingsregistratieFieldsV1 = {
  // REQUIRED for verify
  activeringscode?: string;

  // Recommended (may come from letter / revoke flow)
  briefkenmerk?: string;
  intrekkingscode?: string;

  // Reference data (optional)
  naam?: string;
  geboortedatum?: string; // YYYY-MM-DD
  bsn?: string; // 9 digits

  // Allow extensions without breaking contract
  extra?: Record<string, unknown>;
};

const ALLOWED_KEYS = new Set([
  "activeringscode",
  "briefkenmerk",
  "intrekkingscode",
  "naam",
  "geboortedatum",
  "bsn",
  "extra",
]);

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function asTrimmedString(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t.length ? t : undefined;
}

function normalizeCode(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const normalized = normalizeActiveringscode(v);
  return normalized || undefined;
}

function normalizeDate(v: unknown): string | undefined {
  const s = asTrimmedString(v);
  if (!s) return undefined;

  const m1 = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m1) return `${m1[1]}-${m1[2]}-${m1[3]}`;

  const m2 = /^(\d{2})[-/](\d{2})[-/](\d{4})$/.exec(s);
  if (m2) return `${m2[3]}-${m2[2]}-${m2[1]}`;

  return undefined;
}

function normalizeBsn(v: unknown): string | undefined {
  const s = asTrimmedString(v);
  if (!s) return undefined;
  const digits = s.replace(/\D+/g, "");
  if (!/^\d{9}$/.test(digits)) return undefined;
  return digits;
}

export function emptyMachtigingsregistratieFieldsV1(): MachtigingsregistratieFieldsV1 {
  return {
    activeringscode: "",
    briefkenmerk: "",
    intrekkingscode: "",
    naam: "",
    geboortedatum: "",
    bsn: "",
    extra: {},
  };
}

export function validateForSaveMachtigingsregistratieFieldsV1(
  input: unknown
):
  | { ok: true; value: MachtigingsregistratieFieldsV1 }
  | { ok: false; error: string } {
  if (!isPlainObject(input)) return { ok: false, error: "fields must be a JSON object (not array/null)." };

  const obj = input as Record<string, unknown>;

  for (const k of Object.keys(obj)) {
    if (!ALLOWED_KEYS.has(k)) return { ok: false, error: `Field not allowed: "${k}". Use fields.extra for extensions.` };
  }

  const out: MachtigingsregistratieFieldsV1 = {};

  if (typeof obj["activeringscode"] !== "undefined") out.activeringscode = normalizeCode(obj["activeringscode"]) ?? "";
  if (typeof obj["briefkenmerk"] !== "undefined") out.briefkenmerk = asTrimmedString(obj["briefkenmerk"]) ?? "";
  if (typeof obj["intrekkingscode"] !== "undefined") out.intrekkingscode = normalizeCode(obj["intrekkingscode"]) ?? "";
  if (typeof obj["naam"] !== "undefined") out.naam = asTrimmedString(obj["naam"]) ?? "";
  if (typeof obj["geboortedatum"] !== "undefined") out.geboortedatum = normalizeDate(obj["geboortedatum"]) ?? "";
  if (typeof obj["bsn"] !== "undefined") out.bsn = normalizeBsn(obj["bsn"]) ?? "";

  if (typeof obj["extra"] !== "undefined") {
    const extra = obj["extra"];
    if (!isPlainObject(extra)) return { ok: false, error: "fields.extra must be an object." };
    out.extra = extra;
  }

  return { ok: true, value: out };
}

export function validateForVerifyMachtigingsregistratieFieldsV1(
  input: unknown
):
  | { ok: true; value: MachtigingsregistratieFieldsV1 }
  | { ok: false; error: string } {
  const saved = validateForSaveMachtigingsregistratieFieldsV1(input);
  if (!saved.ok) return saved;

  const v = saved.value;
  const act = (v.activeringscode ?? "").toString().trim();
  if (!act || act.length < 6) return { ok: false, error: "Missing activeringscode (min. 6 chars after normalize)." };

  return { ok: true, value: v };
}
