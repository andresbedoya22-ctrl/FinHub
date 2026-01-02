export function safePath(input: string | null | undefined, fallback = "/app"): string {
  const raw = (input ?? "").trim();
  if (!raw) return fallback;
  if (!raw.startsWith("/")) return fallback;
  if (raw.startsWith("//")) return fallback;
  // Evitar escapes raros
  if (raw.includes("\\") || raw.includes("\u0000")) return fallback;
  return raw;
}