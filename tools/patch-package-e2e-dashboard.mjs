import fs from "node:fs";

const p = "package.json";
const raw = fs.readFileSync(p, "utf8");
const pkg = JSON.parse(raw);

pkg.scripts ||= {};
if (!pkg.scripts["e2e:dashboard"]) {
  pkg.scripts["e2e:dashboard"] =
    "powershell -NoProfile -ExecutionPolicy Bypass -File scripts/e2e/run-dashboard-smoke-v1.ps1";
}

fs.writeFileSync(p, JSON.stringify(pkg, null, 2) + "\n", "utf8");
console.log("patched", p);
