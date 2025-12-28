import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const files = execSync("git ls-files", { stdio: ["ignore", "pipe", "ignore"] })
  .toString("utf8")
  .trim()
  .split(/\r?\n/)
  .filter(Boolean);

const exts = new Set([
  ".ts",".tsx",".js",".jsx",".mjs",".cjs",".ps1",".md",".json",".sql",".yml",".yaml",".txt"
]);

const reps = [
  ["revisiÃ³n","revisión"],
  ["invÃ¡lido","inválido"],
  ["invÃ¡lidos","inválidos"],
  ["extracciÃ³n","extracción"],
  ["todavÃ­a","todavía"],
  ["vÃ¡lido","válido"],
  ["vÃ¡lidos","válidos"],
  ["dÃ­gitos","dígitos"],
  ["sesiÃ³n","sesión"],
  ["encontrÃ©","encontré"],
  ["No encontrÃ©","No encontré"],
  ["â€”","—"],
  ["â€“","–"]
];

// Nota: NO intentamos corregir 'â€' genérico para evitar falsos positivos.
// Si quedara algo, lo atacamos específicamente tras el grep.

let changed = 0;

for (const f of files) {
  const ext = path.extname(f);
  if (!exts.has(ext)) continue;

  const s = fs.readFileSync(f, "utf8");
  let t = s;
  for (const [a, b] of reps) t = t.split(a).join(b);

  if (t !== s) {
    fs.writeFileSync(f, t, "utf8");
    console.log("fixed:", f);
    changed++;
  }
}

console.log("changed files:", changed);
