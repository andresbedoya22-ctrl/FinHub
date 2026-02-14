import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

function exists(relPath: string): boolean {
  return fs.existsSync(path.join(process.cwd(), relPath));
}

describe("app dashboard route ownership", () => {
  it("keeps canonical owners for /app/finances and /app/mortgage", () => {
    expect(exists("src/app/(dashboard)/app/finances/page.tsx")).toBe(true);
    expect(exists("src/app/(dashboard)/app/mortgage/page.tsx")).toBe(true);
  });

  it("does not create ambiguous duplicate owners under src/app/app", () => {
    expect(exists("src/app/app/finances/page.tsx")).toBe(false);
    expect(exists("src/app/app/mortgage/page.tsx")).toBe(false);
  });
});
