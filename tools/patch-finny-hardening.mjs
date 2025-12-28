import fs from "node:fs";

const file = process.argv[2];
if (!file) throw new Error("Usage: node tools/patch-finny-hardening.mjs <route.ts>");

let s = fs.readFileSync(file, "utf8");

// Idempotencia
if (s.includes("FINNY_HARDENING: allowlist models + max_output_tokens")) {
  console.log("already patched", file);
  process.exit(0);
}

// 1) Insertar allowlist justo después de la línea `const model = ...`
const modelLine = /const\s+model\s*=\s*.*?;\s*\r?\n/;
const m = s.match(modelLine);
if (!m) throw new Error("No encontré `const model = ...;` en el route para inyectar hardening.");

const allowlistBlock = `
  // FINNY_HARDENING: allowlist models + max_output_tokens
  const ALLOWED_MODELS = new Set([
    "gpt-4.1-mini",
    "gpt-4.1",
    "gpt-4o-mini",
  ]);
  if (!ALLOWED_MODELS.has(model)) {
    return bad("FINNY_OPENAI_MODEL no permitido por política del servidor", 500);
  }

`;

s = s.replace(modelLine, (hit) => hit + allowlistBlock);

// 2) Asegurar max_output_tokens en client.responses.create({ ... })
if (!s.includes("max_output_tokens")) {
  // Inserta después de `model,` dentro del objeto create
  const createCall = /client\.responses\.create\(\{\s*[\s\S]*?model\s*,/m;
  if (!createCall.test(s)) throw new Error("No pude ubicar `client.responses.create({ ... model,` para insertar max_output_tokens.");
  s = s.replace(createCall, (hit) => hit + `\n      max_output_tokens: 400,`);
}

if (!s.endsWith("\n")) s += "\n";
fs.writeFileSync(file, s, "utf8");
console.log("patched", file);
