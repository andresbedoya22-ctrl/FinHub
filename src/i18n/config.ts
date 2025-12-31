export const SUPPORTED_LOCALES = ["en", "es", "pl", "ro"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: SupportedLocale = "en";

export function isSupportedLocale(x: unknown): x is SupportedLocale {
  return typeof x === "string" && (SUPPORTED_LOCALES as readonly string[]).includes(x);
}
