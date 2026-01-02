"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { Card } from "@/ui/components/Card";
import { InfoBox } from "@/ui/components/InfoBox";
import { Button } from "@/ui/components/Button";
import { Input } from "@/ui/components/Input";

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
    <div className="mx-auto max-w-md p-6">
      <Card className="space-y-4 p-6">
        <div className="text-lg font-semibold">{t("forgot.title")}</div>

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

        <form className="space-y-3" onSubmit={onSubmit}>
          <Input
            label={t("common.email")}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Button type="submit" disabled={busy}>
            {busy ? t("forgot.busy") : t("forgot.submit")}
          </Button>
        </form>

        <div className="text-sm opacity-80">
          <Link className="underline" href={loginHref}>
            {t("forgot.backToLogin")}
          </Link>
        </div>
      </Card>
    </div>
  );
}