import { getRequestConfig } from "next-intl/server";

export const locales = ["nb", "nn", "en"] as const;
export type Locale = (typeof locales)[number];

export default getRequestConfig(async ({ locale }) => {
  // Valider locale, men ikke kast feil i root layout
  const validLocale: Locale = locales.includes(locale as Locale) ? (locale as Locale) : "nb";

  return {
    locale: validLocale as string,
    messages: (await import(`./messages/${validLocale}.json`)).default,
    timeZone: "Europe/Oslo",
    now: new Date(),
  };
});
