"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";

type ProbeProps = {
  ssrLocale: string;
  ssrTimeZone: string;
};

export function DevHydrationProbe({ ssrLocale, ssrTimeZone }: ProbeProps) {
  const pathname = usePathname();
  const locale = useLocale();

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    // Dev-only snapshot logger. Returns null so it never changes markup.
    console.info("[hydration-probe]", {
      route: pathname,
      ssrLocale,
      csrLocale: locale,
      ssrTimeZone,
      htmlLang: typeof document !== "undefined" ? document.documentElement.lang : "",
    });
  }, [pathname, locale, ssrLocale, ssrTimeZone]);

  return null;
}

