"use client";

import React from "react";
import { Card } from "@/ui/components/Card";
import { InfoBox } from "@/ui/components/InfoBox";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowserClient";

type Row = {
  id: string;
  email: string | null;
  role: string;
  created_at: string;
};

export default function AdminUsersPage() {
  const [rows, setRows] = React.useState<Row[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data, error } = await supabase
          .from("profiles")
          .select("id,email,role,created_at")
          .order("created_at", { ascending: false })
          .limit(200);

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
          Cargando usuarios...
        </InfoBox>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="mb-3 text-sm font-semibold">Últimos 200 usuarios</div>

      <div className="overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="text-left opacity-80">
            <tr>
              <th className="py-2 pr-4">Email</th>
              <th className="py-2 pr-4">Role</th>
              <th className="py-2 pr-0">Created</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-fh-border">
                <td className="py-2 pr-4">{r.email ?? "(sin email)"}</td>
                <td className="py-2 pr-4">{r.role}</td>
                <td className="py-2 pr-0">{new Date(r.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}