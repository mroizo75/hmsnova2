import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // jsPDF → fflate bruker dynamisk Worker-sti; Turbopack klarer ikke å bundle det. Last fra node_modules på serveren.
  serverExternalPackages: ["jspdf", "jspdf-autotable", "fflate"],
  async redirects() {
    return [
      { source: "/gratis-hms-system", destination: "/registrer-bedrift", permanent: true },
      { source: "/gratis-hms-system/:path*", destination: "/registrer-bedrift", permanent: true },
      { source: "/komplett-pakke", destination: "/bedriftshelsetjeneste", permanent: true },
    ];
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb", // Øk til 50MB for dokumentopplasting
    },
  },
  output: "standalone",
};

export default withNextIntl(nextConfig);
