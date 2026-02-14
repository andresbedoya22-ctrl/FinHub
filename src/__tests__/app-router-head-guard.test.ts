import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const APP_DIR = join(process.cwd(), "src", "app");

function listFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...listFiles(full));
    else if (full.endsWith(".ts") || full.endsWith(".tsx")) out.push(full);
  }
  return out;
}

describe("app-router head guard", () => {
  it("does not allow next/head under src/app", () => {
    const files = listFiles(APP_DIR);
    const offenders = files.filter((file) => readFileSync(file, "utf8").includes('from "next/head"'));
    expect(offenders).toEqual([]);
  });
});
