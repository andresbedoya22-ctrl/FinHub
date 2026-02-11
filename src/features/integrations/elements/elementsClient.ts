import { ElementsTokenProvider } from "./elementsAuth";
import { getElementsConfigFromEnv } from "./elementsEnv";
import { createElementsHttpClient } from "./elementsHttp";
import type { ElementsClientConfig, ElementsHttpRequest, ElementsHttpResponse } from "./elementsTypes";

export type ElementsClient = {
  request: <T>(input: ElementsHttpRequest) => Promise<ElementsHttpResponse<T>>;
};

export function createElementsClient(config: ElementsClientConfig, fetchImpl: typeof fetch = fetch): ElementsClient {
  const tokenProvider = new ElementsTokenProvider(config, fetchImpl);
  const request = createElementsHttpClient({
    baseUrl: config.baseUrl,
    tokenProvider,
    fetchImpl,
  });

  return { request };
}

export function createElementsClientFromEnv(fetchImpl: typeof fetch = fetch): ElementsClient {
  const config = getElementsConfigFromEnv();
  return createElementsClient(config, fetchImpl);
}
