"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/ui/components/Card";
import { InfoBox } from "@/ui/components/InfoBox";
import { Header } from "@/ui/components/Header";
import { Screen } from "@/ui/components/Screen";
import { listAdminCases, type AdminCaseRow } from "@/features/cases/adminCasesApi";

const statusOptions = ["", "created", "in_progress", "waiting_user", "ready_for_review", "submitted", "under_review", "completed", "cancelled"];
const typeOptions = ["", "toeslagen", "taxes", "mortgage", "credit", "insurance"];
const authOptions = ["", "not_started", "pending", "received", "verified"];
const slaOptions = ["", "ok", "warning", "overdue"];

export function AdminCasesClient() {
  const [rows, setRows] = useState<AdminCaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [authorizationStatus, setAuthorizationStatus] = useState("");
  const [sla, setSla] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listAdminCases({ q, status, type, authorizationStatus, sla });
      setRows(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load admin cases");
    } finally {
      setLoading(false);
    }
  }, [q, status, type, authorizationStatus, sla]);

  useEffect(() => {
    void load();
  }, [load]);

  const summary = useMemo(() => {
    return {
      total: rows.length,
      overdue: rows.filter((r) => r.sla_bucket === "overdue").length,
      pendingAuthorization: rows.filter((r) => r.authorization_status !== "verified").length,
    };
  }, [rows]);

  return (
    <Screen className="space-y-6">
      <Header
        title="Admin · Cases"
        subtitle="Operational queue with filters by status, type, authorization and SLA."
        right={
          <button
            onClick={() => void load()}
            className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm hover:bg-fh-surface-2"
          >
            Refresh
          </button>
        }
      />

      <Card className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-fh-border p-3 text-sm">Total cases: <b>{summary.total}</b></div>
        <div className="rounded-xl border border-fh-border p-3 text-sm">Overdue SLA: <b>{summary.overdue}</b></div>
        <div className="rounded-xl border border-fh-border p-3 text-sm">Pending authorization: <b>{summary.pendingAuthorization}</b></div>
      </Card>

      <Card className="grid gap-3 md:grid-cols-6">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search id/title"
          className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm"
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm">
          {statusOptions.map((v) => <option key={v} value={v}>{v || "all status"}</option>)}
        </select>
        <select value={type} onChange={(e) => setType(e.target.value)} className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm">
          {typeOptions.map((v) => <option key={v} value={v}>{v || "all type"}</option>)}
        </select>
        <select value={authorizationStatus} onChange={(e) => setAuthorizationStatus(e.target.value)} className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm">
          {authOptions.map((v) => <option key={v} value={v}>{v || "all authorization"}</option>)}
        </select>
        <select value={sla} onChange={(e) => setSla(e.target.value)} className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm">
          {slaOptions.map((v) => <option key={v} value={v}>{v || "all SLA"}</option>)}
        </select>
        <button onClick={() => void load()} className="rounded-xl bg-fh-accent px-4 py-2 text-sm font-medium text-white">Apply filters</button>
      </Card>

      {loading ? (
        <Card><InfoBox title="Loading" variant="info">Loading admin cases...</InfoBox></Card>
      ) : null}

      {error ? (
        <Card><InfoBox title="Error" variant="danger">{error}</InfoBox></Card>
      ) : null}

      {!loading && !error ? (
        <Card className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left opacity-80">
              <tr>
                <th className="py-2 pr-4">Title</th>
                <th className="py-2 pr-4">Type</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Authorization</th>
                <th className="py-2 pr-4">SLA</th>
                <th className="py-2 pr-4">Updated</th>
                <th className="py-2 pr-0">Open</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-fh-border">
                  <td className="py-2 pr-4">{r.title}</td>
                  <td className="py-2 pr-4">{r.type}</td>
                  <td className="py-2 pr-4">{r.status}</td>
                  <td className="py-2 pr-4">{r.authorization_status}</td>
                  <td className="py-2 pr-4">{r.sla_bucket}</td>
                  <td className="py-2 pr-4">{new Date(r.updated_at).toLocaleString()}</td>
                  <td className="py-2 pr-0"><Link className="underline" href={`/app/admin/cases/${r.id}`}>View</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : null}
    </Screen>
  );
}
