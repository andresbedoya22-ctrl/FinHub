const fs = require("fs");

function readUtf8(path) {
  return fs.readFileSync(path, "utf8");
}

function writeUtf8(path, s) {
  fs.writeFileSync(path, s, { encoding: "utf8" });
}

function replaceAllSafe(s, from, to) {
  return s.split(from).join(to);
}

function fixMigrationUtf8NoBom(path) {
  if (!fs.existsSync(path)) return;
  const b = fs.readFileSync(path);

  // UTF-16LE BOM
  if (b.length >= 2 && b[0] === 0xff && b[1] === 0xfe) {
    const s = b.slice(2).toString("utf16le");
    fs.writeFileSync(path, s, { encoding: "utf8" });
    return;
  }

  // UTF-8 BOM
  if (b.length >= 3 && b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf) {
    const s = b.slice(3).toString("utf8");
    fs.writeFileSync(path, s, { encoding: "utf8" });
    return;
  }

  // already UTF-8 (rewrite to normalize)
  fs.writeFileSync(path, b.toString("utf8"), { encoding: "utf8" });
}

const leadForm = "src/app/(marketing)/landing/ui/LandingLeadForm.tsx";
if (!fs.existsSync(leadForm)) {
  console.error("LeadForm not found:", leadForm);
  process.exit(1);
}

let s = readUtf8(leadForm);
const before = s;

// A) Mojibake fixes usando escapes unicode (ASCII-only en el script)
s = replaceAllSafe(s, "\u00e2\u0080\u00a6", "\u2026"); // â€¦ -> …
s = replaceAllSafe(s, "\u00e2\u009c\u0093", "\u2713"); // âœ“ -> ✓
s = replaceAllSafe(s, "\u00c3\u00a2\u00e2\u0082\u00ac\u00c2\u00a6", "\u2026"); // Ã¢â‚¬Â¦ -> …
s = replaceAllSafe(s, "\u00c3\u00a2\u00c5\u009c\u00c3\u00a2\u00e2\u0080\u009c", "\u2713"); // best-effort Ã¢Å“â€œ -> ✓

// B) attrs (por tu error previo)
s = s.replaceAll("interestsCount", "interested_count");

// C) Reescribir telemetry calls: SOLO attrs permitidos (sin locale/reason/status/intent)
// Nota: regex multi-línea con [\s\S]*? para capturar objetos { ... } aunque estén en varias líneas
s = s.replace(
  /trackProductEvent\("product\.marketing\.lead\.submit\.attempt"\s*,\s*\{[\s\S]*?\}\s*\);/g,
  'trackProductEvent("product.marketing.lead.submit.attempt", { route: "/landing", interested_count: selected.length });'
);

s = s.replace(
  /trackProductEvent\("product\.marketing\.lead\.submit\.fail"\s*,\s*\{[\s\S]*?\}\s*\);/g,
  'trackProductEvent("product.marketing.lead.submit.fail", { route: "/landing" });'
);

s = s.replace(
  /trackProductEvent\("product\.marketing\.lead\.submit\.success"\s*,\s*\{[\s\S]*?\}\s*\);/g,
  'trackProductEvent("product.marketing.lead.submit.success", { route: "/landing" });'
);

s = s.replace(
  /trackProductEvent\("product\.marketing\.cta\.click"\s*,\s*\{[\s\S]*?\}\s*\);/g,
  'trackProductEvent("product.marketing.cta.click", { route: "/landing" });'
);

if (s !== before) {
  writeUtf8(leadForm, s);
}

console.log("patched LeadForm:", s !== before);
console.log("--- telemetry lines (post) ---");
for (const line of s.split(/\r?\n/)) {
  if (line.includes('trackProductEvent("product.marketing.')) console.log(line.trim());
}

// D) normalizar encoding de migration (si existe)
fixMigrationUtf8NoBom("supabase/migrations/20260102145406_marketing_leads_v2.sql");
console.log("migration normalized (if present)");