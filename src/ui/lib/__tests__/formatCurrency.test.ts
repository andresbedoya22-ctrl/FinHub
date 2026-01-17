import { describe, expect, it } from "vitest";
import { formatCurrencyEUR } from "../formatCurrency";

describe("formatCurrencyEUR", () => {
  const cents = 6900;
  const nbsp = "\u00A0";
  const euro = "\u20AC";

  it("formats en locale", () => {
    expect(formatCurrencyEUR({ cents, locale: "en" })).toBe(`${euro}69`);
  });

  it("formats es locale", () => {
    expect(formatCurrencyEUR({ cents, locale: "es" })).toBe(`69${nbsp}${euro}`);
  });

  it("formats pl locale", () => {
    expect(formatCurrencyEUR({ cents, locale: "pl" })).toBe(`69${nbsp}${euro}`);
  });

  it("formats ro locale", () => {
    expect(formatCurrencyEUR({ cents, locale: "ro" })).toBe(`69${nbsp}EUR`);
  });

  it("falls back to en for unsupported locale", () => {
    expect(formatCurrencyEUR({ cents, locale: "fr" })).toBe(`${euro}69`);
  });
});
