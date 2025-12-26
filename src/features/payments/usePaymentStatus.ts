"use client";

import { useEffect, useMemo, useState } from "react";

type PaymentStatusState = {
  loading: boolean;
  paid: boolean;
  status: string;
  error?: string;
};

export function usePaymentStatus(caseId?: string) {
  const [state, setState] = useState<PaymentStatusState>({
    loading: true,
    paid: false,
    status: "unknown",
  });

  const safeCaseId = useMemo(() => (caseId ?? "").toString().trim(), [caseId]);

  async function refresh() {
    if (!safeCaseId) {
      setState({ loading: false, paid: false, status: "no_case" });
      return;
    }

    setState((s) => ({ ...s, loading: true, error: undefined }));

    try {
      const res = await fetch(`/api/payments/status?caseId=${encodeURIComponent(safeCaseId)}`, { method: "GET" });
      const json = (await res.json().catch(() => null)) as
        | { ok?: boolean; paid?: boolean; status?: string; error?: string }
        | null;

      if (!res.ok || !json?.ok) {
        setState({ loading: false, paid: false, status: "error", error: json?.error || "No se pudo leer el estado de pago." });
        return;
      }

      setState({
        loading: false,
        paid: Boolean(json.paid),
        status: String(json.status ?? "unknown"),
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error desconocido";
      setState({ loading: false, paid: false, status: "error", error: msg });
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeCaseId]);

  return { state, refresh };
}
