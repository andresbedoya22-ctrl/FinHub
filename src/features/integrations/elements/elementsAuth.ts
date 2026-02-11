import type { ElementsClientConfig, ElementsOAuthToken, ElementsTokenResponse } from "./elementsTypes";

const SKEW_MS = 10_000;

function normalizeToken(payload: ElementsTokenResponse): ElementsOAuthToken {
  if (!payload.access_token || payload.access_token.trim().length === 0) {
    throw new Error("Elements OAuth error: missing access_token");
  }

  const expiresIn = Number(payload.expires_in ?? 3600);
  const ttlMs = Number.isFinite(expiresIn) && expiresIn >= 0 ? expiresIn * 1000 : 3600_000;

  return {
    accessToken: payload.access_token,
    tokenType: payload.token_type ?? "Bearer",
    scope: payload.scope,
    expiresAtMs: Date.now() + ttlMs,
  };
}

export class ElementsTokenProvider {
  private token: ElementsOAuthToken | null = null;
  private inFlight: Promise<ElementsOAuthToken> | null = null;

  constructor(
    private readonly config: ElementsClientConfig,
    private readonly fetchImpl: typeof fetch = fetch
  ) {}

  async getAccessToken(): Promise<ElementsOAuthToken> {
    if (this.token && this.token.expiresAtMs - SKEW_MS > Date.now()) {
      return this.token;
    }

    if (!this.inFlight) {
      this.inFlight = this.fetchToken().finally(() => {
        this.inFlight = null;
      });
    }

    this.token = await this.inFlight;
    return this.token;
  }

  private async fetchToken(): Promise<ElementsOAuthToken> {
    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
    });

    if (this.config.scope) {
      body.set("scope", this.config.scope);
    }

    const res = await this.fetchImpl(this.config.tokenUrl, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    });

    const data = (await res.json().catch(() => null)) as ElementsTokenResponse | null;
    if (!res.ok || !data) {
      throw new Error(`Elements OAuth error: token request failed (${res.status})`);
    }

    return normalizeToken(data);
  }
}
