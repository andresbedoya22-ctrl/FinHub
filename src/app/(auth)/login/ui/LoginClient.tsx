"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { Card } from "@/ui/components/Card";
import { InfoBox } from "@/ui/components/InfoBox";
import { Button } from "@/ui/components/Button";
import { Input } from "@/ui/components/Input";
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
    <div className="mx-auto max-w-md p-6">
      <Card className="space-y-4 p-6">
        <div className="text-lg font-semibold">{t("login.title")}</div>

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

        <div className="space-y-2">
          <Button type="button" onClick={() => onOAuth("google")} disabled={busy}>
            {t("oauth.google")}
          </Button>
          <Button type="button" onClick={() => onOAuth("apple")} disabled={busy}>
            {t("oauth.apple")}
          </Button>
        </div>

        <div className="h-px bg-white/10" />

        <form className="space-y-3" onSubmit={onSubmit}>
          <Input
            label={t("common.email")}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label={t("common.password")}
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <Button type="submit" disabled={busy}>
            {busy ? t("login.busy") : t("login.submit")}
          </Button>
        </form>

        <div className="text-sm opacity-80">
          <Link
            className="underline"
            href={redirectToRaw ? `/forgot-password?redirectTo=${encodeURIComponent(nextUrl)}` : "/forgot-password"}
          >
            {t("login.forgot")}
          </Link>
        </div>

        {errorCode === "email_not_confirmed" ? (
          <div className="space-y-2">
            <InfoBox title={t("common.info")} variant="info">
              {t("login.emailNotConfirmedHint")}
            </InfoBox>
            <Button type="button" onClick={onResendVerification} disabled={busyResend || !email.trim()}>
              {busyResend ? t("login.resendBusy") : t("login.resend")}
            </Button>
          </div>
        ) : null}

        <div className="text-sm opacity-80">
          {t("login.noAccount")}{" "}
          <Link className="underline" href={registerHref}>
            {t("login.goRegister")}
          </Link>
        </div>

        <div className="text-xs opacity-70">
          {t("legal.continue")}{" "}
          <Link className="underline" href="/terms">
            {t("legal.terms")}
          </Link>{" "}
          {t("legal.and")}{" "}
          <Link className="underline" href="/privacy">
            {t("legal.privacy")}
          </Link>
          .
        </div>
      </Card>
    </div>
  );
}