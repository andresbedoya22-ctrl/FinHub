import fs from "node:fs";

const file = process.argv[2];
if (!file) throw new Error("Usage: node tools/patch-finny-rate-limit.mjs <route.ts>");

let s = fs.readFileSync(file, "utf8");

if (s.includes("FINNY_RATE_LIMIT: in-memory per user")) {
  console.log("already patched", file);
  process.exit(0);
}

// Insertar helpers cerca de top-level (después de exports runtime/dynamic si existen)
const anchor = /export const runtime\s*=\s*["']nodejs["'];\s*\r?\n/m;
const m = s.match(anchor);
if (!m) throw new Error("No encontré `export const runtime = \"nodejs\";` como anchor.");

const block = `
/**
 * FINNY_RATE_LIMIT: in-memory per user (MVP)
 * Nota: en producción multi-instance necesitas Redis/Upstash para consistencia.
 */
type RL = { t0: number; n: number };
const RL_WINDOW_MS = 60_000;
const RL_MAX = 20;
const rl = new Map<string, RL>();

function hitRateLimit(key: string) {
  const now = Date.now();
  const cur = rl.get(key);
  if (!cur || now - cur.t0 > RL_WINDOW_MS) {
    rl.set(key, { t0: now, n: 1 });
    return { ok: true as const, remaining: RL_MAX - 1 };
  }
  cur.n += 1;
  if (cur.n > RL_MAX) return { ok: false as const, remaining: 0 };
  return { ok: true as const, remaining: RL_MAX - cur.n };
}
`;

s = s.replace(anchor, (hit) => hit + block);

// Insertar el check justo después del AUTH_GUARD (tras `if (!user) return bad(...)`)
const authEnd = /if\s*\(\s*!user\s*)\s*return\s*bad\([^)]*)\s*,\s*401);\s*\r?\n/m;
if (!authEnd.test(s)) throw new Error("No encontré el final del AUTH_GUARD para insertar rate-limit.");

s = s.replace(authEnd, (hit) => {
  return hit + `
  // FINNY_RATE_LIMIT: in-memory per user (MVP)
  const rlKey = user.id;
  const rlHit = hitRateLimit(rlKey);
  if (!rlHit.ok) return bad("Demasiadas solicitudes. Intenta de nuevo en ~1 minuto.", 429);
`;
});

if (!s.endsWith("\n")) s += "\n";
fs.writeFileSync(file, s, "utf8");
console.log("patched", file);

