type TranslateFn = (key: string) => string;

const ERROR_CODE_KEYS: Record<string, string> = {
  invalid_slug: "errors.invalidSlug",
  missing_application_id: "errors.missingApplicationId",
  invalid_application: "errors.invalidApplication",
  unauthorized: "errors.authRequired",
  forbidden: "errors.permissionDenied",
  invalid_origin: "errors.checkoutFailed",
  payment_unavailable: "errors.paymentUnavailable",
  stripe_session_invalid: "errors.paymentUnavailable",
  checkout_failed: "errors.checkoutFailed",
};

const PATTERN_KEYS: Array<{ pattern: RegExp; key: string }> = [
  { pattern: /schema cache/i, key: "errors.tableMissing" },
  { pattern: /could not find the table/i, key: "errors.tableMissing" },
  { pattern: /subsidies_applications/i, key: "errors.tableMissing" },
  { pattern: /row-level security/i, key: "errors.permissionDenied" },
  { pattern: /permission denied/i, key: "errors.permissionDenied" },
  { pattern: /no authenticated user/i, key: "errors.authRequired" },
  { pattern: /invalid subsidy slug/i, key: "errors.invalidSlug" },
  { pattern: /jwt/i, key: "errors.authRequired" },
  { pattern: /networkerror|failed to fetch/i, key: "errors.network" },
];

function extractErrorPayload(error: unknown): { message: string; detail?: string } {
  if (typeof error === "string") return { message: error };
  if (error instanceof Error) return { message: error.message, detail: error.message };
  if (error && typeof error === "object") {
    const obj = error as { error?: unknown; code?: unknown; detail?: unknown; message?: unknown };
    const code = typeof obj.error === "string" ? obj.error : typeof obj.code === "string" ? obj.code : "";
    const msg = typeof obj.message === "string" ? obj.message : "";
    const detail = typeof obj.detail === "string" ? obj.detail : msg || undefined;
    return { message: code || msg, detail };
  }
  return { message: "" };
}

export function mapSubsidyError(error: unknown): { key: string; detail?: string } {
  const { message, detail } = extractErrorPayload(error);
  const normalized = message.trim().toLowerCase();
  if (normalized && ERROR_CODE_KEYS[normalized]) {
    return { key: ERROR_CODE_KEYS[normalized], detail: detail ?? message };
  }

  for (const { pattern, key } of PATTERN_KEYS) {
    if (pattern.test(detail ?? message)) return { key, detail: detail ?? message };
  }

  return { key: "errors.unknown", detail: (detail ?? message) || undefined };
}

export function formatSubsidyError(error: unknown, t: TranslateFn): string {
  const { key, detail } = mapSubsidyError(error);
  if (detail && process.env.NODE_ENV !== "production") {
    console.warn("[subsidies:error]", detail);
  }
  return t(key);
}
