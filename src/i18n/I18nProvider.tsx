"use client";

import * as React from "react";
import {NextIntlClientProvider} from "next-intl";
import type {Locale} from "@/i18n/request";

type Messages = Record<string, unknown>;

export function I18nProvider(props: {
  children: React.ReactNode;
  locale: Locale | string;
  messages: Messages;
  timeZone?: string;
}) {
  const {children, locale, messages, timeZone} = props;
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages}
      timeZone={timeZone ?? "Europe/Amsterdam"}
    >
      {children}
    </NextIntlClientProvider>
  );
}
