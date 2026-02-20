"use client";

import { useEffect, useState } from "react";

import { Card } from "@/ui/components/Card";
import { InfoBox } from "@/ui/components/InfoBox";

type Row = {
  id: string;
  slug: string;
  name: string;
  status: string;
  created_at: string;
  memberCount: number;
  activeMembers: number;
  adminMembers: number;
};

export function AdminTenantsClient() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/admin/tenants", { method: "GET" });
        const json = (await res.json()) as { ok: boolean; rows?: Row[]; error?: string };
        if (!res.ok || !json.ok) throw new Error(json.error ?? "Failed to load tenants");
        if (!cancelled) setRows(json.rows ?? []);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load tenants");
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
        <div className="text-lg font-semibold">Tenants</div>
        <div className="mt-1 text-sm opacity-80">Gestión multi-tenant base para operación B2B2C.</div>
      </Card>

      {loading ? <Card><InfoBox title="Cargando" variant="info">Cargando tenants...</InfoBox></Card> : null}
      {error ? <Card><InfoBox title="Error" variant="danger">{error}</InfoBox></Card> : null}

      {!loading && !error ? (
        <Card className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="py-2 pr-4">Tenant</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Members</th>
                <th className="py-2 pr-4">Admins</th>
                <th className="py-2 pr-0">Created</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-fh-border">
                  <td className="py-2 pr-4">
                    <div className="font-medium">{r.name}</div>
                    <div className="text-xs opacity-70">{r.slug}</div>
                  </td>
                  <td className="py-2 pr-4">{r.status}</td>
                  <td className="py-2 pr-4">{r.activeMembers}/{r.memberCount}</td>
                  <td className="py-2 pr-4">{r.adminMembers}</td>
                  <td className="py-2 pr-0">{new Date(r.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : null}
    </div>
  );
}
