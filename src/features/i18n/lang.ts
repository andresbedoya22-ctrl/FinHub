export const APP_LANGS = ["es", "en", "nl", "pl", "ro"] as const;
export type AppLang = (typeof APP_LANGS)[number];

export function normalizeLang(x: unknown, fallback: AppLang = "es"): AppLang {
  const s = (x ?? "").toString().toLowerCase().trim();

  // soporta formatos tipo "en-US"
  const base = (s.split(/[-_]/)[0] ?? "");
  if ((APP_LANGS as readonly string[]).includes(base)) return base as AppLang;

  return fallback;
}

export function pickLangForText(lang: AppLang): AppLang {
  // hoy solo garantizamos ES/EN; el resto cae a EN por defecto
  if (lang === "es" || lang === "en") return lang;
  return "en";
}
