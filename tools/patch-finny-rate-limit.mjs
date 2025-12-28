import fs from "node:fs";

const file = process.argv[2];
if (!file) throw new Error("Usage: node tools/patch-finny-rate-limit.mjs <route.ts>");

let s = fs.readFileSync(file, "utf8");

// idempotente
if (s.includes("RATE_LIMIT: per-user (MVP)")) {
  console.log("already patched", file);
  process.exit(0);
}

// 1) helper top-level
const runtimeLine = /export\s+const\s+runtime\s*=\s*["']nodejs["']\s*;\s*\r?\n/m;
const rm = s.match(runtimeLine);
if (!rm) throw new Error("No encontré `export const runtime = \"nodejs\";` para insertar rate limit helper.");

const helper = `
/** RATE_LIMIT: per-user (MVP)
 * - Ventana: 60s
 * - Límite: 20 req/min por usuario autenticado
 * - Nota: en producción multi-instancia, migrar a Redis/Upstash.
 */
type RateBucket = { count: number; resetAt: number };
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 20;
const __rateBuckets = new Map<string, RateBucket>();

function rateLimitCheck(userId: string) {
  const now = Date.now();
  const b = __rateBuckets.get(userId);
  if (!b || b.resetAt <= now) {
    __rateBuckets.set(userId, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return { ok: true as const };
  }
  b.count += 1;
  if (b.count > RATE_LIMIT) {
    const retryAfterSec = Math.max(1, Math.ceil((b.resetAt - now) / 1000));
    return { ok: false as const, retryAfterSec };
  }
  return { ok: true as const };
}
`;
s = s.replace(runtimeLine, (hit) => hit + helper);

// 2) Enforce: insert after `if (!user) ... 401`
const authUserLine = /const\s*\{\s*data:\s*\{\s*user\s*\}\s*,\s*error:\s*authErr\s*\}\s*=\s*await\s*supabase\.auth\.getUser\(\)\s*;\s*\r?\n/m;
const au = s.match(authUserLine);
if (!au) throw new Error("No encontré `await supabase.auth.getUser()` (línea destructuring) para ubicar el auth guard.");

const afterAuthSliceStart = au.index + au[0].length;
const afterAuth = s.slice(afterAuthSliceStart);

// primer if (!user) con return 401 (flexible)
const ifNoUser = /if\s*\(\s*!user\s*\)\s*return\s*bad\([\s\S]*?\b401\b[\s\S]*?\)\s*;\s*\r?\n/m;
const nu = afterAuth.match(ifNoUser);
if (!nu) throw new Error("No encontré `if (!user) return bad(...401...)` después de getUser().");

const enforcement = `
  // RATE_LIMIT enforcement (MVP)
  const rl = rateLimitCheck(user.id);
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false as const, error: "Rate limit excedido" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

`;

const insertPos = afterAuthSliceStart + nu.index + nu[0].length;
s = s.slice(0, insertPos) + enforcement + s.slice(insertPos);

if (!s.endsWith("\n")) s += "\n";
fs.writeFileSync(file, s, "utf8");
console.log("patched", file);
