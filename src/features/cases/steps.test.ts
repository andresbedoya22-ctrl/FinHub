"use strict";

import { describe, expect, it } from "vitest";
import { isLockedStepKey } from "./steps";

describe("isLockedStepKey", () => {
  it("returns true for locked steps", () => {
    expect(isLockedStepKey("authorization")).toBe(true);
    expect(isLockedStepKey("documents")).toBe(true);
    expect(isLockedStepKey("review")).toBe(true);
    expect(isLockedStepKey("submitted")).toBe(true);
    expect(isLockedStepKey("done")).toBe(true);
  });

  it("returns false for unlocked steps", () => {
    expect(isLockedStepKey("intake")).toBe(false);
    expect(isLockedStepKey("eligibility")).toBe(false);
    expect(isLockedStepKey("result")).toBe(false);
    expect(isLockedStepKey("checkout")).toBe(false);
  });
});
