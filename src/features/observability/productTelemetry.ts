import * as Sentry from "@sentry/nextjs";

const ENABLED = process.env.SENTRY_PRODUCT_TELEMETRY_ENABLED === "true";
const SAMPLE_RATE = Number(process.env.SENTRY_PRODUCT_TELEMETRY_SAMPLE_RATE ?? 0);

const MAX_STR = 120;

const BLOCKED_KEYS = new Set([
  "email","mail","name","first_name","last_name","fullname","phone","address","street","postcode","zip",
  "bsn","iban","account","token","access_token","refresh_token","authorization","cookie","set-cookie",
  "password","pass","secret","session","digid"
]);

function clampString(v: string): string {
  const s = v.trim();
  if (s.length <= MAX_STR) return s;
  return s.slice(0, MAX_STR) + "...";
}

function isLikelyPiiValue(v: unknown): boolean {
  if (typeof v !== "string") return false;
  const s = v.trim();
  if (!s) return false;
  if (s.includes("@")) return true;
  if (s.length > 160) return true;
  if (s.split(".").length >= 3 && s.length > 60) return true; // jwt-ish
  return false;
}

export type ProductEventName =
  | "auth.login.attempt"
  | "auth.login.success"
  | "auth.login.fail"
  | "auth.register.attempt"
  | "auth.register.success"
  | "auth.register.fail"
  | "case.create"
  | "doc.upload"
  | "ocr.start"
  | "ocr.finish"
  | "ocr.fail"
  | "checkout.start"
  | "checkout.success"
  | "checkout.fail"
  | "product.auth.login.success"
  | "product.auth.login.fail"
  | "product.auth.register.success"
  | "product.auth.register.fail"
  | "product.auth.oauth.success"
  | "product.auth.oauth.fail"
  | "product.auth.password_reset.request.success"
  | "product.auth.password_reset.request.fail"
  | "product.auth.password_reset.update.success"
  | "product.auth.password_reset.update.fail"
  | "product.auth.verify.resend.success"
  | "product.auth.verify.resend.fail"
  | "product.doc.upload.success"
  | "product.doc.upload.fail"
  | "product.ocr.start"
  | "product.ocr.success"
  | "product.ocr.fail"
  | "product.doc.verify.success"
  | "product.doc.verify.fail"
  | "product.payment.checkout.start"
  | "product.payment.checkout.success"
  | "product.payment.checkout.fail"
  | "product.assistant.chat.success"
  | "product.assistant.chat.fail"
  | "product.marketing.landing.view"
  | "product.marketing.cta.click"
  | "product.marketing.lead.submit.success"
  | "product.marketing.lead.submit.fail"
  | "product.marketing.lead.submit.attempt";

export type ProductEventAttr =
  | "surface"
  | "route"
  | "result"
  | "reason"
  | "docType"
  | "provider"
  | "step"
  | "latencyMs"
  | "interested_count"
  | "httpStatus"
  | "build"
  | "env"
  | "release"
  | "outcome"
  | "error_code"
  | "latency_bucket"
  | "status"
  | "doc_type"
  | "size_bucket"
  | "plan"
  | "intent";

type Attrs = Partial<Record<ProductEventAttr, string | number | boolean | null>>;

function shouldSample(): boolean {
  if (!ENABLED) return false;
  if (!Number.isFinite(SAMPLE_RATE) || SAMPLE_RATE <= 0) return false;
  if (SAMPLE_RATE >= 1) return true;
  return Math.random() < SAMPLE_RATE;
}

function sanitizeAttrs(attrs: Attrs | undefined): Record<string, string | number | boolean> | undefined {
  if (!attrs) return undefined;

  const out: Record<string, string | number | boolean> = {};
  for (const [kRaw, v] of Object.entries(attrs)) {
    const k = kRaw.trim();
    if (!k) continue;

    const lk = k.toLowerCase();
    if (BLOCKED_KEYS.has(lk)) continue;
    if (lk.startsWith("utm_")) continue;

    if (v === null || v === undefined) continue;

    if (typeof v === "string") {
      if (isLikelyPiiValue(v)) continue;
      out[k] = clampString(v);
      continue;
    }

    if (typeof v === "number" || typeof v === "boolean") {
      out[k] = v;
      continue;
    }
  }

  return Object.keys(out).length ? out : undefined;
}

export function trackProductEvent(name: ProductEventName, attrs?: Attrs) {
  if (!shouldSample()) return;

  const safeAttrs = sanitizeAttrs(attrs);

  Sentry.captureEvent({
    message: `product:${name}`,
    level: "info",
    tags: {
      "telemetry.kind": "product",
      "telemetry.name": name,
    },
    extra: safeAttrs,
  });
}

export type TelemetryOutcome = "success" | "fail";
export type LatencyBucket = "lt_250ms" | "lt_1s" | "lt_3s" | "gte_3s";

export function bucketLatencyMs(ms: number): LatencyBucket {
  if (!Number.isFinite(ms) || ms < 0) return "gte_3s";
  if (ms < 250) return "lt_250ms";
  if (ms < 1000) return "lt_1s";
  if (ms < 3000) return "lt_3s";
  return "gte_3s";
}

export type ProductRouteEventPair = {
  success: ProductEventName;
  fail: ProductEventName;
};

export function trackProductRoute(
  pair: ProductRouteEventPair,
  attrs: Attrs,
  t0: number,
  res: Response
): Response {
  const ms = Date.now() - t0;
  const ok = res.status >= 200 && res.status < 300;
  const outcome: TelemetryOutcome = ok ? "success" : "fail";

  trackProductEvent(ok ? pair.success : pair.fail, {
    ...attrs,
    outcome,
    latency_bucket: bucketLatencyMs(ms),
    status: res.status,
  });

  return res;
}