import fs from "node:fs";

const file = process.argv[2];
if (!file) throw new Error("Usage: node tools/patch-finny-layout.mjs <layoutPath>");

let s = fs.readFileSync(file, "utf8");

const importLine = 'import FinnyWidget from "@/features/assistant/finny/ui/FinnyWidget";';

if (!s.includes(importLine)) {
  const lines = s.split(/\r?\n/);
  let lastImport = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*import .*;\s*$/.test(lines[i])) lastImport = i;
  }
  if (lastImport >= 0) lines.splice(lastImport + 1, 0, importLine);
  else lines.unshift(importLine);

  s = lines.join("\n");
}

if (!s.includes("<FinnyWidget />")) {
  if (s.includes("{children}")) {
    // preferido: cerca del tree real
    s = s.replace("{children}", "{children}\n        <FinnyWidget />");
  } else if (s.includes("</body>")) {
    s = s.replace("</body>", "        <FinnyWidget />\n      </body>");
  } else {
    throw new Error("No pude inyectar <FinnyWidget /> (no encontré {children} ni </body>).");
  }
}

if (!s.endsWith("\n")) s += "\n";
fs.writeFileSync(file, s, "utf8");
console.log("patched", file);
