import { assertElementsConnectorEnv, env } from "../../../config/env";
import type { ElementsClientConfig } from "./elementsTypes";

export function assertElementsEnv() {
  assertElementsConnectorEnv();
}

export function getElementsConfigFromEnv(): ElementsClientConfig {
  assertElementsEnv();

  const scope = env.ELEMENTS_SCOPE?.trim();
  return {
    baseUrl: env.ELEMENTS_BASE_URL,
    tokenUrl: env.ELEMENTS_TOKEN_URL,
    clientId: env.ELEMENTS_CLIENT_ID,
    clientSecret: env.ELEMENTS_CLIENT_SECRET,
    scope: scope && scope.length > 0 ? scope : undefined,
  };
}
