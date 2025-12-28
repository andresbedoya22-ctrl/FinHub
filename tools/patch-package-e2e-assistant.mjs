import fs from "node:fs";

const p = "package.json";
const pkg = JSON.parse(fs.readFileSync(p, "utf8"));

pkg.scripts ||= {};
if (!pkg.scripts["e2e:assistant"]) {
  pkg.scripts["e2e:assistant"] =
    "powershell -NoProfile -ExecutionPolicy Bypass -File scripts/e2e/run-assistant-chat-v1.ps1";
  fs.writeFileSync(p, JSON.stringify(pkg, null, 2) + "\n", "utf8");
  console.log("patched package.json (added e2e:assistant)");
} else {
  console.log("package.json already has e2e:assistant");
}
