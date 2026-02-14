"use client";

import { useEffect, useState } from "react";

import { Card } from "@/ui/components/Card";
import { InfoBox } from "@/ui/components/InfoBox";

type Row = {
  tenantId: string;
  slug: string;
  name: string;
  members: number;
  activeMembers: number;
  newCases30d: number;
  taxesCases30d: number;
  leadgenCases30d: number;
  productEvents30d: number;
  gdprExports30d: number;
  gdprDeletes30d: number;
};

export function AdminBusinessObservabilityClient() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/admin/observability/business", { method: "GET" });
        const json = (await res.json()) as { ok: boolean; error?: string; rows?: Row[] };
        if (!res.ok || !json.ok) throw new Error(json.error ?? "Failed to load observability");
        if (!cancelled) setRows(json.rows ?? []);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load observability");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-4">
      <Card>
        <div className="text-lg font-semibold">Business Observability (30d)</div>
        <div className="mt-1 text-sm opacity-80">KPIs de activación, operación y GDPR por tenant.</div>
      </Card>

      {loading ? <Card><InfoBox title="Cargando" variant="info">Cargando métricas de negocio...</InfoBox></Card> : null}
      {error ? <Card><InfoBox title="Error" variant="danger">{error}</InfoBox></Card> : null}

      {!loading && !error ? (
        <Card className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="py-2 pr-4">Tenant</th>
                <th className="py-2 pr-4">Members</th>
                <th className="py-2 pr-4">Cases 30d</th>
                <th className="py-2 pr-4">Taxes</th>
                <th className="py-2 pr-4">LeadGen</th>
                <th className="py-2 pr-4">Events</th>
                <th className="py-2 pr-4">GDPR export</th>
                <th className="py-2 pr-0">GDPR delete</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.tenantId} className="border-t border-fh-border">
                  <td className="py-2 pr-4">
                    <div className="font-medium">{r.name}</div>
                    <div className="text-xs opacity-70">{r.slug}</div>
                  </td>
                  <td className="py-2 pr-4">{r.activeMembers}/{r.members}</td>
                  <td className="py-2 pr-4">{r.newCases30d}</td>
                  <td className="py-2 pr-4">{r.taxesCases30d}</td>
                  <td className="py-2 pr-4">{r.leadgenCases30d}</td>
                  <td className="py-2 pr-4">{r.productEvents30d}</td>
                  <td className="py-2 pr-4">{r.gdprExports30d}</td>
                  <td className="py-2 pr-0">{r.gdprDeletes30d}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : null}
    </div>
  );
}
