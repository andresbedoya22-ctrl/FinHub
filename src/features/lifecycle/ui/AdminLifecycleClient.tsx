"use client";

import { useCallback, useEffect, useState } from "react";

import { Card } from "@/ui/components/Card";
import { Header } from "@/ui/components/Header";
import { InfoBox } from "@/ui/components/InfoBox";
import { Screen } from "@/ui/components/Screen";
import { Button } from "@/ui/components/Button";
import { getAdminLifecycle, updateLifecycleCampaign, type LifecycleCampaign, type LifecycleMetrics } from "@/features/lifecycle/adminLifecycleApi";

export function AdminLifecycleClient() {
  const [campaigns, setCampaigns] = useState<LifecycleCampaign[]>([]);
  const [metrics, setMetrics] = useState<LifecycleMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAdminLifecycle();
      setCampaigns(data.campaigns);
      setMetrics(data.metrics);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "No se pudo cargar lifecycle.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onToggle(c: LifecycleCampaign) {
    setBusyKey(c.key);
    setError(null);
    try {
      await updateLifecycleCampaign(c.key, {
        enabled: !c.enabled,
        throttleMinutes: c.throttle_minutes,
      });
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "No se pudo actualizar la campaña.");
    } finally {
      setBusyKey(null);
    }
  }

  async function onThrottleChange(c: LifecycleCampaign, value: string) {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) return;
    setBusyKey(c.key);
    setError(null);
    try {
      await updateLifecycleCampaign(c.key, {
        enabled: c.enabled,
        throttleMinutes: Math.floor(n),
      });
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "No se pudo actualizar el throttle.");
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <Screen className="space-y-6">
      <Header
        title="Admin Lifecycle"
        subtitle="Toggles de campañas, throttling y métricas básicas de activación/retención."
        right={<Button variant="secondary" onClick={() => void load()}>Refrescar</Button>}
      />

      {loading ? (
        <Card><InfoBox title="Cargando" variant="info">Cargando panel lifecycle...</InfoBox></Card>
      ) : null}

      {error ? (
        <Card><InfoBox title="Error" variant="danger">{error}</InfoBox></Card>
      ) : null}

      {metrics ? (
        <Card className="grid gap-3 md:grid-cols-4">
          <div className="rounded-xl border border-fh-border p-3 text-sm">Sent ({metrics.windowDays}d): <b>{metrics.sent}</b></div>
          <div className="rounded-xl border border-fh-border p-3 text-sm">Throttled: <b>{metrics.throttled}</b></div>
          <div className="rounded-xl border border-fh-border p-3 text-sm">Disabled: <b>{metrics.disabled}</b></div>
          <div className="rounded-xl border border-fh-border p-3 text-sm">Active users (30d): <b>{metrics.activeUsers30}</b></div>
        </Card>
      ) : null}

      <Card className="space-y-3">
        <div className="text-sm font-semibold">Campañas</div>
        <div className="space-y-2">
          {campaigns.map((c) => (
            <div key={c.key} className="rounded-xl border border-fh-border bg-fh-surface p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">{c.name}</div>
                  <div className="text-xs text-fh-muted">{c.key} - channel: {c.channel}</div>
                  <div className="text-xs text-fh-muted">
                    sent: {metrics?.byCampaign[c.key]?.sent ?? 0}, throttled: {metrics?.byCampaign[c.key]?.throttled ?? 0}, disabled: {metrics?.byCampaign[c.key]?.disabled ?? 0}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-fh-muted">Throttle (min)</label>
                  <input
                    type="number"
                    min={0}
                    className="w-24 rounded-xl border border-fh-border bg-fh-surface px-2 py-1 text-sm"
                    defaultValue={c.throttle_minutes}
                    disabled={busyKey === c.key}
                    onBlur={(e) => void onThrottleChange(c, e.target.value)}
                  />
                  <Button
                    variant={c.enabled ? "secondary" : "primary"}
                    disabled={busyKey === c.key}
                    onClick={() => void onToggle(c)}
                  >
                    {busyKey === c.key ? "Guardando..." : c.enabled ? "Desactivar" : "Activar"}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </Screen>
  );
}
