import type { Metadata } from "next";
import "@/styles/globals.css";
import { getI18nRequestContext } from "@/i18n/request";
import { I18nProvider } from "@/i18n/I18nProvider";

export const metadata: Metadata = {
  title: "FinHub",
  description: "FinHub — financial platform for migrants in NL",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale, messages } = await getI18nRequestContext();

  return (
    <html lang={locale}>
      <body>
        <I18nProvider locale={locale} messages={messages}>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
