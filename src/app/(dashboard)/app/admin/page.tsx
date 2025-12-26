"use client";

import Link from "next/link";
import { Card } from "@/ui/components/Card";

function Tile({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link href={href} className="block">
      <Card className="p-4 hover:bg-fh-surface-2">
        <div className="text-sm font-semibold">{title}</div>
        <div className="mt-1 text-sm opacity-80">{desc}</div>
      </Card>
    </Link>
  );
}

export default function AdminPage() {
  return (
    <div className="space-y-4">
      <div>
        <div className="text-lg font-semibold">Admin</div>
        <div className="text-sm opacity-80">Revisión rápida de usuarios, casos y documentos.</div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Tile href="/app/admin/users" title="Users" desc="Listado de perfiles (últimos 200)." />
        <Tile href="/app/admin/cases" title="Cases" desc="Listado de casos (últimos 200 por updated_at)." />
        <Tile href="/app/admin/documents" title="Documents" desc="Revisar documentos subidos y su estado." />
      </div>
    </div>
  );
}