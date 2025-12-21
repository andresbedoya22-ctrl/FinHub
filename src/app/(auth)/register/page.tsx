"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-fh-bg">
      <div className="fh-container py-10">
        <div className="mx-auto max-w-md space-y-4">
          <h1 className="text-2xl font-semibold">Crear cuenta</h1>

          {msg ? (
            <div className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm">
              {msg}
            </div>
          ) : null}

          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-fh-accent/30"
              placeholder="tu@email.com"
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">ContraseÃ±a</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              className="w-full rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-fh-accent/30"
              placeholder="mÃ­nimo 8 recomendable"
              autoComplete="new-password"
            />
          </div>

          <button
            disabled={loading}
            onClick={async () => {
              if (loading) return;
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

              // Si tienes confirmaciÃ³n de email DESACTIVADA, normalmente llega sesiÃ³n aquÃ­
              if (data.session) {
                document.cookie = `fh_session=1; path=/; samesite=lax`;
                router.push("/app/cases");
              } else {
                setMsg("Cuenta creada. Si Supabase exige confirmar email, revisa tu correo y luego haz login.");
              }

              setLoading(false);
            }}
            className="w-full rounded-xl bg-fh-accent px-4 py-2 text-sm font-medium text-white hover:opacity-95 disabled:opacity-50"
          >
            {loading ? "Creando..." : "Crear"}
          </button>

          <button
            onClick={() => router.push("/login")}
            className="w-full rounded-xl border border-fh-border bg-fh-surface px-4 py-2 text-sm hover:bg-fh-surface-2"
          >
            Volver a login
          </button>
        </div>
      </div>
    </div>
  );
}
