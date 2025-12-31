import { headers, cookies } from "next/headers";
import { normalizeLang, pickLangForText } from "@/features/i18n/lang";
import { DEFAULT_LOCALE, isSupportedLocale, type SupportedLocale } from "./config";

const LOCALE_COOKIE = "fh_locale";

function parseAcceptLanguage(h: string | null): string | null {
  if (!h) return null;
  const first = h.split(",")[0]?.trim();
  return first || null;
}

export async function getLocale(): Promise<SupportedLocale> {
  // 1) cookie
  const cookieStore = await cookies();
  const c = cookieStore.get(LOCALE_COOKIE)?.value;

  if (c) {
    const normalized = normalizeLang(c, DEFAULT_LOCALE);
    const picked = pickLangForText(normalized); // nl -> en (hoy)
    if (isSupportedLocale(picked)) return picked;
  }

  // 2) profile.locale (pendiente)

  // 3) Accept-Language
  const headerStore = await headers();
  const h = headerStore.get("accept-language");
  const al = parseAcceptLanguage(h);

  if (al) {
    const normalized = normalizeLang(al, DEFAULT_LOCALE);
    const picked = pickLangForText(normalized);
    if (isSupportedLocale(picked)) return picked;
  }

  return DEFAULT_LOCALE;
}
