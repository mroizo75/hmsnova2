import { SITE_CONFIG } from "@/lib/seo-config";

const PRIVATE_PATHS = [
  "/dashboard/",
  "/admin/",
  "/ansatt/",
  "/api/",
  "/cdn-cgi/",
  "/login",
  "/reset-password",
  "/forgot-password",
  "/registrer-bedrift/takk",
];

/** Svar-motorer. Trening er avslått i Content-Signal, så disse får lese for å sitere. */
const ANSWER_AGENTS = [
  "Google-Extended",
  "OAI-SearchBot",
  "ClaudeBot",
  "anthropic-ai",
  "ChatGPT-User",
  "PerplexityBot",
];

/** Treningscrawlere. ai-train=no. */
const TRAINING_AGENTS = [
  "GPTBot",
  "CCBot",
  "Bytespider",
  "Amazonbot",
  "Applebot-Extended",
  "meta-externalagent",
];

function publicOrigin(): string {
  try {
    const url = new URL(SITE_CONFIG.url);
    const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    if (isLocal || url.port) return "https://www.hmsnova.no";
    return url.origin;
  } catch {
    return "https://www.hmsnova.no";
  }
}

function allowGroup(agents: string[]): string {
  const lines = agents.map((agent) => `User-agent: ${agent}`);
  lines.push("Allow: /");
  for (const path of PRIVATE_PATHS) lines.push(`Disallow: ${path}`);
  return lines.join("\n");
}

function disallowGroup(agents: string[]): string {
  const lines = agents.map((agent) => `User-agent: ${agent}`);
  lines.push("Disallow: /");
  return lines.join("\n");
}

export function buildRobotsTxt(): string {
  const everyone = [
    "User-agent: *",
    "Content-Signal: search=yes, ai-input=yes, ai-train=no",
    "Allow: /",
    ...PRIVATE_PATHS.map((path) => `Disallow: ${path}`),
  ].join("\n");

  return [
    everyone,
    allowGroup(ANSWER_AGENTS),
    disallowGroup(TRAINING_AGENTS),
    `Sitemap: ${publicOrigin()}/sitemap.xml`,
    "",
  ].join("\n\n");
}
