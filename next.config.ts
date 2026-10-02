import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Cloudflare R2 presigned URLs
      {
        protocol: "https",
        hostname: "*.r2.cloudflarestorage.com",
      },
      // Valgfritt: eget R2-domene om satt opp
      ...(process.env.NEXT_PUBLIC_R2_PUBLIC_URL
        ? [{ protocol: "https" as const, hostname: new URL(process.env.NEXT_PUBLIC_R2_PUBLIC_URL).hostname }]
        : []),
    ],
  },
  // jsPDF → fflate bruker dynamisk Worker-sti; Turbopack klarer ikke å bundle det. Last fra node_modules på serveren.
  serverExternalPackages: [
    "@adobe/pdfservices-node-sdk",
    "fflate",
    "jspdf",
    "jspdf-autotable",
    "log4js",
  ],
  async redirects() {
    return [
      { source: "/gratis-hms-system", destination: "/registrer-bedrift", permanent: true },
      { source: "/gratis-hms-system/:path*", destination: "/registrer-bedrift", permanent: true },
      { source: "/komplett-pakke", destination: "/bedriftshelsetjeneste", permanent: true },
      {
        source: "/digital-hms-tavle-hotell",
        destination: "/digital-hms-tavle#gjesteservice",
        permanent: true,
      },
      { source: "/beste-hms-system-bygg", destination: "/bransjer/bygg-og-anlegg", permanent: true },
      { source: "/beste-hms-system-helse", destination: "/bransjer/helse-og-omsorg", permanent: true },
      { source: "/beste-hms-system-transport", destination: "/bransjer/transport-og-logistikk", permanent: true },
      { source: "/beste-hms-system-kontor", destination: "/bransjer/teknologi-og-it", permanent: true },
    ];
  },
  outputFileTracingExcludes: {
    "/*": ["**/node_modules/@swc/**", "**/storage/**"],
  },
  experimental: {
    staleTimes: {
      dynamic: 0,
      static: 180,
    },
    serverActions: {
      bodySizeLimit: "50mb",
    },
    workerThreads: false,
  },
  output: process.platform === "win32" ? undefined : "standalone",
};

export default withNextIntl(nextConfig);
