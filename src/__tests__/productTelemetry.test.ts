import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@sentry/nextjs", () => ({
  captureEvent: vi.fn(),
}));

import * as Sentry from "@sentry/nextjs";

describe("productTelemetry", () => {
  const prevEnabled = process.env.SENTRY_PRODUCT_TELEMETRY_ENABLED;
  const prevRate = process.env.SENTRY_PRODUCT_TELEMETRY_SAMPLE_RATE;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SENTRY_PRODUCT_TELEMETRY_ENABLED = "true";
    process.env.SENTRY_PRODUCT_TELEMETRY_SAMPLE_RATE = "1";
  });

  afterEach(() => {
    if (prevEnabled === undefined) delete process.env.SENTRY_PRODUCT_TELEMETRY_ENABLED;
    else process.env.SENTRY_PRODUCT_TELEMETRY_ENABLED = prevEnabled;

    if (prevRate === undefined) delete process.env.SENTRY_PRODUCT_TELEMETRY_SAMPLE_RATE;
    else process.env.SENTRY_PRODUCT_TELEMETRY_SAMPLE_RATE = prevRate;
  });

  it("does not include blocked keys or likely PII values", async () => {
    const mod = await import("../features/observability/productTelemetry");
    const { trackProductEvent } = mod;

    trackProductEvent("auth.login.fail", {
      route: "/login",
      reason: "invalid_credentials",
      // blocked keys
      email: "test@example.com",
      token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.abc.def",
    });

    const captureEvent = vi.mocked(Sentry.captureEvent);
    expect(captureEvent).toHaveBeenCalledTimes(1);

    const evtUnknown = captureEvent.mock.calls[0]?.[0];
    expect(typeof evtUnknown).toBe("object");
    expect(evtUnknown).not.toBeNull();

    const evt = evtUnknown as Record<string, unknown>;
    expect(evt["message"]).toBe("product:auth.login.fail");

    const extraUnknown = evt["extra"];
    expect(typeof extraUnknown).toBe("object");
    expect(extraUnknown).not.toBeNull();

    const extra = extraUnknown as Record<string, unknown>;
    expect(extra["email"]).toBeUndefined();
    expect(extra["token"]).toBeUndefined();
    expect(extra["route"]).toBe("/login");
    expect(extra["reason"]).toBe("invalid_credentials");
  });
});
