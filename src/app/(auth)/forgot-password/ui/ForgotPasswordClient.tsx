"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { InfoBox } from "@/ui/components/InfoBox";

type ApiOk = { ok: true };
type ApiErr = { ok: false; code?: string };
type ApiResponse = ApiOk | ApiErr;

function safePath(raw: string | null, fallback = "/app") {
  if (!raw) return fallback;
  const s = raw.trim();
  if (!s.startsWith("/")) return fallback;
  if (s.startsWith("//")) return fallback;
  if (s.includes("\\") || s.includes("\u0000")) return fallback;
  return s;
}

export function ForgotPasswordClient() {
  const t = useTranslations("auth");
  const sp = useSearchParams();

  const redirectToRaw = sp?.get("redirectTo") ?? sp?.get("next");
  const nextUrl = useMemo(() => safePath(redirectToRaw, "/app"), [redirectToRaw]);

  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  function errorText(code: string | null): string | null {
    if (!code) return null;
    try {
      return t(`errors.${code}` as never);
    } catch {
      return t("errors.unknown");
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setInfo(null);
    setErrorCode(null);
    setBusy(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const json = (await res.json().catch(() => null)) as ApiResponse | null;

      if (!res.ok || !json || json.ok !== true) {
        const code = json && "code" in json ? json.code : "unknown";
        setErrorCode(code ?? "unknown");
        return;
      }

      setInfo(t("forgot.sent"));
    } finally {
      setBusy(false);
    }
  }

  const errMsg = errorText(errorCode);
  const loginHref = redirectToRaw ? `/login?redirectTo=${encodeURIComponent(nextUrl)}` : "/login";

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0D1B2A] px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-white/5 p-8 shadow-2xl backdrop-blur-sm border border-white/10">
        <div className="text-center">
          <Link href="/" className="inline-flex text-2xl font-bold tracking-tight text-white items-center gap-2 mb-2">
            Fin<span className="text-[#4CAF50]">Hub</span>
          </Link>
          <h2 className="text-3xl font-bold tracking-tight text-white mt-4">
            {t("forgot.title")}
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            Enter your email and we'll send you a recovery link
          </p>
        </div>

        <div className="mt-8 space-y-6">
          {info ? (
            <InfoBox title={t("common.info")} variant="info">
              {info}
            </InfoBox>
          ) : null}

          {errMsg ? (
            <InfoBox title={t("common.error")} variant="danger">
              {errMsg}
            </InfoBox>
          ) : null}

          <form className="space-y-6" onSubmit={onSubmit}>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-300">{t("common.email")}</label>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-gray-700 bg-white/5 px-4 py-3 text-white placeholder-gray-500 focus:border-[#4CAF50] focus:outline-none focus:ring-1 focus:ring-[#4CAF50] transition-colors"
                required
              />
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-[#4CAF50] px-4 py-3 text-sm font-bold text-[#0D1B2A] hover:bg-[#4CAF50]/90 focus:outline-none focus:ring-2 focus:ring-[#4CAF50] focus:ring-offset-2 focus:ring-offset-[#0D1B2A] transition-all disabled:opacity-50"
            >
              {busy ? t("forgot.busy") : t("forgot.submit")}
            </button>
          </form>

          <p className="text-center text-sm text-gray-400">
            <Link className="font-semibold text-white hover:text-[#4CAF50] transition-colors" href={loginHref}>
              {t("forgot.backToLogin")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}