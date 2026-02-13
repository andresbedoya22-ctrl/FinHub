import { describe, expect, it } from "vitest";
import {
  buildFinnyContextForPrompt,
  exceedsFinnyRateLimit,
  hashUserMessage,
  isRepeatSpam,
  isWithinQuietHours,
} from "./guardrails";

describe("finny guardrails", () => {
  it("hashes same message deterministically", () => {
    const a = hashUserMessage(" Hola ");
    const b = hashUserMessage("hola");
    expect(a).toBe(b);
  });

  it("detects quiet hours across midnight", () => {
    const settings = {
      tierOverride: null,
      quietHoursEnabled: true,
      quietStartHour: 22,
      quietEndHour: 7,
      timezone: "UTC",
    };
    const at23 = new Date("2026-01-01T23:00:00Z");
    const at12 = new Date("2026-01-01T12:00:00Z");
    expect(isWithinQuietHours(at23, settings)).toBe(true);
    expect(isWithinQuietHours(at12, settings)).toBe(false);
  });

  it("applies tiered rate limits", () => {
    const liteEvents = Array.from({ length: 10 }, () => ({ mode: "faq", blocked_reason: null }));
    const premiumEvents = Array.from({ length: 24 }, () => ({ mode: "llm", blocked_reason: null }));
    expect(exceedsFinnyRateLimit("lite", liteEvents)).toBe(true);
    expect(exceedsFinnyRateLimit("premium", premiumEvents)).toBe(false);
  });

  it("detects repeat spam by message hash", () => {
    const hash = hashUserMessage("same");
    const recent = [{ input_hash: hash }, { input_hash: hash }, { input_hash: hash }];
    expect(isRepeatSpam(hash, recent)).toBe(true);
  });

  it("builds compact context text", () => {
    const text = buildFinnyContextForPrompt({
      latestCaseId: "c1",
      latestCaseType: "taxes",
      latestCaseStatus: "in_progress",
      latestCaseStep: "eligibility",
      latestAuthorizationStatus: "pending",
      caseCountOpen: 2,
      docsUploaded: 4,
      docsValidated: 2,
      docsRejected: 1,
    });
    expect(text).toContain("latest_case_type: taxes");
    expect(text).toContain("docs_uploaded: 4");
  });
});
