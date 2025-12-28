import fs from "node:fs";

const file = process.argv[2];
if (!file) throw new Error("Usage: node tools/patch-finny-audit-console.mjs <route.ts>");

let s = fs.readFileSync(file, "utf8");

// idempotente
if (s.includes("AUDIT_CONSOLE: finny_chat (MVP)")) {
  console.log("already patched", file);
  process.exit(0);
}

// 1) Inyecta audit antes del return de FAQ
const faqReturn = /return\s+NextResponse\.json\(\{\s*ok:\s*true(?:\s+as\s+const)?\s*,\s*mode:\s*["']faq["'][\s\S]*?\}\s*\)\s*;?/m;
const f = s.match(faqReturn);
if (!f) throw new Error("No encontré el return OK de FAQ para inyectar audit.");

const auditFaq = `
    // AUDIT_CONSOLE: finny_chat (MVP)
    try {
      console.log(
        JSON.stringify({
          evt: "finny_chat",
          user_id: user?.id ?? null,
          lang: textLang ?? null,
          mode: "faq",
          input_len: typeof message === "string" ? message.length : null,
          output_len: typeof faq?.answerMd === "string" ? faq.answerMd.length : null,
          ts: new Date().toISOString(),
        })
      );
    } catch {
      // noop
    }

`;

s = s.replace(faqReturn, (hit) => auditFaq + hit);

// 2) Inyecta audit antes del return OK de LLM (cuando responde answer)
const llmReturn = /return\s+NextResponse\.json\(\{\s*ok:\s*true(?:\s+as\s+const)?\s*,[\s\S]*?\banswer:\s*answer[\s\S]*?\}\s*\)\s*;?/m;
const l = s.match(llmReturn);
if (!l) throw new Error("No encontré el return OK de LLM para inyectar audit.");

const auditLlm = `
    // AUDIT_CONSOLE: finny_chat (MVP)
    try {
      console.log(
        JSON.stringify({
          evt: "finny_chat",
          user_id: user?.id ?? null,
          lang: textLang ?? null,
          mode: "llm",
          input_len: typeof message === "string" ? message.length : null,
          output_len: typeof answer === "string" ? answer.length : null,
          ts: new Date().toISOString(),
        })
      );
    } catch {
      // noop
    }

`;

s = s.replace(llmReturn, (hit) => auditLlm + hit);

if (!s.endsWith("\n")) s += "\n";
fs.writeFileSync(file, s, "utf8");
console.log("patched", file);
