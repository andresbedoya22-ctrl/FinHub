"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowserClient";
import { Card } from "@/ui/components/Card";
import { InfoBox } from "@/ui/components/InfoBox";
import { Button } from "@/ui/components/Button";
import { Input } from "@/ui/components/Input";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(null);
    setBusy(true);

    try {
      const supabase = createSupabaseBrowserClient();

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (error) throw error;

      // Si Supabase devuelve sesiÃ³n directa, la persistimos; si requiere email confirm, mostramos aviso.
      if (data.session) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
        router.replace("/app");
        return;
      }

      setOk("Cuenta creada. Revisa tu email para confirmar (si estÃ¡ habilitado). Luego haz login.");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md p-6">
      <Card className="space-y-4 p-6">
        <div className="text-lg font-semibold">Registro</div>

        {error ? (
          <InfoBox title="Error" variant="danger">
            {error}
          </InfoBox>
        ) : null}

        {ok ? (
          <InfoBox title="Listo">
            {ok}
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
            label="ContraseÃ±a"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <Button type="submit" disabled={busy}>
            {busy ? "Creando..." : "Crear cuenta"}
          </Button>
        </form>

        <div className="text-sm opacity-80">
          Â¿Ya tienes cuenta?{" "}
          <Link className="underline" href="/login">
            Login
          </Link>
        </div>
      </Card>
    </div>
  );
}