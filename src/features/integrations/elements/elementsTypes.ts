export type ElementsOAuthToken = {
  accessToken: string;
  tokenType: string;
  expiresAtMs: number;
  scope?: string;
};

export type ElementsTokenResponse = {
  access_token: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
};

export type ElementsHttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type ElementsHttpRequest = {
  path: string;
  method?: ElementsHttpMethod;
  body?: unknown;
  headers?: Record<string, string>;
  idempotencyKey?: string;
  signal?: AbortSignal;
};

export type ElementsHttpOptions = {
  retries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  timeoutMs: number;
};

export type ElementsHttpResponse<T> = {
  status: number;
  data: T;
  headers: Headers;
};

export type ElementsClientConfig = {
  baseUrl: string;
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
  scope?: string;
};
