"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Card } from "@/ui/components/Card";
import { InfoBox } from "@/ui/components/InfoBox";
import { Badge } from "@/ui/components/Badge";
import { Screen } from "@/ui/components/Screen";
import { SubsidyTimeline } from "@/components/subsidies/SubsidyTimeline";
import { SUBSIDY_DOCS_BY_SLUG, isSubsidySlug } from "@/domain/subsidies/registry";
import type { SubsidyApplication, SubsidyDocument, SubsidyAdminNote } from "@/domain/subsidies/types";
import {
  getMySubsidyApplication,
  listSubsidyDocuments,
  listSubsidyNotes,
  uploadSubsidyDocument,
} from "@/lib/db/subsidies/client";

export default function SubsidyApplicationDetailClient({ id }: { id: string }) {
  const t = useTranslations("subsidies");
  const [app, setApp] = useState<SubsidyApplication | null>(null);
  const [docs, setDocs] = useState<SubsidyDocument[]>([]);
  const [notes, setNotes] = useState<SubsidyAdminNote[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await getMySubsidyApplication(id);
        if (!alive) return;
        setApp(data);

        if (data) {
          const [docsData, notesData] = await Promise.all([
            listSubsidyDocuments(id),
            listSubsidyNotes(id),
          ]);
          if (!alive) return;
          setDocs(docsData);
          setNotes(notesData);
        }
      } catch (e) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : t("applications.detail.error"));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id, t]);

  const docLabels = useMemo(() => {
    if (!app || !isSubsidySlug(app.slug)) return {};
    const keys = SUBSIDY_DOCS_BY_SLUG[app.slug];
    return Object.fromEntries(keys.map((key) => [key, t(`documents.${key}`)]));
  }, [app, t]);

  async function onUpload(documentId: string, file: File) {
    setError(null);
    setUploading((prev) => ({ ...prev, [documentId]: true }));
    try {
      await uploadSubsidyDocument({ applicationId: id, documentId, file });
      const updated = await listSubsidyDocuments(id);
      setDocs(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("applications.detail.uploadError"));
    } finally {
      setUploading((prev) => ({ ...prev, [documentId]: false }));
    }
  }

  if (loading) {
    return (
      <Card>
        <InfoBox title={t("applications.detail.loading")} variant="info">
          {t("applications.detail.loadingDescription")}
        </InfoBox>
      </Card>
    );
  }

  if (!app) {
    return (
      <Card>
        <InfoBox title={t("applications.detail.notFound")} variant="warning">
          {t("applications.detail.notFoundDescription")}
        </InfoBox>
      </Card>
    );
  }

  return (
    <Screen className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-fh-muted">{t("applications.detail.eyebrow")}</div>
          <div className="text-2xl font-semibold text-fh-text">{t(`catalog.${app.slug}.title`)}</div>
          <div className="text-sm text-fh-muted">{t("applications.detail.subtitle")}</div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="neutral">{t(`status.${app.status}`)}</Badge>
          <Link
            href="/app/subsidies/applications"
            className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm font-medium text-fh-text hover:bg-fh-surface-2"
          >
            {t("applications.detail.back")}
          </Link>
        </div>
      </div>

      {error ? (
        <Card>
          <InfoBox title={t("applications.detail.errorTitle")} variant="danger">
            {error}
          </InfoBox>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[280px,1fr]">
        <Card>
          <div className="text-sm font-semibold text-fh-text">{t("applications.detail.timeline")}</div>
          <div className="mt-4">
            <SubsidyTimeline
              status={app.status}
              labels={{
                draft: t("status.draft"),
                eligible_checked: t("status.eligible_checked"),
                paid: t("status.paid"),
                waiting_user: t("status.waiting_user"),
                under_review: t("status.under_review"),
                submitted: t("status.submitted"),
                decision: t("status.decision"),
                done: t("status.done"),
              }}
            />
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="space-y-3">
            <div className="text-sm font-semibold text-fh-text">{t("applications.detail.documents")}</div>
            <div className="space-y-3">
              {docs.map((doc) => (
                <div key={doc.id} className="rounded-2xl border border-fh-border bg-fh-surface-2 p-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="text-sm font-semibold text-fh-text">{docLabels[doc.docKey] ?? doc.docKey}</div>
                      <div className="text-xs text-fh-muted">{t(`documents.status.${doc.status}`)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm font-medium text-fh-text hover:bg-fh-surface-2 cursor-pointer">
                        {uploading[doc.id] ? t("applications.detail.uploading") : t("applications.detail.upload")}
                        <input
                          type="file"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) void onUpload(doc.id, file);
                          }}
                        />
                      </label>
                      {doc.filePath ? (
                        <Badge variant="success">{t("applications.detail.uploaded")}</Badge>
                      ) : (
                        <Badge variant="neutral">{t("applications.detail.missing")}</Badge>
                      )}
                    </div>
                  </div>
                  {doc.notes ? <div className="mt-2 text-xs text-fh-muted">{doc.notes}</div> : null}
                </div>
              ))}
            </div>
          </Card>

          <Card className="space-y-3">
            <div className="text-sm font-semibold text-fh-text">{t("applications.detail.notes")}</div>
            {notes.length === 0 ? (
              <InfoBox title={t("applications.detail.notesEmpty")} variant="info">
                {t("applications.detail.notesEmptyDescription")}
              </InfoBox>
            ) : (
              <div className="space-y-2">
                {notes.map((note) => (
                  <div key={note.id} className="rounded-2xl border border-fh-border bg-fh-surface-2 p-3 text-sm text-fh-muted">
                    <div className="text-xs text-fh-muted">{new Date(note.createdAt).toLocaleString()}</div>
                    <div className="mt-1 text-sm text-fh-text">{note.message}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </Screen>
  );
}
