import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { defaultLocale, locales, type Locale } from "./routing";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { cookies } from "next/headers";

type MessageObject = Record<string, unknown>;

const isMessageObject = (value: unknown): value is MessageObject => {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
};

const mergeMessages = (baseMessages: MessageObject, localeMessages: MessageObject): MessageObject => {
  const result: MessageObject = { ...baseMessages };

  for (const key of Object.keys(localeMessages)) {
    const baseValue = result[key];
    const localeValue = localeMessages[key];

    if (isMessageObject(baseValue) && isMessageObject(localeValue)) {
      result[key] = mergeMessages(baseValue, localeValue);
      continue;
    }

    result[key] = localeValue;
  }

  return result;
};

export default getRequestConfig(async ({ requestLocale }) => {
  const session = await getServerSession(authOptions);
  const requestedLocale = await requestLocale;
  const sessionLocale = session?.user?.preferredLocale;
  const cookieLocale = (await cookies()).get("NEXT_LOCALE")?.value;
  const locale: Locale = hasLocale(locales, requestedLocale)
    ? requestedLocale
    : hasLocale(locales, cookieLocale)
      ? cookieLocale
      : hasLocale(locales, sessionLocale)
      ? sessionLocale
      : defaultLocale;

  const defaultMessages = (await import(`./messages/${defaultLocale}.json`)).default as MessageObject;
  const localizedMessages = (await import(`./messages/${locale}.json`)).default as MessageObject;
  const messages = locale === defaultLocale
    ? defaultMessages
    : mergeMessages(defaultMessages, localizedMessages);

  return {
    locale,
    messages,
    timeZone: "Europe/Oslo",
    now: new Date(),
  };
});

export type { Locale };
