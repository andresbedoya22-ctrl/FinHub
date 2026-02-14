"use client";

import * as React from "react";
import { useLocale } from "next-intl";

const SUPPORTED = [
  { key: "en", label: "EN" },
  { key: "es", label: "ES" },
  { key: "pl", label: "PL" },
  { key: "ro", label: "RO" },
] as const;

type Lang = (typeof SUPPORTED)[number]["key"];

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
      defaultValue={lang}
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
      className={[
        "h-10 rounded-xl border border-white/10 bg-white/5 px-3 text-sm",
        "text-white/90 shadow-sm backdrop-blur-sm transition",
        "hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20",
      ].join(" ")}
    >
      {SUPPORTED.map((x) => (
        <option key={x.key} value={x.key} className="bg-[#0D1B2A] text-white">
          {x.label}
        </option>
      ))}
    </select>
  );
}

