import { describe, expect, it } from "vitest";
import { assertValidActiveringscode, isValidActiveringscode, normalizeActiveringscode } from "./activeringscode";

describe("activeringscode validation", () => {
  it("normalizes whitespace and hyphens", () => {
    expect(normalizeActiveringscode(" ab-12 34 ")).toBe("AB1234");
  });

  it("accepts robust alphanumeric formats", () => {
    expect(isValidActiveringscode("AB1234")).toBe(true);
    expect(isValidActiveringscode("A1B2C3D4E5")).toBe(true);
  });

  it("rejects invalid formats", () => {
    expect(isValidActiveringscode("ab!234")).toBe(false);
    expect(isValidActiveringscode("123")).toBe(false);
  });

  it("throws on invalid values and returns normalized code on valid ones", () => {
    expect(() => assertValidActiveringscode("x-1")).toThrow(/invalid activeringscode/i);
    expect(assertValidActiveringscode(" ab-1234 ")).toBe("AB1234");
  });
});

