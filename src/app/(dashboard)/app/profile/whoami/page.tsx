"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowserClient";
import { Card } from "@/ui/components/Card";
import { InfoBox } from "@/ui/components/InfoBox";

type Out = {
  session: {
    hasSession: boolean;
    userId: string | null;
    email: string | null;
    expiresAt: number | null;
  };
  user: {
    id: string | null;
    email: string | null;
  };
  error: string | null;
};

export default function WhoAmIPage() {
  const [txt, setTxt] = useState<string>("Cargando...");

  useEffect(() => {
    let alive = true;

    (async () => {
      const out: Out = {
        session: { hasSession: false, userId: null, email: null, expiresAt: null },
        user: { id: null, email: null },
        error: null,
      };

      try {
        const supabase = createSupabaseBrowserClient();

        const s = await supabase.auth.getSession();
        if (s.error) throw s.error;

        const sess = s.data.session;
        out.session.hasSession = !!sess;
        out.session.userId = sess?.user?.id ?? null;
        out.session.email = sess?.user?.email ?? null;
        out.session.expiresAt = sess?.expires_at ?? null;

        const u = await supabase.auth.getUser();
        if (u.error) throw u.error;

        out.user.id = u.data.user?.id ?? null;
        out.user.email = u.data.user?.email ?? null;
      } catch (e: unknown) {
        out.error = e instanceof Error ? e.message : "Error desconocido";
      }

      if (alive) setTxt(JSON.stringify(out, null, 2));
    })();

    return () => {
      alive = false;
    };
  }, []);

  return (
    <Card className="space-y-3">
      <div className="text-sm font-semibold">WhoAmI</div>
      <pre className="text-xs whitespace-pre-wrap">{txt}</pre>
      <InfoBox title="Nota" variant="info">
        Si session.hasSession es false, el navegador no tiene sesión Supabase persistida.
      </InfoBox>
    </Card>
  );
}