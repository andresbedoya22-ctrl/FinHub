// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
function __finhubRedactHeaders(headers: unknown): unknown {
  if (!headers || typeof headers !== "object") return headers;
  const h = { ...(headers as Record<string, unknown>) };

  for (const key of Object.keys(h)) {
    const k = key.toLowerCase();
    if (k === "authorization" || k === "cookie" || k === "set-cookie" || k === "x-api-key") {
      delete h[key];
    }
  }
  return h;
}

function __finhubSanitizeEvent<T>(event: T): T {
  const e = event as unknown as Record<string, unknown>;

  // Request: keep only safe metadata
  const reqUnknown = e["request"];
  if (reqUnknown && typeof reqUnknown === "object") {
    const req = reqUnknown as Record<string, unknown>;

    // headers
    if (req["headers"] && typeof req["headers"] === "object") {
      req["headers"] = __finhubRedactHeaders(req["headers"]);
    }

    // never keep cookies or body/data
    delete req["cookies"];
    delete req["data"];

    // query string can contain tokens
    delete req["query_string"];

    e["request"] = req;
  }

  // Breadcrumbs: drop potentially sensitive payloads
  const breadcrumbsUnknown = e["breadcrumbs"];
  if (Array.isArray(breadcrumbsUnknown)) {
    e["breadcrumbs"] = breadcrumbsUnknown.map((b: unknown) => {
      if (!b || typeof b !== "object") return b;
      const bc = b as Record<string, unknown>;
      const category = typeof bc["category"] === "string" ? bc["category"] : "";

      if (category === "fetch" || category === "xhr") {
        const dataUnknown = bc["data"];
        if (dataUnknown && typeof dataUnknown === "object") {
          const d = { ...(dataUnknown as Record<string, unknown>) };
          delete d["body"];
          delete d["data"];
          delete d["headers"];
          bc["data"] = d;
        }
      }
      return bc;
    });
  }

  return event;
}

Sentry.init({
beforeSend(event) { return __finhubSanitizeEvent(event); },
beforeSendTransaction(event) { return __finhubSanitizeEvent(event); },
dsn: "https://be1b06f87b357b98977a4622906db560@o4510625435156480.ingest.de.sentry.io/4510625435615312",

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? 0.1),

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Enable sending user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: process.env.SENTRY_SEND_DEFAULT_PII === "true",
});








