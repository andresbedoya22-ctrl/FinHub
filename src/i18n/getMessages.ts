import { type SupportedLocale } from "./config";

export type Messages = Record<string, unknown>;

export async function getMessages(locale: SupportedLocale): Promise<Messages> {
  // JSON imports (server-safe). Mantener explícito para evitar bundling dinámico raro.
  switch (locale) {
    case "en":
      return (await import("./messages/en.json")).default as Messages;
    case "es":
      return (await import("./messages/es.json")).default as Messages;
    case "pl":
      return (await import("./messages/pl.json")).default as Messages;
    case "ro":
      return (await import("./messages/ro.json")).default as Messages;
    default: {
      // Exhaustiveness guard (por si cambian locales en config)
      const _never: never = locale;
      return _never;
    }
  }
}
