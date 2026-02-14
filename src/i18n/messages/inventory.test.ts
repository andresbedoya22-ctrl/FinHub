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

describe("global i18n inventory", () => {
  it("keeps identical message keys across all locales", () => {
    const base = flattenKeys(en);
    expect(flattenKeys(es), "es key mismatch").toEqual(base);
    expect(flattenKeys(pl), "pl key mismatch").toEqual(base);
    expect(flattenKeys(ro), "ro key mismatch").toEqual(base);
  });
});
