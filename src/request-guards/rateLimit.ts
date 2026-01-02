type RateLimitOpts = {
  keyPrefix: string;
  limit: number;
  windowMs: number;
};

type RateLimitResult =
  | { limited: false }
  | { limited: true; retryAfterSec: number };

function getClientIp(req: Request): string {
  const h = req.headers;
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || "unknown";
  const xri = h.get("x-real-ip");
  if (xri) return xri.trim();
  return "unknown";
}

function nowMs(): number {
  return Date.now();
}

export function checkRateLimit(req: Request, opts: RateLimitOpts): RateLimitResult {
  const ip = getClientIp(req);
  const key = `${opts.keyPrefix}:${ip}`;

  const g = globalThis as unknown as { __fh_rate_limit__?: Map<string, number[]> };
  const store = (g.__fh_rate_limit__ ??= new Map<string, number[]>());

  const t = nowMs();
  const windowStart = t - opts.windowMs;

  const prev = store.get(key) ?? [];
  const next = prev.filter((x) => x > windowStart);
  next.push(t);
  store.set(key, next);

  if (next.length <= opts.limit) return { limited: false };

  // Retry after until earliest event exits window
  const earliest = Math.min(...next);
  const retryAfterMs = Math.max(0, opts.windowMs - (t - earliest));
  const retryAfterSec = Math.ceil(retryAfterMs / 1000);

  return { limited: true, retryAfterSec };
}