import { describe, expect, it, vi } from "vitest";
import { createElementsClient } from "./elementsClient";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("Elements connector", () => {
  it("refreshes token when expired", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ access_token: "token-1", expires_in: 0, token_type: "Bearer" }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }, 200))
      .mockResolvedValueOnce(jsonResponse({ access_token: "token-2", expires_in: 3600, token_type: "Bearer" }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }, 200));

    const client = createElementsClient(
      {
        baseUrl: "https://elements.example.com",
        tokenUrl: "https://elements.example.com/oauth/token",
        clientId: "id",
        clientSecret: "secret",
      },
      fetchMock
    );

    await client.request({ path: "/cases", method: "GET" });
    await client.request({ path: "/cases", method: "GET" });

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock.mock.calls[0]?.[0]).toContain("/oauth/token");
    expect(fetchMock.mock.calls[2]?.[0]).toContain("/oauth/token");
  });

  it("retries transient 5xx failures with same idempotency key", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ access_token: "token-1", expires_in: 3600, token_type: "Bearer" }))
      .mockResolvedValueOnce(jsonResponse({ message: "temporary" }, 503))
      .mockResolvedValueOnce(jsonResponse({ ok: true }, 200));

    const client = createElementsClient(
      {
        baseUrl: "https://elements.example.com",
        tokenUrl: "https://elements.example.com/oauth/token",
        clientId: "id",
        clientSecret: "secret",
      },
      fetchMock
    );

    await client.request({
      path: "/dossiers",
      method: "POST",
      idempotencyKey: "case-123",
      body: { foo: "bar" },
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);

    const firstRequestHeaders = fetchMock.mock.calls[1]?.[1]?.headers as Record<string, string>;
    const secondRequestHeaders = fetchMock.mock.calls[2]?.[1]?.headers as Record<string, string>;
    expect(firstRequestHeaders["idempotency-key"]).toBe("case-123");
    expect(secondRequestHeaders["idempotency-key"]).toBe("case-123");
  });

  it("does not leak bearer token in thrown errors", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ access_token: "sensitive-token", expires_in: 3600, token_type: "Bearer" }))
      .mockResolvedValueOnce(jsonResponse({ message: "boom" }, 400));

    const client = createElementsClient(
      {
        baseUrl: "https://elements.example.com",
        tokenUrl: "https://elements.example.com/oauth/token",
        clientId: "id",
        clientSecret: "secret",
      },
      fetchMock
    );

    try {
      await client.request({
        path: "/dossiers",
        method: "POST",
        body: { hello: "world" },
      });
      throw new Error("Expected request to fail");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      expect(message).toMatch(/elements request failed/i);
      expect(message).not.toContain("sensitive-token");
    }
  });
});
