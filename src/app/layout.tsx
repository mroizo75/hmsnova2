import type { Metadata, Viewport } from "next";
import { getServerSession } from "next-auth";
import { getLocale, getMessages } from "next-intl/server";
import { authOptions } from "@/lib/auth";
import { Providers } from "./providers";
import { CookieConsent } from "@/components/cookie-consent";
import { AITracker } from "@/components/ai-tracker";
import { Toaster } from "sonner";
import {
  SITE_CONFIG,
  PRIMARY_KEYWORDS,
  ORGANIZATION_SCHEMA,
  ROBOTS_CONFIG,
} from "@/lib/seo-config";
import { LOCAL_BUSINESS_SCHEMA } from "@/lib/seo-schemas";
import { MultipleStructuredData } from "@/components/seo/structured-data";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_CONFIG.url),
  manifest: "/site.webmanifest",
  title: {
    default: `${SITE_CONFIG.name} - ${SITE_CONFIG.tagline}`,
    template: `%s | ${SITE_CONFIG.name}`,
  },
  description: SITE_CONFIG.description,
  keywords: PRIMARY_KEYWORDS.join(", "),
  authors: [{ name: SITE_CONFIG.name }],
  creator: SITE_CONFIG.name,
  publisher: SITE_CONFIG.name,
  robots: ROBOTS_CONFIG,
  alternates: {
    canonical: SITE_CONFIG.url,
    languages: {
      "nb-NO": SITE_CONFIG.url,
      "nn-NO": `${SITE_CONFIG.url}/nn`,
      "en": `${SITE_CONFIG.url}/en`,
    },
  },
  openGraph: {
    type: "website",
    locale: SITE_CONFIG.locale,
    alternateLocale: ["nn_NO", "en_US"],
    url: SITE_CONFIG.url,
    siteName: SITE_CONFIG.name,
    title: `${SITE_CONFIG.name} - ${SITE_CONFIG.tagline}`,
    description: SITE_CONFIG.description,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_CONFIG.name} - ${SITE_CONFIG.tagline}`,
    description: SITE_CONFIG.description,
    creator: "@hmsnova",
  },
  appleWebApp: {
    capable: true,
    title: SITE_CONFIG.name,
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();
  const session = await getServerSession(authOptions);
  const nowISO = new Date().toISOString();

  return (
    <html lang={locale} className="overflow-x-hidden">
      <head>
        <MultipleStructuredData dataArray={[ORGANIZATION_SCHEMA, LOCAL_BUSINESS_SCHEMA]} />
      </head>
      <body className="min-h-dvh overflow-x-hidden">
        <Providers locale={locale} messages={messages} session={session} nowISO={nowISO}>
          <AITracker />
          {children}
          <Toaster position="top-center" richColors />
        </Providers>
        <CookieConsent />
      </body>
    </html>
  );
}
