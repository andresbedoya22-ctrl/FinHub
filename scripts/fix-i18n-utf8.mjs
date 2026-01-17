import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const messagesDir = path.join(root, "src", "i18n", "messages");
const files = fs.readdirSync(messagesDir).filter((file) => file.endsWith(".json"));
const checkOnly = process.argv.includes("--check");

const forbidden = [
  "\u00c3",
  "\u00c5",
  "\u00c4",
  "\u00d2",
  "\u00c7",
  "\u017d",
  "\u00a6",
  "\u00ac",
  "\u00bc",
  "\u00bd",
  "\uFFFD",
  "Przegl?d"
];
const explicitReplacements = [
  ["Przegl?d", "Przegląd"],
  ["ЗЅѓ'Єѓ??", "—"],
  ["Ã¢â‚¬Â¦", "…"],
  ["â", "—"],
  ["â", "–"],
  ["â", "’"],
  ["â", "“"],
  ["â", "”"],
  ["Ò¡", "á"],
  ["Ò©", "é"],
  ["Ò­", "í"],
  ["Ò³", "ó"],
  ["Òº", "ú"],
  ["Ò±", "ñ"],
  ["Ò¿", "¿"],
  ["Ž", "Î"],
];

const mojibakeMarkers = /[ÃÂÅÄâ]/;

function fixMojibake(value) {
  let result = value;
  for (const [from, to] of explicitReplacements) {
    result = result.split(from).join(to);
  }

  for (let i = 0; i < 2; i += 1) {
    if (!mojibakeMarkers.test(result)) break;
    const decoded = Buffer.from(result, "latin1").toString("utf8");
    if (decoded === result) break;
    result = decoded;
  }

  let cleaned = "";
  for (const ch of result) {
    const code = ch.charCodeAt(0);
    if (code >= 32 && ch !== "\uFFFD") {
      cleaned += ch;
    }
  }
  return cleaned;
}

function walk(node) {
  if (typeof node === "string") return fixMojibake(node);
  if (Array.isArray(node)) return node.map((item) => walk(item));
  if (node && typeof node === "object") {
    const output = {};
    for (const [key, value] of Object.entries(node)) {
      output[key] = walk(value);
    }
    return output;
  }
  return node;
}

let hasFailures = false;

for (const file of files) {
  const filePath = path.join(messagesDir, file);
  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = JSON.parse(raw);
  const fixed = walk(parsed);
  const serialized = `${JSON.stringify(fixed, null, 2)}\n`;

  if (!checkOnly && serialized !== raw) {
    fs.writeFileSync(filePath, serialized, "utf8");
  }

  const contentToCheck = checkOnly ? raw : serialized;
  const hits = forbidden.filter((token) => contentToCheck.includes(token));
  if (hits.length) {
    hasFailures = true;
    console.error(`${file}: forbidden sequences found: ${hits.join(", ")}`);
  }
}

if (hasFailures) {
  process.exit(1);
}


