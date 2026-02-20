"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { InfoBox } from "@/ui/components/InfoBox";
import { safePath } from "@/features/auth/safeRedirect";

type ApiOk = { ok: true; userId?: string | null };
type ApiErr = { ok: false; code?: string };
type ApiResponse = ApiOk | ApiErr;

export function LoginClient() {
  const t = useTranslations("auth");
  const router = useRouter();
  const sp = useSearchParams();

  const redirectToRaw = sp?.get("redirectTo") ?? sp?.get("next");
  const nextUrl = useMemo(() => safePath(redirectToRaw, "/app"), [redirectToRaw]);
  const oauthError = sp?.get("error") === "oauth";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(oauthError ? "oauth_failed" : null);
  const [info, setInfo] = useState<string | null>(null);
  const [busyResend, setBusyResend] = useState(false);

  function errorText(code: string | null): string | null {
    if (!code) return null;
    const key = `errors.${code}`;
    try {
      return t(key as never);
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
      const res = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const json = (await res.json().catch(() => null)) as ApiResponse | null;

      if (!res.ok || !json || json.ok !== true) {
        const code = json && "code" in json ? json.code : "unknown";
        setErrorCode(code ?? "unknown");
        return;
      }

      router.replace(nextUrl);
    } finally {
      setBusy(false);
    }
  }

  async function onResendVerification() {
    setBusyResend(true);
    setInfo(null);
    setErrorCode(null);

    try {
      const res = await fetch("/api/auth/resend-verification", {
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

      setInfo(t("login.resendOk"));
    } finally {
      setBusyResend(false);
    }
  }

  function onOAuth(provider: "google" | "apple") {
    setInfo(null);
    setErrorCode(null);

    const url = `/api/auth/oauth/start?provider=${encodeURIComponent(provider)}&redirectTo=${encodeURIComponent(nextUrl)}`;
    window.location.href = url;
  }

  const errMsg = errorText(errorCode);
  const registerHref = redirectToRaw ? `/register?redirectTo=${encodeURIComponent(nextUrl)}` : "/register";

  return (
    <div className="flex min-h-screen bg-[#0D1B2A] text-gray-100">
      {/* Visual side - Desktop only */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-gradient-to-br from-[#0D1B2A] to-[#1a3652] border-r border-white/5">
        <div>
          <Link href="/" className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Fin<span className="text-[#4CAF50]">Hub</span>
          </Link>
        </div>

        <div className="space-y-6">
          <h1 className="text-4xl font-bold leading-tight">
            Welcome back to your financial hub
          </h1>
          <p className="text-lg text-gray-400">
            Control your money, check your toeslagen, and get guided financial support in the Netherlands.
          </p>

          <div className="pt-8 grid gap-4">
            <div className="flex items-center gap-3 text-sm text-gray-300">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#4CAF50]/20 text-[#4CAF50]">✓</div>
              Secure & encrypted
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-300">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#4CAF50]/20 text-[#4CAF50]">✓</div>
              No DigiD required
            </div>
          </div>
        </div>

        <div className="text-sm text-gray-500">
          © 2026 FinHub
        </div>
      </div>

      {/* Form side */}
      <div className="flex flex-1 flex-col justify-center px-4 sm:px-6 lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">

          <div className="mb-8 lg:hidden">
            <Link href="/" className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              Fin<span className="text-[#4CAF50]">Hub</span>
            </Link>
          </div>

          <h2 className="text-2xl font-semibold tracking-tight text-white mb-6">
            {t("login.title")}
          </h2>

          <div className="space-y-6">
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

            <div className="grid gap-3">
              <button
                type="button"
                onClick={() => onOAuth("google")}
                disabled={busy}
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-700 bg-white/5 px-4 py-3 text-sm font-medium text-white hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                {t("oauth.google")}
              </button>
              <button
                type="button"
                onClick={() => onOAuth("apple")}
                disabled={busy}
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-700 bg-white/5 px-4 py-3 text-sm font-medium text-white hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                <svg className="h-5 w-5" viewBox="0 0 384 512" fill="currentColor">
                  <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
                </svg>
                {t("oauth.apple")}
              </button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-700" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-[#0D1B2A] px-2 text-gray-500">Or continue with</span>
              </div>
            </div>

            <form className="space-y-5" onSubmit={onSubmit}>
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

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-300">{t("common.password")}</label>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-gray-700 bg-white/5 px-4 py-3 text-white placeholder-gray-500 focus:border-[#4CAF50] focus:outline-none focus:ring-1 focus:ring-[#4CAF50] transition-colors"
                  required
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-gray-400 group cursor-pointer">
                  <div className="relative flex items-center">
                    <input type="checkbox" className="peer sr-only" />
                    <div className="h-4 w-4 rounded border border-gray-600 bg-transparent peer-checked:border-[#4CAF50] peer-checked:bg-[#4CAF50] group-hover:border-[#4CAF50] transition-colors"></div>
                    <svg className="absolute left-0.5 top-0.5 h-3 w-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  Remember me
                </label>
                <div className="text-sm">
                  <Link
                    className="text-[#4CAF50] hover:text-[#4CAF50]/80 transition-colors"
                    href={redirectToRaw ? `/forgot-password?redirectTo=${encodeURIComponent(nextUrl)}` : "/forgot-password"}
                  >
                    {t("login.forgot")}
                  </Link>
                </div>
              </div>

              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-xl bg-[#4CAF50] px-4 py-3 text-sm font-bold text-[#0D1B2A] hover:bg-[#4CAF50]/90 focus:outline-none focus:ring-2 focus:ring-[#4CAF50] focus:ring-offset-2 focus:ring-offset-[#0D1B2A] transition-all disabled:opacity-50"
              >
                {busy ? t("login.busy") : t("login.submit")}
              </button>
            </form>

            {errorCode === "email_not_confirmed" ? (
              <div className="space-y-3 rounded-xl border border-blue-500/20 bg-blue-500/10 p-4">
                <p className="text-sm text-blue-200">{t("login.emailNotConfirmedHint")}</p>
                <button
                  type="button"
                  onClick={onResendVerification}
                  disabled={busyResend || !email.trim()}
                  className="rounded-lg bg-blue-500/20 px-3 py-2 text-sm font-medium text-blue-300 hover:bg-blue-500/30 transition-colors disabled:opacity-50"
                >
                  {busyResend ? t("login.resendBusy") : t("login.resend")}
                </button>
              </div>
            ) : null}

            <p className="text-center text-sm text-gray-400">
              {t("login.noAccount")}{" "}
              <Link className="font-semibold text-white hover:text-[#4CAF50] transition-colors" href={registerHref}>
                {t("login.goRegister")}
              </Link>
            </p>

            <div className="mt-8 text-center text-xs text-gray-500">
              {t("legal.continue")}{" "}
              <Link className="underline hover:text-gray-400" href="/terms">
                {t("legal.terms")}
              </Link>{" "}
              {t("legal.and")}{" "}
              <Link className="underline hover:text-gray-400" href="/privacy">
                {t("legal.privacy")}
              </Link>
              .
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}