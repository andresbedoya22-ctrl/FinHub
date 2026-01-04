export type AuthErrorCode =
  | "invalid_request"
  | "invalid_credentials"
  | "email_not_confirmed"
  | "user_exists"
  | "weak_password"
  | "rate_limited"
  | "oauth_failed"
  | "missing_code"
  | "unknown";

type SupabaseLikeError = { message?: string; status?: number; code?: string } | null | undefined;

function msgOf(e: unknown): string {
  if (!e || typeof e !== "object") return "";
  const m = (e as { message?: unknown }).message;
  return typeof m === "string" ? m : "";
}

function statusOf(e: unknown): number | null {
  if (!e || typeof e !== "object") return null;
  const s = (e as { status?: unknown }).status;
  return typeof s === "number" ? s : null;
}

export function mapSupabaseAuthError(e: SupabaseLikeError): { code: AuthErrorCode; status: number } {
  const m = msgOf(e).toLowerCase();
  const st = statusOf(e);

  if (st === 429) return { code: "rate_limited", status: 429 };

  if (m.includes("invalid login credentials")) return { code: "invalid_credentials", status: 401 };
  if (m.includes("email not confirmed")) return { code: "email_not_confirmed", status: 403 };
  if (m.includes("user already registered") || m.includes("already registered")) return { code: "user_exists", status: 409 };
  if (m.includes("password") && (m.includes("at least") || m.includes("should be"))) return { code: "weak_password", status: 400 };

  if (st && st >= 400 && st < 600) return { code: "unknown", status: st };
  return { code: "unknown", status: 500 };
}