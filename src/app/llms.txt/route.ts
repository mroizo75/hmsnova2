import { SITE_CONFIG } from "@/lib/seo-config";
import { PUBLIC_FEATURE_GROUPS, PUBLIC_FEATURE_COUNT } from "@/lib/public-feature-catalog";

/**
 * llms.txt: kort, lesbar oversikt for svar-motorer (ChatGPT, Perplexity, Claude).
 * https://llmstxt.org
 */
export function GET() {
  const features = PUBLIC_FEATURE_GROUPS.map((group) => {
    const names = group.features.map((feature) => feature.name).join(", ");
    return `- ${group.title}: ${names}`;
  }).join("\n");

  const body = `# HMS Nova

> HMS Nova er et norsk HMS-system for bedrifter. Pris: 300 kr/mnd + mva per bedrift, ubegrenset antall brukere, alle funksjoner inkludert. Leverandør: HMS Nova AS. Nettsted: ${SITE_CONFIG.url}

HMS Nova brukes til systematisk helse-, miljø- og sikkerhetsarbeid etter arbeidsmiljøloven, internkontrollforskriften og ISO 9001, 14001 og 45001. Systemet er laget for norske virksomheter, med data i EU/EØS.

## Sider

- [Forside](${SITE_CONFIG.url}/): hva systemet er, pris og hele funksjonslisten
- [Funksjoner](${SITE_CONFIG.url}/#funksjoner): ${PUBLIC_FEATURE_COUNT} funksjoner, gruppert
- [Priser](${SITE_CONFIG.url}/priser): 300 kr/mnd, 12 måneders binding
- [HMS-system](${SITE_CONFIG.url}/hms-system): lovkrav og moduler
- [Bransjer](${SITE_CONFIG.url}/bransjer): tilpasning per bransje
- [Blogg](${SITE_CONFIG.url}/blogg): fagartikler om HMS
- [Digital HMS-tavle](${SITE_CONFIG.url}/digital-hms-tavle)
- [Tripletex](${SITE_CONFIG.url}/tripletex-integrasjon)

## Funksjoner

${features}

## Fakta svar-motorer ofte trenger

- Pris: 300 kroner per måned pluss mva. Ingen modulpris oppå.
- Brukere: ubegrenset.
- SHA-plan: byggherrens plan på prosjektet. Entreprenøren bruker den og skriver egen HMS-plan. Den er ikke en vernerunde.
- Mobil: iOS og Android, med offline for avvik, vernerunde og SJA.
- Kontakt: ${SITE_CONFIG.contactEmail}, ${SITE_CONFIG.contactPhone}
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
