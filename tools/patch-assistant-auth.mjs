import fs from "node:fs";

const file = process.argv[2];
if (!file) throw new Error("Usage: node tools/patch-assistant-auth.mjs <route.ts>");

let s = fs.readFileSync(file, "utf8");

// idempotente
if (s.includes("AUTH_GUARD: require logged-in user")) {
  console.log("already patched", file);
  process.exit(0);
}

// 1) imports necesarios
const needCookies = !s.includes('from "next/headers"') && !s.includes("from 'next/headers'");
const needSupabase = !s.includes('from "@supabase/ssr"') && !s.includes("from '@supabase/ssr'");

if (needCookies || needSupabase) {
  const lines = s.split(/\r?\n/);
  let lastImport = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*import .*;\s*$/.test(lines[i])) lastImport = i;
  }
  const toInsert = [];
  if (needCookies) toInsert.push('import { cookies } from "next/headers";');
  if (needSupabase) toInsert.push('import { createServerClient } from "@supabase/ssr";');

  if (lastImport >= 0) lines.splice(lastImport + 1, 0, ...toInsert);
  else lines.unshift(...toInsert);

  s = lines.join("\n");
}

// 2) insertar guard tras validación de message
const markerRegex = /if\s*\(\s*message\.length\s*<\s*2\s*\)\s*return\s*bad\([^)]*\)\s*;?/m;
const m = s.match(markerRegex);
if (!m) throw new Error("No encontré el marker de validación `if (message.length < 2) return bad(...)` para inyectar guard.");

const guard = `
  // AUTH_GUARD: require logged-in user (avoid public LLM abuse)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return bad("Supabase env missing (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)", 500);
  }

  const cookieStore = cookies();
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // noop
        }
      },
    },
  });

  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr) return bad(authErr.message, 401);
  if (!user) return bad("No autorizado", 401);
`;

s = s.replace(markerRegex, (hit) => hit + guard);

if (!s.endsWith("\n")) s += "\n";
fs.writeFileSync(file, s, "utf8");
console.log("patched", file);

