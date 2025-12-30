"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { Card } from "@/ui/components/Card";
import { InfoBox } from "@/ui/components/InfoBox";
import { Button } from "@/ui/components/Button";
import { Input } from "@/ui/components/Input";

type ApiOk = { ok: true };
type ApiErr = { ok: false; error?: string };
type ApiResponse = ApiOk | ApiErr;

export function LoginClient() {
  const router = useRouter();
  const sp = useSearchParams();

  const nextUrl = useMemo(() => {
    const n = sp?.get("next");
    return n && n.startsWith("/") ? n : "/app";
  }, [sp]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const json = (await res.json().catch(() => null)) as ApiResponse | null;

      if (!res.ok || !json || json.ok !== true) {
        const msg = json && "error" in json ? json.error : undefined;
        throw new Error(msg ?? "No se pudo iniciar sesión");
      }

      router.replace(nextUrl);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md p-6">
      <Card className="space-y-4 p-6">
        <div className="text-lg font-semibold">Login</div>

        {error ? (
          <InfoBox title="Error" variant="danger">
            {error}
          </InfoBox>
        ) : null}

        <form className="space-y-3" onSubmit={onSubmit}>
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label="Contraseña"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <Button type="submit" disabled={busy}>
            {busy ? "Entrando..." : "Entrar"}
          </Button>
        </form>

        <div className="text-sm opacity-80">
          ¿No tienes cuenta?{" "}
          <Link className="underline" href="/register">
            Regístrate
          </Link>
        </div>

        <div className="text-xs opacity-70">
          Al continuar aceptas los{" "}
          <Link className="underline" href="/terms">
            Términos
          </Link>{" "}
          y la{" "}
          <Link className="underline" href="/privacy">
            Política de Privacidad
          </Link>
          .
        </div>
      </Card>
    </div>
  );
}
