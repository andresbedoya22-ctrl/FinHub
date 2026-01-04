import type { CurrencyCode, IsoDate, IsoMonth } from "./financesTypes";

const EUR: CurrencyCode = "EUR";

const eurFormatter = new Intl.NumberFormat("nl-NL", {
  style: "currency",
  currency: EUR,
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

export function formatEurFromCents(cents: number): string {
  return eurFormatter.format(cents / 100);
}

export function parseIsoMonth(input: string): IsoMonth | null {
  // YYYY-MM (basic)
  if (!/^\d{4}-\d{2}$/.test(input)) return null;
  return input as IsoMonth;
}

export function isoMonthFromDate(d: Date): IsoMonth {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}` as IsoMonth;
}

export function isoDateFromDate(d: Date): IsoDate {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}` as IsoDate;
}

export function clampInt(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

export function normalizeMerchant(raw: string): string {
  // Recommended: robust but dependency-free normalization
  // - trim/lower
  // - NFKD + remove diacritics
  // - replace non-alnum with space
  // - collapse spaces
  const s = (raw ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return s.length ? s : "unknown";
}

export function sumCents(values: Array<number>): number {
  let acc = 0;
  for (const v of values) acc += v;
  return acc;
}