"use client";

import { useEffect } from "react";
import { trackProductEvent } from "@/features/observability/productTelemetry";

type Props = { route: string };

export default function LandingTelemetry({ route }: Props) {
  useEffect(() => {
    trackProductEvent("product.marketing.landing.view", { route });
  }, [route]);

  return null;
}
