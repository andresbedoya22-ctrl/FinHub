import fs from "node:fs";
import path from "node:path";

function walk(dir) {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

function hasUtf8Bom(buf) {
  return buf.length >= 3 && buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF;
}
function hasUtf16Bom(buf) {
  return buf.length >= 2 && (
    (buf[0] === 0xFF && buf[1] === 0xFE) || // UTF-16 LE
    (buf[0] === 0xFE && buf[1] === 0xFF)    // UTF-16 BE
  );
}
function looksUtf16(buf) {
  // Heurística: muchos 0x00 en texto = típico UTF-16 mal guardado
  const sample = buf.subarray(0, Math.min(buf.length, 4000));
  let zeros = 0;
  for (const b of sample) if (b === 0x00) zeros++;
  return zeros >= 20;
}

const roots = ["supabase/migrations", "docs/db"];
const exts = new Set([".sql"]);

const offenders = [];
for (const root of roots) {
  if (!fs.existsSync(root)) continue;
  for (const f of walk(root)) {
    if (!exts.has(path.extname(f))) continue;
    const buf = fs.readFileSync(f);
    if (hasUtf8Bom(buf) || hasUtf16Bom(buf) || looksUtf16(buf)) offenders.push(f);
  }
}

if (offenders.length) {
  console.error("Encoding check failed. Files must be UTF-8 without BOM (no UTF-16):");
  for (const f of offenders) console.error(" - " + f);
  process.exit(1);
} else {
  console.log("Encoding check OK (no BOM/UTF-16 in migrations/schema).");
}