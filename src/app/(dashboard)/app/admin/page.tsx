"use client";

import React from "react";
import { Card } from "@/ui/components/Card";
import { InfoBox } from "@/ui/components/InfoBox";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowserClient";

type Counts = {
  casesTotal: number;
  casesOpen: number;
  casesUnderReview: number;
  casesCompleted: number;
  usersTotal: number;
  documentsTotal: number;
};

export default function AdminOverviewPage() {
  const [counts, setCounts] = React.useState<Counts | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const supabase = createSupabaseBrowserClient();

        const [casesAll, usersAll, docsAll] = await Promise.all([
          supabase.from("cases").select("id,status", { count: "exact", head: true }),
          supabase.from("profiles").select("id", { count: "exact", head: true }),
          supabase.from("documents").select("id", { count: "exact", head: true }),
        ]);

        if (casesAll.error) throw new Error(casesAll.error.message);
        if (usersAll.error) throw new Error(usersAll.error.message);
        if (docsAll.error) throw new Error(docsAll.error.message);

        // Para contar por status sin RPC: pequeño fetch (limit razonable).
        // Si luego quieres exactitud a escala, lo pasamos a una view/RPC.
        const cases = await supabase.from("cases").select("status").limit(5000);
        if (cases.error) throw new Error(cases.error.message);

        const statuses = (cases.data ?? []).map((c) => String(c.status));
        const cOpen = statuses.filter((s) => s === "open").length;
        const cUnder = statuses.filter((s) => s === "under_review").length;
        const cCompleted = statuses.filter((s) => s === "completed").length;

        const next: Counts = {
          casesTotal: casesAll.count ?? 0,
          casesOpen: cOpen,
          casesUnderReview: cUnder,
          casesCompleted: cCompleted,
          usersTotal: usersAll.count ?? 0,
          documentsTotal: docsAll.count ?? 0,
        };

        if (alive) setCounts(next);
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

  if (!counts) {
    return (
      <Card>
        <InfoBox title="Cargando" variant="info">
          Cargando métricas...
        </InfoBox>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="space-y-1 p-4">
        <div className="text-sm opacity-80">Cases</div>
        <div className="text-2xl font-semibold">{counts.casesTotal}</div>
        <div className="text-xs opacity-80">open: {counts.casesOpen} · under_review: {counts.casesUnderReview} · completed: {counts.casesCompleted}</div>
      </Card>

      <Card className="space-y-1 p-4">
        <div className="text-sm opacity-80">Users</div>
        <div className="text-2xl font-semibold">{counts.usersTotal}</div>
      </Card>

      <Card className="space-y-1 p-4">
        <div className="text-sm opacity-80">Documents</div>
        <div className="text-2xl font-semibold">{counts.documentsTotal}</div>
      </Card>
    </div>
  );
}