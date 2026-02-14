import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const FILES = [
  "src/app/layout.tsx",
  "src/app/(dashboard)/layout.tsx",
  "src/app/(dashboard)/app/layout.tsx",
  "src/app/(dashboard)/ui/DashboardShell.tsx",
  "src/ui/components/LanguageSwitcher.tsx",
];

const FORBIDDEN = ["Date.now(", "Math.random(", "navigator."];

describe("layout/provider determinism guard", () => {
  it("keeps root layouts/providers free from non-deterministic runtime globals", () => {
    const offenders: Array<{ file: string; token: string }> = [];

    for (const rel of FILES) {
      const file = join(process.cwd(), rel);
      const source = readFileSync(file, "utf8");
      for (const token of FORBIDDEN) {
        if (source.includes(token)) offenders.push({ file: rel, token });
      }
    }

    expect(offenders).toEqual([]);
  });
});
