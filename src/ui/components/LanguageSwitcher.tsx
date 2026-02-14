"use client";

import { useLocale } from "next-intl";

const SUPPORTED = [
  { key: "en", label: "EN" },
  { key: "es", label: "ES" },
  { key: "pl", label: "PL" },
  { key: "ro", label: "RO" },
] as const;

type Lang = (typeof SUPPORTED)[number]["key"];

export const LANGUAGE_SWITCHER_CLASSNAME = [
  "h-10 rounded-xl border border-fh-border bg-fh-surface px-3 text-sm",
  "text-fh-text shadow-sm transition",
  "hover:bg-fh-surface-2 focus:outline-none focus:ring-2 focus:ring-fh-focus/60",
].join(" ");

function normalizeLang(raw: string): Lang {
  const lower = raw.toLowerCase();
  return (SUPPORTED as readonly { key: string }[]).some((x) => x.key === lower) ? (lower as Lang) : "en";
}

export function LanguageSwitcher() {
  const locale = useLocale();
  const lang = normalizeLang(locale);

  return (
    <select
      aria-label="Language"
      value={lang}
      onChange={async (e) => {
        const next = normalizeLang(e.target.value);

        await fetch("/api/i18n/locale", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ locale: next }),
        });

        const maxAge = 60 * 60 * 24 * 180;
        document.cookie = `locale=${next}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
        document.cookie = `NEXT_LOCALE=${next}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;

        window.location.reload();
      }}
      className={LANGUAGE_SWITCHER_CLASSNAME}
    >
      {SUPPORTED.map((x) => (
        <option key={x.key} value={x.key} className="bg-fh-surface text-fh-text">
          {x.label}
        </option>
      ))}
    </select>
  );
}
