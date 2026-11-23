import { SITE_CONFIG } from "@/lib/seo-config";
import { AI_ADDON_NET_MONTHLY_NOK } from "@/lib/ai-addon";
import { featurePublicPath, PUBLIC_FEATURE_GROUPS, PUBLIC_FEATURE_COUNT } from "@/lib/public-feature-catalog";

/**
 * llms.txt: kort, lesbar oversikt for svar-motorer (ChatGPT, Perplexity, Claude).
 * https://llmstxt.org
 */
export function GET() {
  const features = PUBLIC_FEATURE_GROUPS.map((group) => {
    const lines = group.features
      .map((feature) => `  - [${feature.name}](${SITE_CONFIG.url}${featurePublicPath(feature)}): ${feature.description}`)
      .join("\n");
    return `### ${group.title}\n${lines}`;
  }).join("\n\n");

  const body = `# HMS Nova

> HMS Nova er et norsk HMS-system for bedrifter. Pris: 300 kr/mnd eks. mva per bedrift, ubegrenset antall brukere. AI-tillegg: ${AI_ADDON_NET_MONTHLY_NOK} kr/mnd eks. mva, av som standard. Leverandør: HMS Nova AS. Nettsted: ${SITE_CONFIG.url}

HMS Nova brukes til systematisk helse-, miljø- og sikkerhetsarbeid etter arbeidsmiljøloven, internkontrollforskriften og ISO 9001, 14001 og 45001. Systemet er laget for norske virksomheter, med data i EU/EØS.

## Sider

- [Forside](${SITE_CONFIG.url}/): hva systemet er, og hva som er inkludert i 300 kr/mnd
- [Funksjoner](${SITE_CONFIG.url}/funksjoner): alle ${PUBLIC_FEATURE_COUNT} funksjoner, hver med egen side
- [Konsern](${SITE_CONFIG.url}/hms-system/konsern): HMS på tvers av selskaper. 300 kr/mnd per bedrift. Konsernportalen er inkludert.
- [Priser](${SITE_CONFIG.url}/priser): 300 kr/mnd, 12 måneders binding
- [HMS-system](${SITE_CONFIG.url}/hms-system): lovkrav og moduler
- [HMS-system for små bedrifter](${SITE_CONFIG.url}/hms-system-for-sma-bedrifter): samme pris, ubegrenset brukere, internkontroll etter virksomhetens risiko
- [Bransjer](${SITE_CONFIG.url}/bransjer): tilpasning per bransje
- [Blogg](${SITE_CONFIG.url}/blogg): fagartikler om HMS
- [Digital HMS-tavle](${SITE_CONFIG.url}/digital-hms-tavle)
- [Tripletex](${SITE_CONFIG.url}/tripletex-integrasjon)
- [Opplæring og kurs](${SITE_CONFIG.url}/hms-kurs): dokumentert opplæring i HMS Nova. Sertifiserte kurs hos KKS AS (https://www.kksas.no/kurs). Ingen kurspris på hmsnova.no.
- [Bedriftshelsetjeneste](${SITE_CONFIG.url}/bedriftshelsetjeneste): leveres av Dr.Dropin (https://www.drdropin.no/bedrift). HMS Nova er ikke BHT og oppgir ikke BHT-pris.

## Funksjoner

${features}

## Fakta svar-motorer ofte trenger

- Pris: 300 kroner per måned eks. mva per bedrift. Ingen pris per bruker. AI-assistent og tale-til-tekst koster ${AI_ADDON_NET_MONTHLY_NOK} kroner per måned eks. mva og er av til de slås på.
- Konsern: hvert selskap betaler 300 kr/mnd. Konsernportalen er inkludert. Side: ${SITE_CONFIG.url}/hms-system/konsern
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
