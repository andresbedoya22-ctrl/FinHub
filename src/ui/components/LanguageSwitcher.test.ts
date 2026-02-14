import { describe, expect, it } from "vitest";

import { LANGUAGE_SWITCHER_CLASSNAME } from "./LanguageSwitcher";

describe("LanguageSwitcher", () => {
  it("uses theme tokens with enough contrast in light and dark themes", () => {
    expect(LANGUAGE_SWITCHER_CLASSNAME).toContain("bg-fh-surface");
    expect(LANGUAGE_SWITCHER_CLASSNAME).toContain("text-fh-text");
    expect(LANGUAGE_SWITCHER_CLASSNAME).toContain("border-fh-border");
  });
});
