"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Card } from "@/ui/components/Card";
import { InfoBox } from "@/ui/components/InfoBox";
import { Badge } from "@/ui/components/Badge";
import { Screen } from "@/ui/components/Screen";
import { listSubsidyApplicationsAdmin, listSubsidyDocumentsAdmin } from "@/lib/db/subsidies/adminClient";
import { SUBSIDY_DOCS_BY_SLUG, isSubsidySlug } from "@/domain/subsidies/registry";
import type { SubsidyApplication, SubsidyDocument, SubsidyStatus } from "@/domain/subsidies/types";
import { addSubsidyAdminNote, requestSubsidyMissingDocs, updateSubsidyStatus } from "../actions";

const STATUS_OPTIONS = [
  "waiting_user",
  "under_review",
  "submitted",
  "decision",
  "done",
] as const;

export default function AdminSubsidiesClient() {
  const t = useTranslations("subsidies");
  const [apps, setApps] = useState<SubsidyApplication[]>([]);
  const [docsByApp, setDocsByApp] = useState<Record<string, SubsidyDocument[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [noteByApp, setNoteByApp] = useState<Record<string, string>>({});
  const [selectedDocsByApp, setSelectedDocsByApp] = useState<Record<string, string[]>>({});

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await listSubsidyApplicationsAdmin();
        if (!alive) return;
        setApps(data);

        const docsEntries = await Promise.all(
          data.map(async (app) => [app.id, await listSubsidyDocumentsAdmin(app.id)] as const)
        );
        if (!alive) return;
        setDocsByApp(Object.fromEntries(docsEntries));
      } catch (e) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : t("admin.error"));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [t]);

  const empty = !loading && apps.length === 0;

  const docLabelsBySlug = useMemo(() => {
    const entries = Object.entries(SUBSIDY_DOCS_BY_SLUG).map(([slug, keys]) => [
      slug,
      Object.fromEntries(keys.map((key) => [key, t(`documents.${key}`)])),
    ]);
    return Object.fromEntries(entries) as Record<string, Record<string, string>>;
  }, [t]);

  async function handleStatus(appId: string, status: SubsidyStatus) {
    setError(null);
    setBusy((prev) => ({ ...prev, [appId]: true }));
    try {
      await updateSubsidyStatus({ applicationId: appId, status });
      setApps((prev) => prev.map((app) => (app.id === appId ? { ...app, status } : app)));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("admin.error"));
    } finally {
      setBusy((prev) => ({ ...prev, [appId]: false }));
    }
  }

  async function handleRequestDocs(appId: string) {
    setError(null);
    setBusy((prev) => ({ ...prev, [appId]: true }));
    try {
      const docKeys = selectedDocsByApp[appId] ?? [];
      const message = (noteByApp[appId] ?? "").trim();
      await requestSubsidyMissingDocs({ applicationId: appId, docKeys, message });
      const updatedDocs = await listSubsidyDocumentsAdmin(appId);
      setDocsByApp((prev) => ({ ...prev, [appId]: updatedDocs }));
      setNoteByApp((prev) => ({ ...prev, [appId]: "" }));
      setSelectedDocsByApp((prev) => ({ ...prev, [appId]: [] }));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("admin.error"));
    } finally {
      setBusy((prev) => ({ ...prev, [appId]: false }));
    }
  }

  async function handleAddNote(appId: string) {
    const message = (noteByApp[appId] ?? "").trim();
    if (!message) return;
    setError(null);
    setBusy((prev) => ({ ...prev, [appId]: true }));
    try {
      await addSubsidyAdminNote({ applicationId: appId, message });
      setNoteByApp((prev) => ({ ...prev, [appId]: "" }));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("admin.error"));
    } finally {
      setBusy((prev) => ({ ...prev, [appId]: false }));
    }
  }

  function toggleDoc(appId: string, docKey: string) {
    setSelectedDocsByApp((prev) => {
      const current = new Set(prev[appId] ?? []);
      if (current.has(docKey)) current.delete(docKey);
      else current.add(docKey);
      return { ...prev, [appId]: Array.from(current) };
    });
  }

  return (
    <Screen className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-wide text-fh-muted">{t("admin.eyebrow")}</div>
        <div className="text-2xl font-semibold text-fh-text">{t("admin.title")}</div>
        <div className="text-sm text-fh-muted">{t("admin.subtitle")}</div>
      </div>

      {error ? (
        <Card>
          <InfoBox title={t("admin.errorTitle")} variant="danger">
            {error}
          </InfoBox>
        </Card>
      ) : null}

      {loading ? (
        <Card>
          <InfoBox title={t("admin.loading")} variant="info">
            {t("admin.loadingDescription")}
          </InfoBox>
        </Card>
      ) : null}

      {empty ? (
        <Card>
          <InfoBox title={t("admin.empty.title")} variant="warning">
            {t("admin.empty.description")}
          </InfoBox>
        </Card>
      ) : null}

      {!loading && !empty ? (
        <div className="space-y-4">
          {apps.map((app) => {
            const docLabels = isSubsidySlug(app.slug) ? docLabelsBySlug[app.slug] : {};
            const docs = docsByApp[app.id] ?? [];
            const selected = selectedDocsByApp[app.id] ?? [];
            return (
              <Card key={app.id} className="space-y-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-fh-text">{t(`catalog.${app.slug}.title`)}</div>
                    <div className="text-xs text-fh-muted">{t("admin.userId")}: {app.userId}</div>
                  </div>
                  <Badge variant="neutral">{t(`status.${app.status}`)}</Badge>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={app.status}
                      onChange={(e) => handleStatus(app.id, e.target.value as SubsidyStatus)}
                    className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-fh-primary/35"
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {t(`status.${status}`)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-semibold text-fh-text">{t("admin.requestDocs")}</div>
                  <div className="grid gap-2 md:grid-cols-2">
                    {docs.map((doc) => (
                      <label key={doc.id} className="flex items-center gap-2 text-sm text-fh-muted">
                        <input
                          type="checkbox"
                          checked={selected.includes(doc.docKey)}
                          onChange={() => toggleDoc(app.id, doc.docKey)}
                        />
                        {docLabels?.[doc.docKey] ?? doc.docKey}
                      </label>
                    ))}
                  </div>
                  <textarea
                    value={noteByApp[app.id] ?? ""}
                    onChange={(e) => setNoteByApp((prev) => ({ ...prev, [app.id]: e.target.value }))}
                    placeholder={t("admin.notePlaceholder")}
                    className="w-full rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-fh-primary/35"
                    rows={3}
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleRequestDocs(app.id)}
                      disabled={busy[app.id]}
                      className="rounded-xl bg-fh-primary px-3 py-2 text-sm font-medium text-fh-primaryFg hover:opacity-90 disabled:opacity-50"
                    >
                      {busy[app.id] ? t("admin.saving") : t("admin.requestDocsCta")}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddNote(app.id)}
                      disabled={busy[app.id]}
                      className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm font-medium text-fh-text hover:bg-fh-surface-2 disabled:opacity-50"
                    >
                      {busy[app.id] ? t("admin.saving") : t("admin.addNote")}
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : null}
    </Screen>
  );
}
