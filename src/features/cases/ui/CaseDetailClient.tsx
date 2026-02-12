"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

import type { CaseDetail } from "@/features/cases/casesTypes";
import { createCaseConsent, getCaseDetail, updateCase } from "@/features/cases/casesApi";
import { DocumentUploader } from "@/features/documents/ui/DocumentUploader";
import { Card } from "@/ui/components/Card";
import { Header } from "@/ui/components/Header";
import { InfoBox } from "@/ui/components/InfoBox";
import { Screen } from "@/ui/components/Screen";

function pill(text: string) {
  return <span className="rounded-xl border border-fh-border bg-fh-surface px-2 py-1 text-xs">{text}</span>;
}

export function CaseDetailClient({ caseId }: { caseId: string }) {
  const t = useTranslations("cases");
  const tDoc = useTranslations("documentsPipeline");
  const locale = useLocale();
  const searchParams = useSearchParams();

  const [detail, setDetail] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmittingConsent, setIsSubmittingConsent] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [consentError, setConsentError] = useState<string | null>(null);
  const [isSendingToReview, setIsSendingToReview] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState<string | null>(null);
  const aliveRef = useRef(true);

  const errorFallback = useMemo(() => t("detail.error"), [t]);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCaseDetail(caseId);
      if (!aliveRef.current) return;
      setDetail(data);
      setError(null);
    } catch (e: unknown) {
      if (!aliveRef.current) return;
      setError(e instanceof Error ? e.message : errorFallback);
    } finally {
      if (aliveRef.current) setLoading(false);
    }
  }, [caseId, errorFallback]);

  useEffect(() => {
    aliveRef.current = true;
    void loadDetail();
    return () => {
      aliveRef.current = false;
    };
  }, [loadDetail]);

  useEffect(() => {
    const payment = searchParams.get("payment");
    const sessionId = searchParams.get("session_id");
    if (payment !== "success" || !sessionId) return;

    let cancelled = false;

    const confirm = async () => {
      try {
        const res = await fetch("/api/payments/confirm-session", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ sessionId, caseId }),
        });
        const json = (await res.json().catch(() => null)) as { ok?: boolean; paid?: boolean; error?: string } | null;
        if (cancelled) return;
        if (res.ok && json?.ok && json.paid) {
          setPaymentInfo("Payment confirmed in test mode.");
          await loadDetail();
        } else if (json?.error) {
          setPaymentInfo(`Payment confirmation pending: ${json.error}`);
        } else {
          setPaymentInfo("Payment confirmation pending.");
        }
      } catch {
        if (!cancelled) setPaymentInfo("Payment confirmation pending.");
      }
    };

    void confirm();
    return () => {
      cancelled = true;
    };
  }, [searchParams, caseId, loadDetail]);

  const tasks = useMemo(() => detail?.tasks ?? [], [detail]);
  const documents = useMemo(() => detail?.documents ?? [], [detail]);
  const consents = useMemo(() => detail?.consents ?? [], [detail]);

  const hasServiceConsent = useMemo(
    () => consents.some((c) => c.granted && c.consentType === "service_authorization"),
    [consents]
  );

  const canMoveToReadyForReview = useMemo(
    () => Boolean(detail && detail.status !== "ready_for_review" && detail.status !== "submitted" && hasServiceConsent),
    [detail, hasServiceConsent]
  );

  const timeline = useMemo(() => {
    if (!detail) return [];
    return [
      { label: t("detail.statusLabel"), value: detail.status },
      { label: t("detail.stepLabel"), value: detail.stepKey },
      { label: t("detail.authorizationStatusLabel"), value: detail.authorizationStatus },
    ];
  }, [detail, t]);

  const reasonLabels = useMemo(() => {
    return {
      unsupported_mime: tDoc("reasons.unsupported_mime"),
      file_too_large: tDoc("reasons.file_too_large"),
      ocr_low_confidence: tDoc("reasons.ocr_low_confidence"),
      unknown: tDoc("reasons.unknown"),
    } as Record<string, string>;
  }, [tDoc]);

  async function onGrantConsent() {
    if (!consentChecked || !detail || isSubmittingConsent) return;
    setIsSubmittingConsent(true);
    setConsentError(null);

    try {
      await createCaseConsent(caseId, {
        consentType: "service_authorization",
        granted: true,
        locale,
        version: 1,
        source: "case_detail_ui",
      });
      setConsentChecked(false);
      await loadDetail();
    } catch (e: unknown) {
      setConsentError(e instanceof Error ? e.message : t("detail.consent.error"));
    } finally {
      setIsSubmittingConsent(false);
    }
  }

  async function onMoveToReview() {
    if (!detail || !canMoveToReadyForReview || isSendingToReview) return;
    setIsSendingToReview(true);
    setConsentError(null);

    try {
      await updateCase(caseId, {
        status: "ready_for_review",
        stepKey: "review",
      });
      await loadDetail();
    } catch (e: unknown) {
      setConsentError(e instanceof Error ? e.message : t("detail.reviewAction.error"));
    } finally {
      setIsSendingToReview(false);
    }
  }

  return (
    <Screen className="space-y-6">
      <Header
        title={t("detail.title")}
        subtitle={detail ? detail.title : t("detail.subtitle")}
        right={
          <Link
            href="/app/cases"
            className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm hover:bg-fh-surface-2"
          >
            {t("detail.back")}
          </Link>
        }
      />

      {loading ? (
        <Card>
          <InfoBox title={t("detail.loadingTitle")} variant="info">
            {t("detail.loadingBody")}
          </InfoBox>
        </Card>
      ) : null}

      {error ? (
        <Card>
          <InfoBox title={t("detail.errorTitle")} variant="danger">
            {error}
          </InfoBox>
        </Card>
      ) : null}

      {paymentInfo ? (
        <Card>
          <InfoBox title="Payment" variant="info">
            {paymentInfo}
          </InfoBox>
        </Card>
      ) : null}

      {!loading && !error && !detail ? (
        <Card>
          <InfoBox title={t("detail.notFoundTitle")} variant="warning">
            {t("detail.notFoundBody")}
          </InfoBox>
        </Card>
      ) : null}

      {!loading && !error && detail ? (
        <div className="space-y-4">
          <Card className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {pill(detail.type)}
              {detail.productSlug ? pill(detail.productSlug) : null}
              {pill(detail.status)}
              {pill(detail.stepKey)}
              {pill(`${t("detail.authorizationStatusLabel")}: ${detail.authorizationStatus}`)}
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              {timeline.map((item) => (
                <div key={item.label} className="text-sm text-fh-muted">
                  {item.label}: <span className="text-fh-text">{item.value}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="space-y-3">
            <div className="text-sm font-semibold">{t("detail.consent.title")}</div>
            <div className="text-sm text-fh-muted">{t("detail.consent.description")}</div>
            <div className="text-xs text-fh-muted">
              <Link className="underline" href="/terms">
                {t("detail.consent.terms")}
              </Link>{" "}
              ·{" "}
              <Link className="underline" href="/privacy">
                {t("detail.consent.privacy")}
              </Link>
            </div>

            {hasServiceConsent ? (
              <InfoBox title={t("detail.consent.alreadyGivenTitle")} variant="info">
                {t("detail.consent.alreadyGivenBody")}
              </InfoBox>
            ) : (
              <>
                <label className="flex items-start gap-2 rounded-xl border border-fh-border bg-fh-surface p-3 text-sm">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={consentChecked}
                    onChange={(e) => setConsentChecked(e.target.checked)}
                  />
                  <span>{t("detail.consent.checkbox")}</span>
                </label>
                <button
                  onClick={() => void onGrantConsent()}
                  disabled={!consentChecked || isSubmittingConsent}
                  className="rounded-xl bg-fh-accent px-4 py-2 text-sm font-medium text-white hover:opacity-95 disabled:opacity-60"
                >
                  {isSubmittingConsent ? t("detail.consent.saving") : t("detail.consent.confirm")}
                </button>
              </>
            )}

            <div>
              <button
                onClick={() => void onMoveToReview()}
                disabled={!canMoveToReadyForReview || isSendingToReview}
                className="rounded-xl border border-fh-border bg-fh-surface px-4 py-2 text-sm hover:bg-fh-surface-2 disabled:opacity-60"
              >
                {isSendingToReview ? t("detail.reviewAction.sending") : t("detail.reviewAction.send")}
              </button>
              {!hasServiceConsent ? (
                <div className="mt-2 text-xs text-fh-muted">{t("detail.reviewAction.blocked")}</div>
              ) : null}
            </div>

            {consentError ? (
              <InfoBox title={t("detail.consent.errorTitle")} variant="danger">
                {consentError}
              </InfoBox>
            ) : null}

            {consents.length > 0 ? (
              <div className="space-y-2">
                <div className="text-sm font-semibold">{t("detail.consent.historyTitle")}</div>
                {consents.map((consent) => (
                  <div key={consent.id} className="rounded-xl border border-fh-border bg-fh-surface-2 p-3 text-xs">
                    <div>
                      {t("detail.consent.historyType")}: {consent.consentType}
                    </div>
                    <div>
                      {t("detail.consent.historyAcceptedAt")}: {consent.acceptedAt ?? "-"}
                    </div>
                    <div>
                      {t("detail.consent.historyVersion")}: v{consent.version}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </Card>

          <Card className="space-y-3">
            <div className="text-sm font-semibold">{t("detail.tasks.title")}</div>
            {tasks.length === 0 ? (
              <InfoBox title={t("detail.tasks.emptyTitle")} variant="warning">
                {t("detail.tasks.emptyBody")}
              </InfoBox>
            ) : (
              <div className="space-y-2">
                {tasks.map((task) => (
                  <div key={task.id} className="rounded-xl border border-fh-border bg-fh-surface-2 p-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-semibold">{task.title}</div>
                      {pill(task.status)}
                      {task.dueAt ? pill(task.dueAt) : null}
                    </div>
                    <div className="text-xs text-fh-muted">
                      {t("detail.tasks.updatedAt")}: {new Date(task.updatedAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <div className="space-y-3">
            <DocumentUploader caseId={caseId} onCompleted={loadDetail} />

            <Card className="space-y-3">
              <div className="text-sm font-semibold">{t("detail.documents.title")}</div>
              {documents.length === 0 ? (
                <InfoBox title={t("detail.documents.emptyTitle")} variant="warning">
                  {t("detail.documents.emptyBody")}
                </InfoBox>
              ) : (
                <div className="overflow-auto">
                  <table className="min-w-full text-sm">
                    <thead className="text-left opacity-80">
                      <tr>
                        <th className="py-2 pr-4">{t("detail.documents.table.file")}</th>
                        <th className="py-2 pr-4">{t("detail.documents.table.type")}</th>
                        <th className="py-2 pr-4">{t("detail.documents.table.status")}</th>
                        <th className="py-2 pr-4">{t("detail.documents.table.reason")}</th>
                        <th className="py-2 pr-0">{t("detail.documents.table.updatedAt")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {documents.map((doc) => {
                        const reason = doc.validationReason
                          ? reasonLabels[doc.validationReason] ?? doc.validationReason
                          : "-";

                        return (
                          <tr key={doc.id} className="border-t border-fh-border">
                            <td className="py-2 pr-4">{doc.document?.fileName ?? doc.documentId}</td>
                            <td className="py-2 pr-4">{doc.document?.type ?? "-"}</td>
                            <td className="py-2 pr-4">{doc.status}</td>
                            <td className="py-2 pr-4">{reason}</td>
                            <td className="py-2 pr-0">{new Date(doc.updatedAt).toLocaleString()}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        </div>
      ) : null}
    </Screen>
  );
}
