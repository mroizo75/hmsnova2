import { defineRouting } from "next-intl/routing";

export const locales = ["nb", "nn", "en"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "nb";

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "never",
  localeDetection: true,
});
