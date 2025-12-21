import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { Screen } from "@/ui/components/Screen";
import { Header } from "@/ui/components/Header";
import { Card } from "@/ui/components/Card";
import { InfoBox } from "@/ui/components/InfoBox";

async function loginAction(formData: FormData) {
  "use server";

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();

  if (!email || !password) {
    redirect("/login?error=missing_credentials");
  }

  const cookieStore = await cookies();
  cookieStore.set("fh_session", "1", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
  });

  redirect("/app");
}

export default function LoginPage({
  searchParams,
}: {
  searchParams?: { error?: string };
}) {
  const error = searchParams?.error;

  return (
    <Screen className="space-y-6">
      <Header
        title="Login"
        subtitle="Autenticación temporal (stub). La autenticación real y roles se implementan en la siguiente fase."
        right={
          <Link
            href="/landing"
            className="rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm hover:bg-fh-surface-2"
          >
            Volver al Landing
          </Link>
        }
      />

      {error === "missing_credentials" ? (
        <InfoBox title="Faltan datos" variant="warning">
          Escribe email y contraseña (placeholder) para entrar al dashboard.
        </InfoBox>
      ) : null}

      <Card className="space-y-4">
        <InfoBox title="Pendiente" variant="warning">
          Auth real + roles + backend. Hoy solo habilitamos el flujo de Fase 5:
          sesión stub y protección de rutas.
        </InfoBox>

        <form action={loginAction} className="space-y-3">
          <div className="space-y-1">
            <label className="text-sm font-medium">Email</label>
            <input
              name="email"
              type="email"
              autoComplete="email"
              placeholder="tu@email.com"
              className="w-full rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-fh-accent/30"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Contraseña</label>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full rounded-xl border border-fh-border bg-fh-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-fh-accent/30"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-fh-accent px-4 py-2 text-sm font-medium text-white hover:opacity-95"
          >
            Entrar
          </button>
        </form>
      </Card>
    </Screen>
  );
}
