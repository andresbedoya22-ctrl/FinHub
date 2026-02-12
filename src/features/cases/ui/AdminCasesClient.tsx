"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("adminCases");
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
      setError(e instanceof Error ? e.message : t("errors.load"));
    } finally {
      setLoading(false);
    }
  }, [q, status, type, authorizationStatus, sla, t]);

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
        title={t("title")}
        subtitle={t("subtitle")}
        right={
          <button
            onClick={() => void load()}
            className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm hover:bg-fh-surface-2"
          >
            {t("actions.refresh")}
          </button>
        }
      />

      <Card className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-fh-border p-3 text-sm">{t("summary.total")}: <b>{summary.total}</b></div>
        <div className="rounded-xl border border-fh-border p-3 text-sm">{t("summary.overdue")}: <b>{summary.overdue}</b></div>
        <div className="rounded-xl border border-fh-border p-3 text-sm">{t("summary.pendingAuthorization")}: <b>{summary.pendingAuthorization}</b></div>
      </Card>

      <Card className="grid gap-3 md:grid-cols-6">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("filters.searchPlaceholder")}
          className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm"
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm">
          {statusOptions.map((v) => <option key={v} value={v}>{v || t("filters.allStatus")}</option>)}
        </select>
        <select value={type} onChange={(e) => setType(e.target.value)} className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm">
          {typeOptions.map((v) => <option key={v} value={v}>{v || t("filters.allType")}</option>)}
        </select>
        <select value={authorizationStatus} onChange={(e) => setAuthorizationStatus(e.target.value)} className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm">
          {authOptions.map((v) => <option key={v} value={v}>{v || t("filters.allAuthorization")}</option>)}
        </select>
        <select value={sla} onChange={(e) => setSla(e.target.value)} className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm">
          {slaOptions.map((v) => <option key={v} value={v}>{v || t("filters.allSla")}</option>)}
        </select>
        <button onClick={() => void load()} className="rounded-xl bg-fh-accent px-4 py-2 text-sm font-medium text-white">{t("actions.applyFilters")}</button>
      </Card>

      {loading ? (
        <Card><InfoBox title={t("loading.title")} variant="info">{t("loading.body")}</InfoBox></Card>
      ) : null}

      {error ? (
        <Card><InfoBox title={t("errors.title")} variant="danger">{error}</InfoBox></Card>
      ) : null}

      {!loading && !error ? (
        <Card className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left opacity-80">
              <tr>
                <th className="py-2 pr-4">{t("table.title")}</th>
                <th className="py-2 pr-4">{t("table.type")}</th>
                <th className="py-2 pr-4">{t("table.status")}</th>
                <th className="py-2 pr-4">{t("table.authorization")}</th>
                <th className="py-2 pr-4">{t("table.sla")}</th>
                <th className="py-2 pr-4">{t("table.updated")}</th>
                <th className="py-2 pr-0">{t("table.open")}</th>
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
                  <td className="py-2 pr-0"><Link className="underline" href={`/app/admin/cases/${r.id}`}>{t("table.view")}</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : null}
    </Screen>
  );
}

