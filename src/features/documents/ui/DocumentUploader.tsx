"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import { useTranslations } from "next-intl";

import type { DocumentType } from "@/features/documents/documentsTypes";
import {
  attachDocumentToCase,
  updateCaseDocument,
  uploadDocument,
  validateDocument,
} from "@/features/documents/documentPipelineClient";
import { Card } from "@/ui/components/Card";
import { InfoBox } from "@/ui/components/InfoBox";

const DOC_TYPES: DocumentType[] = [
  "id",
  "income",
  "bank",
  "rental",
  "tax",
  "other",
  "machtigingsregistratie",
];

type PipelineStatus =
  | "idle"
  | "uploading"
  | "validating"
  | "validated"
  | "rejected"
  | "error";

export function DocumentUploader({ caseId, onCompleted }: { caseId: string; onCompleted?: () => void }) {
  const t = useTranslations("documentsPipeline");
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState<DocumentType>("other");
  const [status, setStatus] = useState<PipelineStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [meta, setMeta] = useState<Record<string, unknown> | null>(null);

  const statusLabel = useMemo(() => {
    switch (status) {
      case "uploading":
        return t("status.uploading");
      case "validating":
        return t("status.validating");
      case "validated":
        return t("status.validated");
      case "rejected":
        return t("status.rejected");
      case "error":
        return t("status.error");
      default:
        return t("status.idle");
    }
  }, [status, t]);

  const reasonLabels = useMemo(() => {
    return {
      unsupported_mime: t("reasons.unsupported_mime"),
      file_too_large: t("reasons.file_too_large"),
      ocr_low_confidence: t("reasons.ocr_low_confidence"),
      unknown: t("reasons.unknown"),
    } as Record<string, string>;
  }, [t]);

  function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setError(null);
    setReason(null);
    setMeta(null);
    if (f) setStatus("idle");
  }

  async function handleUpload() {
    if (!file) return;
    setError(null);
    setReason(null);
    setMeta(null);
    setStatus("uploading");

    try {
      const upload = await uploadDocument(file, docType);
      const attached = await attachDocumentToCase(caseId, upload.doc.id);

      await updateCaseDocument(caseId, attached.id, { status: "validating" });
      setStatus("validating");

      const result = await validateDocument(upload.doc.id);
      setReason(result.reason ?? null);
      setMeta(result.meta ?? null);

      await updateCaseDocument(caseId, attached.id, {
        status: result.status,
        validationReason: result.reason ?? null,
        validationMeta: result.meta ?? null,
      });

      setStatus(result.status === "validated" ? "validated" : "rejected");
      onCompleted?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("errors.unknown"));
      setStatus("error");
    }
  }

  const reasonLabel = reason ? reasonLabels[reason] ?? reasonLabels.unknown : null;

  return (
    <Card className="space-y-4">
      <div className="text-sm font-semibold">{t("title")}</div>

      {error ? (
        <InfoBox title={t("errors.title")} variant="danger">
          {error}
        </InfoBox>
      ) : null}

      <div className="grid gap-3 md:grid-cols-[1fr_200px]">
        <div className="space-y-2">
          <label className="text-xs uppercase text-fh-muted">{t("file.label")}</label>
          <input
            type="file"
            onChange={onFileChange}
            className="w-full rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs uppercase text-fh-muted">{t("type.label")}</label>
          <select
            value={docType}
            onChange={(e) => setDocType(e.target.value as DocumentType)}
            className="w-full rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm"
          >
            {DOC_TYPES.map((type) => (
              <option key={type} value={type}>
                {t(`types.${type}`)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleUpload}
          disabled={!file || status === "uploading" || status === "validating"}
          className="rounded-xl bg-fh-primary px-4 py-2 text-sm font-medium text-fh-primaryFg hover:opacity-90 disabled:opacity-50"
        >
          {status === "uploading" || status === "validating" ? t("actions.processing") : t("actions.upload")}
        </button>
        <div className="text-xs text-fh-muted">{statusLabel}</div>
      </div>

      {status === "rejected" && reasonLabel ? (
        <InfoBox title={t("rejected.title")} variant="warning">
          {reasonLabel}
        </InfoBox>
      ) : null}

      {meta ? (
        <div className="rounded-xl border border-fh-border bg-fh-surface-2 p-3 text-xs text-fh-muted">
          <div>{t("meta.label")}</div>
          <div className="mt-1 font-mono text-[11px]">
            {JSON.stringify(meta, null, 2)}
          </div>
        </div>
      ) : null}

      <div className="text-xs text-fh-muted">{t("hint")}</div>
    </Card>
  );
}