"use client";

import { useRouter, useSearchParams } from "next/navigation";
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

export function ResetPasswordClient() {
  const t = useTranslations("auth");
  const router = useRouter();
  const sp = useSearchParams();

  const code = sp?.get("code");
  const redirectToRaw = sp?.get("redirectTo") ?? sp?.get("next");
  const nextUrl = useMemo(() => safePath(redirectToRaw, "/app"), [redirectToRaw]);

  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(code ? null : "missing_code");
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
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, password }),
      });

      const json = (await res.json().catch(() => null)) as ApiResponse | null;

      if (!res.ok || !json || json.ok !== true) {
        const c = json && "code" in json ? json.code : "unknown";
        setErrorCode(c ?? "unknown");
        return;
      }

      setInfo(t("reset.ok"));
      router.replace(nextUrl);
    } finally {
      setBusy(false);
    }
  }

  const errMsg = errorText(errorCode);

  return (
    <div className="mx-auto max-w-md p-6">
      <Card className="space-y-4 p-6">
        <div className="text-lg font-semibold">{t("reset.title")}</div>

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
            label={t("reset.newPassword")}
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Button type="submit" disabled={busy || !code}>
            {busy ? t("reset.busy") : t("reset.submit")}
          </Button>
        </form>
      </Card>
    </div>
  );
}