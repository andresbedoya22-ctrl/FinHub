"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

import { Screen } from "@/ui/components/Screen";
import { Card } from "@/ui/components/Card";
import { InfoBox } from "@/ui/components/InfoBox";

function sanitizeRedirectTo(value: string | null): string {
  if (!value) return "/app";
  if (!value.startsWith("/")) return "/app";
  return value;
}

function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createSupabaseBrowserClient();

  const redirectTo = useMemo(
    () => sanitizeRedirectTo(searchParams.get("redirectTo")),
    [searchParams]
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) router.replace(redirectTo);
    })();
  }, [supabase, router, redirectTo]);

  const canSubmit = email.trim().length >= 5 && password.length >= 8;

  return (
    <div className="min-h-screen bg-fh-bg">
      <Screen className="flex min-h-screen items-center justify-center py-10">
        <Card className="w-full max-w-md space-y-4">
          <div className="space-y-1">
            <div className="text-2xl font-semibold tracking-tight">Accede a FinHub</div>
            <div className="text-sm text-fh-muted">
              Entra con tu email y contraseña para continuar.
            </div>
          </div>

          {msg ? (
            <InfoBox title="Aviso" variant="warning">
              {msg}
            </InfoBox>
          ) : null}

          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-fh-accent/30"
              placeholder="tu@email.com"
              autoComplete="email"
              inputMode="email"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Contraseña</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              className="w-full rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-fh-accent/30"
              placeholder="Mínimo 8 caracteres"
              autoComplete="current-password"
            />
          </div>

          <button
            disabled={loading || !canSubmit}
            onClick={async () => {
              if (loading || !canSubmit) return;

              setLoading(true);
              setMsg(null);

              const { data, error } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password,
              });

              if (error) {
                setMsg(error.message);
                setLoading(false);
                return;
              }

              if (data.session) {
                router.replace(redirectTo);
              } else {
                setMsg("No se recibió sesión. Revisa la configuración de Supabase Auth.");
              }

              setLoading(false);
            }}
            className="w-full rounded-xl bg-fh-accent px-4 py-2 text-sm font-medium text-white hover:opacity-95 disabled:opacity-50"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>

          <div className="flex items-center justify-between gap-3 text-sm">
            <Link
              href={`/register?redirectTo=${encodeURIComponent(redirectTo)}`}
              className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 hover:bg-fh-surface-2"
            >
              Crear cuenta
            </Link>

            <Link href="/landing" className="text-fh-muted hover:text-fh-text">
              Volver a la landing
            </Link>
          </div>
        </Card>
      </Screen>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginClient />
    </Suspense>
  );
}
