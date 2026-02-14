"use client";

import { useState } from "react";

import { Button } from "@/ui/components/Button";
import { Card } from "@/ui/components/Card";
import { InfoBox } from "@/ui/components/InfoBox";

type RetentionResponse = {
  ok: boolean;
  error?: string;
  summary?: {
    policies: number;
    deletedDeliveries: number;
    deletedEvents: number;
    hardDeletedUsers: number;
  };
};

export function AdminGdprOpsClient() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<RetentionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runRetention() {
    if (busy) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/admin/gdpr/retention/run", { method: "POST" });
      const json = (await res.json()) as RetentionResponse;
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Retention run failed");
      setResult(json);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Retention run failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="text-lg font-semibold">GDPR Operations</div>
        <div className="mt-1 text-sm opacity-80">
          Ejecuta retención operativa por tenant y valida export/delete requests.
        </div>
      </Card>

      <Card className="space-y-3">
        <Button onClick={() => void runRetention()} disabled={busy}>
          {busy ? "Running retention..." : "Run retention now"}
        </Button>
        {error ? <InfoBox title="Error" variant="danger">{error}</InfoBox> : null}
        {result?.ok && result.summary ? (
          <InfoBox title="Retention completed" variant="info">
            Policies: {result.summary.policies} | Deliveries deleted: {result.summary.deletedDeliveries} | Events deleted:{" "}
            {result.summary.deletedEvents} | User hard-delete candidates: {result.summary.hardDeletedUsers}
          </InfoBox>
        ) : null}
      </Card>
    </div>
  );
}
