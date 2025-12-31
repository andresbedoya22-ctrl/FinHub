"use client";

import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import type { SupportedLocale } from "./config";
import type { Messages } from "./getMessages";

export function I18nProvider({
  locale,
  messages,
  children,
}: {
  locale: SupportedLocale;
  messages: Messages;
  children: ReactNode;
}) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
