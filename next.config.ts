import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  // Unngå statisk optimalisering av dynamiske sider
  staticPageGenerationTimeout: 0,
  // Ikke generer statiske sider automatisk
  output: 'standalone',
};

export default withNextIntl(nextConfig);
