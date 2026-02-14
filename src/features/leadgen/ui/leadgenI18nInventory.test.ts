import { describe, expect, it } from "vitest";

import en from "@/i18n/messages/en.json";
import es from "@/i18n/messages/es.json";
import pl from "@/i18n/messages/pl.json";
import ro from "@/i18n/messages/ro.json";

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function flattenKeys(node: unknown, prefix = ""): string[] {
  if (!isObject(node)) return [];
  const out: string[] = [];
  for (const [k, v] of Object.entries(node)) {
    const next = prefix ? `${prefix}.${k}` : k;
    if (isObject(v)) out.push(...flattenKeys(v, next));
    else out.push(next);
  }
  return out.sort();
}

function pickLeadgen(msg: Record<string, unknown>): string[] {
  return flattenKeys(msg.leadgen, "leadgen");
}

describe("leadgen i18n inventory", () => {
  it("keeps identical leadgen keys across locales", () => {
    const base = pickLeadgen(en as Record<string, unknown>);
    const locales: Array<[string, string[]]> = [
      ["es", pickLeadgen(es as Record<string, unknown>)],
      ["pl", pickLeadgen(pl as Record<string, unknown>)],
      ["ro", pickLeadgen(ro as Record<string, unknown>)],
    ];

    for (const [locale, keys] of locales) {
      expect(keys, `${locale} leadgen keys mismatch`).toEqual(base);
    }
  });
});
