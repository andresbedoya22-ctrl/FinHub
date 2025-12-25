"use client";

import React from "react";
import Link from "next/link";
import { Card } from "@/ui/components/Card";
import { InfoBox } from "@/ui/components/InfoBox";
import { Input } from "@/ui/components/Input";
import { Button } from "@/ui/components/Button";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowserClient";

type Row = Record<string, unknown> & { id?: string };

function pickString(row: Row, keys: string[]): string | null {
  for (const k of keys) {
    const v = row[k];
    if (typeof v === "string" && v.trim().length > 0) return v;
  }
  return null;
}

function pickAnyString(row: Row, keys: string[]): string {
  return pickString(row, keys) ?? "—";
}

function toDateString(v: unknown): string {
  if (typeof v === "string") {
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return d.toLocaleString();
  }
  return "—";
}

async function fetchDocuments() {
  const supabase = createSupabaseBrowserClient();

  const q1 = await supabase.from("documents").select("*").order("created_at", { ascending: false }).limit(200);
  if (!q1.error) return q1;

  const msg = q1.error.message ?? "";
  if (msg.toLowerCase().includes("created_at") && msg.toLowerCase().includes("does not exist")) {
    const q2 = await supabase.from("documents").select("*").order("id", { ascending: false }).limit(200);
    return q2;
  }

  return q1;
}

type SignedUrlOk = { ok: true; url: string };
type SignedUrlErr = { ok: false; error?: string };
type SignedUrlResp = SignedUrlOk | SignedUrlErr;

export default function AdminDocumentsPage() {
  const [rows, setRows] = React.useState<Row[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [q, setQ] = React.useState("");

  const [openingId, setOpeningId] = React.useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data, error } = await fetchDocuments();
        if (error) throw new Error(error.message);
        if (alive) setRows((data ?? []) as Row[]);
      } catch (e: unknown) {
        if (alive) setError(e instanceof Error ? e.message : "Error desconocido");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const filtered = React.useMemo(() => {
    if (!rows) return null;
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => JSON.stringify(r).toLowerCase().includes(s));
  }, [rows, q]);

  async function onOpen(row: Row) {
    const id = pickString(row, ["id"]) ?? "row";
    setOpeningId(id);
    try {
      const bucket = pickString(row, ["bucket", "storage_bucket"]) ?? "documents";
      const path =
        pickString(row, ["storage_path", "path", "storage_key", "key", "object_path", "objectKey", "file_path"]) ?? "";

      if (!path) throw new Error("Este documento no tiene path/clave de storage en la fila.");

      const res = await fetch("/api/admin/documents/signed-url", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bucket, path, expiresIn: 300 }),
      });

      const json = (await res.json().catch(() => null)) as SignedUrlResp | null;
      if (!res.ok || !json || json.ok !== true) {
        const msg = json && "error" in json ? json.error : undefined;
        throw new Error(msg ?? "No se pudo generar signed URL");
      }

      window.open(json.url, "_blank", "noopener,noreferrer");
    } finally {
      setOpeningId(null);
    }
  }

  if (error) {
    return (
      <Card>
        <InfoBox title="Error" variant="danger">
          {error}
        </InfoBox>
      </Card>
    );
  }

  if (!rows || !filtered) {
    return (
      <Card>
        <InfoBox title="Cargando" variant="info">
          Cargando documents...
        </InfoBox>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">Últimos documents</div>
          <div className="text-xs opacity-80">Abrir seguro con signed URL (solo admin).</div>
        </div>
        <div className="w-full max-w-sm">
          <Input
            label="Buscar"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Busca por cualquier campo..."
          />
        </div>
      </div>

      <Card className="p-4">
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left opacity-80">
              <tr>
                <th className="py-2 pr-4">Archivo</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Case</th>
                <th className="py-2 pr-4">User</th>
                <th className="py-2 pr-4">Created</th>
                <th className="py-2 pr-0">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, idx) => {
                const id = pickString(r, ["id"]) ?? String(idx);

                const filename = pickAnyString(r, [
                  "filename",
                  "file_name",
                  "original_filename",
                  "original_file_name",
                  "name",
                  "title",
                ]);

                const path = pickString(r, ["storage_path", "path", "storage_key", "key", "object_path", "file_path"]);
                const bucket = pickString(r, ["bucket", "storage_bucket"]) ?? "documents";

                const status = pickAnyString(r, ["status", "state"]);
                const caseId = pickString(r, ["case_id", "caseId"]);
                const userId = pickAnyString(r, ["user_id", "userId", "owner_id", "ownerId"]);
                const createdAt = toDateString(r["created_at"] ?? r["createdAt"]);

                return (
                  <tr key={id} className="border-t border-fh-border align-top">
                    <td className="py-2 pr-4">
                      <div className="font-medium">{filename}</div>
                      <div className="text-xs opacity-70 break-all">
                        {bucket}:{path ?? "—"}
                      </div>
                    </td>
                    <td className="py-2 pr-4">{status}</td>
                    <td className="py-2 pr-4">{caseId ?? "—"}</td>
                    <td className="py-2 pr-4 break-all">{userId}</td>
                    <td className="py-2 pr-4">{createdAt}</td>
                    <td className="py-2 pr-0">
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          onClick={() => onOpen(r)}
                          disabled={!path || openingId === id}
                        >
                          {openingId === id ? "Abriendo..." : "Abrir"}
                        </Button>

                        {caseId ? (
                          <Link className="underline text-sm" href={`/app/cases/${caseId}`}>
                            Ver case
                          </Link>
                        ) : (
                          <span className="opacity-60 text-sm">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 ? (
                <tr>
                  <td className="py-3 opacity-70" colSpan={6}>
                    Sin resultados para el filtro.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}