import { ElementsTokenProvider } from "./elementsAuth";
import type { ElementsHttpOptions, ElementsHttpRequest, ElementsHttpResponse } from "./elementsTypes";

const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);
const DEFAULT_OPTIONS: ElementsHttpOptions = {
  retries: 2,
  baseDelayMs: 250,
  maxDelayMs: 2_000,
  timeoutMs: 10_000,
};

type InternalOptions = {
  baseUrl: string;
  tokenProvider: ElementsTokenProvider;
  fetchImpl?: typeof fetch;
  retryOptions?: Partial<ElementsHttpOptions>;
};

function mergeOptions(options?: Partial<ElementsHttpOptions>): ElementsHttpOptions {
  return {
    retries: options?.retries ?? DEFAULT_OPTIONS.retries,
    baseDelayMs: options?.baseDelayMs ?? DEFAULT_OPTIONS.baseDelayMs,
    maxDelayMs: options?.maxDelayMs ?? DEFAULT_OPTIONS.maxDelayMs,
    timeoutMs: options?.timeoutMs ?? DEFAULT_OPTIONS.timeoutMs,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableStatus(status: number): boolean {
  return RETRYABLE_STATUS.has(status);
}

function isRetryableError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return message.includes("network") || message.includes("timeout") || message.includes("fetch");
}

function makeTimeoutSignal(timeoutMs: number, externalSignal?: AbortSignal): AbortSignal {
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort(new Error(`Elements request timeout after ${timeoutMs}ms`));
  }, timeoutMs);

  externalSignal?.addEventListener(
    "abort",
    () => {
      clearTimeout(timeout);
      controller.abort(externalSignal.reason);
    },
    { once: true }
  );

  controller.signal.addEventListener(
    "abort",
    () => {
      clearTimeout(timeout);
    },
    { once: true }
  );

  return controller.signal;
}

function computeDelay(attempt: number, opts: ElementsHttpOptions): number {
  const base = opts.baseDelayMs * 2 ** attempt;
  return Math.min(base, opts.maxDelayMs);
}

export function createElementsHttpClient({
  baseUrl,
  tokenProvider,
  fetchImpl = fetch,
  retryOptions,
}: InternalOptions) {
  const options = mergeOptions(retryOptions);

  return async function request<T>(input: ElementsHttpRequest): Promise<ElementsHttpResponse<T>> {
    const method = input.method ?? "GET";
    const url = new URL(input.path, baseUrl).toString();

    for (let attempt = 0; attempt <= options.retries; attempt += 1) {
      try {
        const token = await tokenProvider.getAccessToken();
        const signal = makeTimeoutSignal(options.timeoutMs, input.signal);

        const headers: Record<string, string> = {
          authorization: `${token.tokenType} ${token.accessToken}`,
          accept: "application/json",
          ...input.headers,
        };

        let body: string | undefined;
        if (input.body !== undefined) {
          headers["content-type"] = headers["content-type"] ?? "application/json";
          body = JSON.stringify(input.body);
        }

        if (input.idempotencyKey) {
          headers["idempotency-key"] = input.idempotencyKey;
        }

        const response = await fetchImpl(url, {
          method,
          headers,
          body,
          signal,
        });

        const payload = (await response.json().catch(() => null)) as T | null;

        if (response.ok) {
          return {
            status: response.status,
            data: (payload ?? ({} as T)) as T,
            headers: response.headers,
          };
        }

        if (attempt < options.retries && isRetryableStatus(response.status)) {
          await sleep(computeDelay(attempt, options));
          continue;
        }

        throw new Error(`Elements API error (${response.status}) for ${method} ${input.path}`);
      } catch (error) {
        if (attempt < options.retries && isRetryableError(error)) {
          await sleep(computeDelay(attempt, options));
          continue;
        }

        if (error instanceof Error) {
          throw new Error(`Elements request failed for ${method} ${input.path}: ${error.message}`);
        }

        throw new Error(`Elements request failed for ${method} ${input.path}`);
      }
    }

    throw new Error(`Elements request exhausted retries for ${method} ${input.path}`);
  };
}
