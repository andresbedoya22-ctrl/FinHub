"use client";

import Link from "next/link";
import { useState } from "react";
import { Card } from "@/ui/components/Card";
import { InfoBox } from "@/ui/components/InfoBox";
import { Button } from "@/ui/components/Button";

export function ProfileClient() {
  const [busyExport, setBusyExport] = useState(false);
  const [busyDelete, setBusyDelete] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onExport() {
    setMsg(null);
    setBusyExport(true);
    try {
      const res = await fetch("/api/profile/export", { method: "GET", credentials: "include" });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error ?? "No se pudo exportar.");

      const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "finhub-export.json";
      a.click();
      URL.revokeObjectURL(url);

      setMsg("Exportación generada (finhub-export.json).");
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setBusyExport(false);
    }
  }

  async function onDelete() {
    setMsg(null);
    const ok = window.confirm("Esto intentará borrar tus datos (beta). ¿Confirmas?");
    if (!ok) return;

    setBusyDelete(true);
    try {
      const res = await fetch("/api/profile/delete", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error ?? "No se pudo procesar el borrado.");

      setMsg("Solicitud de borrado procesada (beta). Se cerró tu sesión.");
      // opcional: redirigir al login (server middleware lo hará al navegar)
      window.location.href = "/login";
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setBusyDelete(false);
    }
  }

  return (
    <div className="space-y-4">
      {msg ? (
        <InfoBox title="Estado" variant="info">
          {msg}
        </InfoBox>
      ) : null}

      <Card className="space-y-3 p-6">
        <div className="text-base font-semibold">Privacidad y datos</div>
        <div className="text-sm opacity-80">
          <Link className="underline" href="/privacy">
            Política de Privacidad
          </Link>{" "}
          ·{" "}
          <Link className="underline" href="/terms">
            Términos del Servicio
          </Link>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" disabled={busyExport} onClick={onExport}>
            {busyExport ? "Exportando..." : "Exportar mis datos (JSON)"}
          </Button>

          <Button type="button" disabled={busyDelete} onClick={onDelete}>
            {busyDelete ? "Procesando..." : "Solicitar borrado (beta)"}
          </Button>
        </div>

        <div className="text-xs opacity-70">
          Nota: En beta, la exportación/borrado es “best-effort” según el esquema disponible.
        </div>
      </Card>
    </div>
  );
}
