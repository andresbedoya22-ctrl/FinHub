import fs from "node:fs";

const file = process.argv[2];
if (!file) throw new Error("Usage: node tools/patch-finny-audit-in-route.mjs <route.ts>");

let s = fs.readFileSync(file, "utf8");

// idempotente
if (s.includes("AUDIT_CONSOLE: finny_chat_faq (MVP)") && s.includes("AUDIT_CONSOLE: finny_chat_llm (MVP)")) {
  console.log("already patched", file);
  process.exit(0);
}

// 1) FAQ audit: insertar justo antes del return dentro del bloque faq
const faqBlock = /if\s*\(\s*faq\s*\)\s*\{\s*[\s\S]*?return\s+NextResponse\.json\([\s\S]*?\)\s*;?\s*\}/m;
const fb = s.match(faqBlock);
if (!fb) throw new Error("No encontré el bloque `if (faq) { ... return NextResponse.json(...) }`.");

const faqReturn = /return\s+NextResponse\.json\([\s\S]*?\)\s*;?/m;
const faqAudit = `
    // AUDIT_CONSOLE: finny_chat_faq (MVP)
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

const patchedFaqBlock = fb[0].replace(faqReturn, (hit) => faqAudit + hit);
s = s.replace(faqBlock, patchedFaqBlock);

// 2) LLM audit: insertar después de `const answer = ...;`
const answerLine = /const\s+answer\s*=\s*[\s\S]*?;\s*\r?\n/m;
const al = s.match(answerLine);
if (!al) throw new Error("No encontré `const answer = ...;` para inyectar audit LLM.");

if (!s.includes("AUDIT_CONSOLE: finny_chat_llm (MVP)")) {
  const llmAudit = `
    // AUDIT_CONSOLE: finny_chat_llm (MVP)
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
  s = s.replace(answerLine, (hit) => hit + llmAudit);
}

if (!s.endsWith("\n")) s += "\n";
fs.writeFileSync(file, s, "utf8");
console.log("patched", file);
