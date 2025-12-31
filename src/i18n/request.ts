import { getLocale } from "./getLocale";
import { getMessages } from "./getMessages";

export async function getI18nRequestContext() {
  const locale = await getLocale();
  const messages = await getMessages(locale);
  return { locale, messages };
}
