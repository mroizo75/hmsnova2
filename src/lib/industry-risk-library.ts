import type {
  IndustryLegalReferenceSeed,
  IndustryPackage,
  IndustryRiskSeed,
} from "@/lib/industry-packages";
import { INDUSTRY_RISKS } from "@/features/document-generator/data/industry-risks";

/**
 * Bransjebibliotek for default risikovurdering.
 * Maler er utgangspunkt – arbeidsgiver må tilpasse til egen virksomhet
 * (AML § 3-1 og internkontrollforskriften § 5).
 */
const LIBRARY_INDUSTRIES: ReadonlyArray<{
  industry: string;
  displayName: string;
  risksKey: keyof typeof INDUSTRY_RISKS;
}> = [
  { industry: "construction", displayName: "Bygg og anlegg", risksKey: "CONSTRUCTION" },
  { industry: "healthcare", displayName: "Helsevesen", risksKey: "HEALTHCARE" },
  { industry: "transport", displayName: "Transport og logistikk", risksKey: "TRANSPORT" },
  { industry: "manufacturing", displayName: "Industri og produksjon", risksKey: "MANUFACTURING" },
  { industry: "retail", displayName: "Handel og service", risksKey: "RETAIL" },
  { industry: "office", displayName: "Kontor og administrasjon", risksKey: "OFFICE" },
  { industry: "education", displayName: "Utdanning", risksKey: "EDUCATION" },
  { industry: "technology", displayName: "Teknologi og IT", risksKey: "TECHNOLOGY" },
  { industry: "consulting", displayName: "Rådgivning og konsulent", risksKey: "CONSULTING" },
  { industry: "legal", displayName: "Advokat og juridisk", risksKey: "LEGAL" },
  { industry: "accounting", displayName: "Regnskap og revisjon", risksKey: "ACCOUNTING" },
  { industry: "finance", displayName: "Finans og forsikring", risksKey: "FINANCE" },
  { industry: "av_installation", displayName: "AV, montasje og installasjon", risksKey: "AV_INSTALLATION" },
  { industry: "telecom", displayName: "Telekommunikasjon", risksKey: "TELECOM" },
  { industry: "cleaning", displayName: "Renhold og eiendomsdrift", risksKey: "CLEANING" },
  { industry: "security", displayName: "Vakt og sikkerhet", risksKey: "SECURITY" },
  { industry: "staffing", displayName: "Bemanning og vikar", risksKey: "STAFFING" },
  { industry: "architecture", displayName: "Arkitektur og design", risksKey: "ARCHITECTURE" },
  { industry: "media", displayName: "Media, reklame og kommunikasjon", risksKey: "MEDIA" },
  { industry: "culture_sport", displayName: "Kultur, idrett og underholdning", risksKey: "CULTURE_SPORT" },
  { industry: "personal_services", displayName: "Frisør, velvære og personlig tjenesteyting", risksKey: "PERSONAL_SERVICES" },
  { industry: "other", displayName: "Annet", risksKey: "OTHER" },
];

const BASE_LEGAL_REFERENCES: ReadonlyArray<IndustryLegalReferenceSeed> = [
  {
    title: "Kartlegging og risikovurdering",
    paragraphRef: "AML § 3-1 + internkontrollforskriften § 5",
    description:
      "Arbeidsgiver skal kartlegge farer og problemer og iverksette tiltak. Bransjemalen er et utgangspunkt og må tilpasses egen virksomhet.",
    sourceUrl: "https://lovdata.no/dokument/NL/lov/2005-06-17-62/KAPITTEL_3",
  },
];

export function mapIndustryRisksToSeeds(risksKey: keyof typeof INDUSTRY_RISKS): IndustryRiskSeed[] {
  const items = INDUSTRY_RISKS[risksKey] ?? [];
  return items.map((risk) => ({
    title: risk.hazard,
    context: risk.hazard,
    category: "SAFETY",
    likelihood: risk.probability,
    consequence: risk.severity,
    controls: risk.measures.join(". "),
  }));
}

function buildLibraryPackage(entry: (typeof LIBRARY_INDUSTRIES)[number]): IndustryPackage {
  return {
    industry: entry.industry,
    displayName: entry.displayName,
    farmTypes: [],
    simpleMenuHrefs: ["/dashboard/incidents", "/dashboard/inspections", "/dashboard/sja", "/dashboard/risks"],
    risks: mapIndustryRisksToSeeds(entry.risksKey),
    sjaTemplates: [],
    inspectionTemplates: [],
    courseTemplates: [],
    legalReferences: BASE_LEGAL_REFERENCES,
  };
}

export function buildLibraryIndustryPackages(
  existingIndustries: ReadonlyArray<string>
): Record<string, IndustryPackage> {
  const skip = new Set(existingIndustries);
  const packages: Record<string, IndustryPackage> = {};
  for (const entry of LIBRARY_INDUSTRIES) {
    if (skip.has(entry.industry)) continue;
    packages[entry.industry] = buildLibraryPackage(entry);
  }
  return packages;
}

export function getLibraryIndustryIds(): string[] {
  return LIBRARY_INDUSTRIES.map((entry) => entry.industry);
}
