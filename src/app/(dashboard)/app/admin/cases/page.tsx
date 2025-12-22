"use client";

import React from "react";
import Link from "next/link";
import { Card } from "@/ui/components/Card";
import { InfoBox } from "@/ui/components/InfoBox";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowserClient";

type Row = {
  id: string;
  title: string;
  type: string;
  status: string;
  step_key: string;
  created_at: string;
  updated_at: string;
};

export default function AdminCasesPage() {
  const [rows, setRows] = React.useState<Row[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data, error } = await supabase
          .from("cases")
          .select("id,title,type,status,step_key,created_at,updated_at")
          .order("updated_at", { ascending: false })
          .limit(200);

        if (error) throw new Error(error.message);
        if (alive) setRows((data ?? []) as any);
      } catch (e: any) {
        if (alive) setError(e?.message ?? "Error desconocido");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (error) {
    return (
      <Card>
        <InfoBox title="Error" variant="danger">
          {error}
        </InfoBox>
      </Card>
    );
  }

  if (!rows) {
    return (
      <Card>
        <InfoBox title="Cargando" variant="info">
          Cargando cases...
        </InfoBox>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="mb-3 text-sm font-semibold">Últimos 200 cases (por updated_at)</div>

      <div className="overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="text-left opacity-80">
            <tr>
              <th className="py-2 pr-4">Title</th>
              <th className="py-2 pr-4">Type</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Step</th>
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
                <td className="py-2 pr-4">{r.step_key}</td>
                <td className="py-2 pr-4">{new Date(r.updated_at).toLocaleString()}</td>
                <td className="py-2 pr-0">
                  <Link className="underline" href={`/app/cases/${r.id}`}>
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}