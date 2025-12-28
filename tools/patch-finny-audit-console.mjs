import fs from "node:fs";

const file = process.argv[2];
if (!file) throw new Error("Usage: node tools/patch-finny-audit-console.mjs <route.ts>");

let s = fs.readFileSync(file, "utf8");

if (s.includes("FINNY_AUDIT: console")) {
  console.log("already patched", file);
  process.exit(0);
}

// Buscamos el lugar antes de responder ok=true (NextResponse.json({ ok: true ... }))
const okReturn = /return\s+NextResponse\.json\(\{\s*ok:\s*true[\s\S]*?\}\s*,\s*\{\s*status:\s*200\s*\}\s*\)\s*;?/m;
const m = s.match(okReturn);
if (!m) throw new Error("No encontré el return ok=true para inyectar audit console.");

const audit = `
    // FINNY_AUDIT: console (MVP)
    console.info("[finny.chat]", {
      user_id: user.id,
      lang,
      textLang,
      mode,
      input_len: message.length,
      output_len: (answer ?? "").length,
      ts: new Date().toISOString(),
    });
`;

s = s.replace(okReturn, (hit) => audit + "\n" + hit);

if (!s.endsWith("\n")) s += "\n";
fs.writeFileSync(file, s, "utf8");
console.log("patched", file);
