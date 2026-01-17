export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function normalizeNumber(value: number | null): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
}

export function floorToWholeEuros(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

export function toCents(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100);
}

export function sum(...values: Array<number | null | undefined>): number {
  return values.reduce<number>((acc, value) => acc + (typeof value === "number" ? value : 0), 0);
}
