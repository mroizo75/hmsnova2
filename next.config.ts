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
  serverExternalPackages: ["jspdf", "jspdf-autotable", "fflate"],
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
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore — outputFileTracingIgnores finnes i runtime men mangler i TS-typer for denne versjonen
    outputFileTracingIgnores: ["**/storage/**"],
    workerThreads: false,
  },
  output: "standalone",
};

export default withNextIntl(nextConfig);
