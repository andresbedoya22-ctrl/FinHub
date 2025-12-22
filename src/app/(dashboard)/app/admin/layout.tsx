"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/ui/components/Card";
import { InfoBox } from "@/ui/components/InfoBox";
import { getMyRole } from "@/features/auth/roleClient";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = React.useState<"loading" | "allowed" | "denied">("loading");

  React.useEffect(() => {
    let alive = true;
    (async () => {
      const role = await getMyRole();
      if (!alive) return;
      if (role === "admin") setState("allowed");
      else {
        setState("denied");
        router.replace("/app");
      }
    })();
    return () => {
      alive = false;
    };
  }, [router]);

  if (state === "loading") {
    return (
      <Card>
        <InfoBox title="Cargando" variant="info">
          Verificando acceso de administrador...
        </InfoBox>
      </Card>
    );
  }

  if (state === "denied") {
    return (
      <Card>
        <InfoBox title="Sin acceso" variant="warning">
          No tienes permisos para ver esta sección.
        </InfoBox>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 text-sm">
        <Link className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 hover:bg-fh-surface-2" href="/app/admin">
          Overview
        </Link>
        <Link className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 hover:bg-fh-surface-2" href="/app/admin/cases">
          Cases
        </Link>
        <Link className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 hover:bg-fh-surface-2" href="/app/admin/users">
          Users
        </Link>
      </div>

      {children}
    </div>
  );
}