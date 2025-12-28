import fs from "node:fs";

const file = process.argv[2];
if (!file) throw new Error("Usage: node tools/patch-finny-audit-in-route.mjs <route.ts>");

let s = fs.readFileSync(file, "utf8");

// idempotente: si ya existen ambos logs, salimos
if (s.includes("AUDIT_CONSOLE: finny_chat_faq (MVP)") && s.includes("AUDIT_CONSOLE: finny_chat_llm (MVP)")) {
  console.log("already patched", file);
  process.exit(0);
}

// -------------------------
// 1) FAQ audit: insertar justo antes del return en `if (faq) { ... }`
// -------------------------
if (!s.includes("AUDIT_CONSOLE: finny_chat_faq (MVP)")) {
  const faqBlock = /if\s*\(\s*faq\s*\)\s*\{[\s\S]*?\n\s*return\s+NextResponse\.json\([\s\S]*?\)\s*;?\s*\n\s*\}/m;
  const fb = s.match(faqBlock);
  if (!fb) throw new Error("No encontré el bloque `if (faq) { ... return NextResponse.json(...) }` para audit FAQ.");

  const faqReturn = /\n(\s*)return\s+NextResponse\.json\([\s\S]*?\)\s*;?/m;
  const mRet = fb[0].match(faqReturn);
  if (!mRet) throw new Error("No encontré el `return NextResponse.json(...)` dentro del bloque FAQ.");

  const indent = mRet[1] ?? "  ";
  const faqAudit = `
${indent}// AUDIT_CONSOLE: finny_chat_faq (MVP)
${indent}try {
${indent}  console.log(
${indent}    JSON.stringify({
${indent}      evt: "finny_chat",
${indent}      user_id: user?.id ?? null,
${indent}      lang: textLang ?? null,
${indent}      mode: "faq",
${indent}      input_len: typeof message === "string" ? message.length : null,
${indent}      output_len: typeof faq?.answerMd === "string" ? faq.answerMd.length : null,
${indent}      ts: new Date().toISOString(),
${indent}    })
${indent}  );
${indent}} catch {
${indent}  // noop
${indent}}
`;

  const patchedFaqBlock = fb[0].replace(faqReturn, (hit) => `\n${faqAudit}\n` + hit.trimEnd());
  s = s.replace(faqBlock, patchedFaqBlock);
}

// -------------------------
// 2) LLM audit: insertar antes del último `return NextResponse.json({ ok: true ... })` que NO sea FAQ
//    y (si existe) inferir el `answer` desde el objeto de retorno.
// -------------------------
if (!s.includes("AUDIT_CONSOLE: finny_chat_llm (MVP)")) {
  const okReturnRe = /(^[ \t]*)return\s+NextResponse\.json\(\{\s*ok:\s*true[\s\S]*?\}\s*(?:,\s*\{[\s\S]*?\})?\s*\)\s*;?/gm;
  const matches = Array.from(s.matchAll(okReturnRe));

  if (matches.length === 0) {
    throw new Error("No encontré ningún `return NextResponse.json({ ok: true ... })` para inyectar audit LLM.");
  }

  // elegir el último ok-return que NO sea FAQ
  let chosen = null;
  for (let i = matches.length - 1; i >= 0; i--) {
    const block = matches[i][0];
    if (!/mode\s*:\s*["']faq["']/.test(block)) {
      chosen = matches[i];
      break;
    }
  }
  if (!chosen) throw new Error("Encontré returns ok=true, pero todos parecen ser FAQ. No pude ubicar el return OK del LLM.");

  const indent = chosen[1] ?? "  ";
  const block = chosen[0];

  // inferir mode (si existe)
  const mm = block.match(/mode\s*:\s*["']([^"']+)["']/);
  const modeExpr = mm ? JSON.stringify(mm[1]) : JSON.stringify("llm");

  // inferir expresión del answer desde el objeto literal de retorno
  let answerExpr = null;

  // caso 1: `answer: <expr>`
  const ma = block.match(/\banswer\s*:\s*([^,\n}]+)/);
  if (ma) answerExpr = ma[1].trim();

  // caso 2: shorthand `answer,`
  if (!answerExpr && /\banswer\s*,/.test(block)) answerExpr = "answer";

  // si no lo encontramos, output_len será null
  const outputLenLine = answerExpr
    ? `${indent}  output_len: typeof (${answerExpr}) === "string" ? (${answerExpr}).length : null,`
    : `${indent}  output_len: null,`;

  const llmAudit = `
${indent}// AUDIT_CONSOLE: finny_chat_llm (MVP)
${indent}try {
${indent}  console.log(
${indent}    JSON.stringify({
${indent}      evt: "finny_chat",
${indent}      user_id: user?.id ?? null,
${indent}      lang: textLang ?? null,
${indent}      mode: ${modeExpr},
${indent}      input_len: typeof message === "string" ? message.length : null,
${outputLenLine}
${indent}      ts: new Date().toISOString(),
${indent}    })
${indent}  );
${indent}} catch {
${indent}  // noop
${indent}}
`;

  // insertar justo antes del return elegido (usamos index)
  const idx = chosen.index;
  s = s.slice(0, idx) + llmAudit + "\n" + s.slice(idx);
}

if (!s.endsWith("\n")) s += "\n";
fs.writeFileSync(file, s, "utf8");
console.log("patched", file);
