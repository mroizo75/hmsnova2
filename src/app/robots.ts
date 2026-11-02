import { MetadataRoute } from "next";
import { SITE_CONFIG } from "@/lib/seo-config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard/*",
          "/admin/*",
          "/ansatt/*",
          "/api/*",
          "/cdn-cgi/",
          "/login",
          "/reset-password",
          "/forgot-password",
          "/registrer-bedrift/takk",
        ],
      },
      {
        userAgent: "GPTBot",
        allow: "/",
        disallow: ["/dashboard/", "/admin/", "/ansatt/", "/api/", "/cdn-cgi/"],
      },
      {
        userAgent: "PerplexityBot",
        allow: "/",
        disallow: ["/dashboard/", "/admin/", "/ansatt/", "/api/", "/cdn-cgi/"],
      },
      {
        userAgent: "ChatGPT-User",
        allow: "/",
        disallow: ["/dashboard/", "/admin/", "/ansatt/", "/api/", "/cdn-cgi/"],
      },
      {
        userAgent: "anthropic-ai",
        allow: "/",
        disallow: ["/dashboard/", "/admin/", "/ansatt/", "/api/", "/cdn-cgi/"],
      },
      {
        userAgent: "ClaudeBot",
        allow: "/",
        disallow: ["/dashboard/", "/admin/", "/ansatt/", "/api/", "/cdn-cgi/"],
      },
      {
        userAgent: "Google-Extended",
        allow: "/",
        disallow: ["/dashboard/", "/admin/", "/ansatt/", "/api/", "/cdn-cgi/"],
      },
      {
        userAgent: "Bytespider",
        disallow: ["/"],
      },
    ],
    sitemap: `${SITE_CONFIG.url}/sitemap.xml`,
  };
}
