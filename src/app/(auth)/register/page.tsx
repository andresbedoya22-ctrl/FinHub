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

function RegisterClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createSupabaseBrowserClient();

  const redirectTo = useMemo(
    () => sanitizeRedirectTo(searchParams.get("redirectTo")),
    [searchParams]
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) router.replace(redirectTo);
    })();
  }, [supabase, router, redirectTo]);

  const pwOk = password.length >= 8;
  const match = password === confirm;
  const canSubmit = email.trim().length >= 5 && pwOk && match;

  return (
    <div className="min-h-screen bg-fh-bg">
      <Screen className="flex min-h-screen items-center justify-center py-10">
        <Card className="w-full max-w-md space-y-4">
          <div className="space-y-1">
            <div className="text-2xl font-semibold tracking-tight">Crear cuenta</div>
            <div className="text-sm text-fh-muted">
              Regístrate para empezar tu caso en FinHub.
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
              autoComplete="new-password"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Confirmar contraseña</label>
            <input
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              type="password"
              className="w-full rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-fh-accent/30"
              placeholder="Repite tu contraseña"
              autoComplete="new-password"
            />
          </div>

          {!pwOk ? (
            <div className="text-xs text-fh-muted">
              La contraseña debe tener al menos 8 caracteres.
            </div>
          ) : null}
          {pwOk && !match ? (
            <div className="text-xs text-fh-muted">Las contraseñas no coinciden.</div>
          ) : null}

          <button
            disabled={loading || !canSubmit}
            onClick={async () => {
              if (loading || !canSubmit) return;

              setLoading(true);
              setMsg(null);

              const { data, error } = await supabase.auth.signUp({
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
                setMsg("Cuenta creada. Revisa tu email para confirmar la cuenta y luego haz login.");
              }

              setLoading(false);
            }}
            className="w-full rounded-xl bg-fh-accent px-4 py-2 text-sm font-medium text-white hover:opacity-95 disabled:opacity-50"
          >
            {loading ? "Creando..." : "Crear cuenta"}
          </button>

          <div className="flex items-center justify-between gap-3 text-sm">
            <Link
              href={`/login?redirectTo=${encodeURIComponent(redirectTo)}`}
              className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 hover:bg-fh-surface-2"
            >
              Volver a login
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

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterClient />
    </Suspense>
  );
}
