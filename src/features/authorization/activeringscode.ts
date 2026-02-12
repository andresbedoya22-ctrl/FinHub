const ACTIVERINGSCODE_PATTERN = /^[A-Z0-9]{6,24}$/;

export function normalizeActiveringscode(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/[\s-]+/g, "").toUpperCase().trim();
}

export function isValidActiveringscode(value: unknown): boolean {
  const normalized = normalizeActiveringscode(value);
  return ACTIVERINGSCODE_PATTERN.test(normalized);
}

export function assertValidActiveringscode(value: unknown): string {
  const normalized = normalizeActiveringscode(value);
  if (!ACTIVERINGSCODE_PATTERN.test(normalized)) {
    throw new Error("Invalid activeringscode format");
  }
  return normalized;
}

