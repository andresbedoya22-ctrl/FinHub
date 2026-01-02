"use client";

import { useEffect } from "react";
import { trackProductEvent } from "@/features/observability/productTelemetry";

type Props = { route: string };

function getLocaleFromDom(): "en" | "es" | "pl" | "ro" {
  if (typeof document === "undefined") return "en";
  const raw = (document.documentElement.lang || "en").toLowerCase().trim();
  const base = (raw.split("-")[0] || "en").trim();
  return base === "es" || base === "pl" || base === "ro" ? base : "en";
}

function getReferrerDomain(): string | null {
  if (typeof document === "undefined") return null;
  const ref = (document.referrer || "").trim();
  if (!ref) return null;
  try {
    return new URL(ref).hostname || null;
  } catch {
    return null;
  }
}

export default function LandingTelemetry({ route }: Props) {
  useEffect(() => {
    const locale = getLocaleFromDom();
    const payload = { locale, path: route, referrerDomain: getReferrerDomain() };

    // Canon event (docs/marketing/events-taxonomy.md)
    trackProductEvent("product.marketing.landing.view", payload);

    // Compat existente (no romper dashboards actuales)
    trackProductEvent("product.marketing.landing.view", { route, locale });
  }, [route]);

  return null;
}
