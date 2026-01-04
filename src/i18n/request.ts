import {getRequestConfig} from "next-intl/server";
import {cookies, headers} from "next/headers";

export const SUPPORTED_LOCALES = ["en", "es", "pl", "ro"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

function normalizeLocale(v?: string | null): Locale | null {
  const raw = (v ?? "").toLowerCase().trim();
  return (SUPPORTED_LOCALES as readonly string[]).includes(raw) ? (raw as Locale) : null;
}

function resolveLocaleFromAcceptLanguage(al?: string | null): Locale | null {
  if (!al) return null;
  const parts = al.split(",").map((p) => p.trim());
  for (const p of parts) {
    const tag = p.split(";")[0]?.trim();       // "es-ES"
    const base = tag?.split("-")[0]?.trim();   // "es"
    const hit = normalizeLocale(base) ?? normalizeLocale(tag);
    if (hit) return hit;
  }
  return null;
}

async function loadMessages(locale: Locale) {
  switch (locale) {
    case "en":
      return (await import("./messages/en.json")).default;
    case "es":
      return (await import("./messages/es.json")).default;
    case "pl":
      return (await import("./messages/pl.json")).default;
    case "ro":
      return (await import("./messages/ro.json")).default;
  }
}

export async function getI18nRequestContext() {
  // En Next 16 / Turbopack, cookies()/headers() pueden ser async en algunos workers.
  const c = await cookies();
  const h = await headers();

    const fromCookie =
    normalizeLocale(c.get("fh_locale")?.value) ??
    normalizeLocale(c.get("locale")?.value) ??
    normalizeLocale(c.get("NEXT_LOCALE")?.value);

  const fromHeader = resolveLocaleFromAcceptLanguage(h.get("accept-language"));

  const locale: Locale = fromCookie ?? fromHeader ?? "en";
  const messages = await loadMessages(locale);

  return {
    locale,
    messages,
    timeZone: "Europe/Amsterdam",
  };
}

export default getRequestConfig(async () => {
  return await getI18nRequestContext();
});
