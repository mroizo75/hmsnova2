/**
 * Pricing & CRM utilities for HMS Nova 2.0
 * 
 * Konkurransefordel mot Grønn Jobb:
 * - Bedre UI/UX
 * - Mer omfattende funksjonalitet
 * - Digital signatur på skjemaer
 * - Kraftig rapportering og analytics
 * - Automatiserte varsler og oppfølging
 * - ISO 9001 sertifiserings-klart
 */

import { PricingTier } from "@prisma/client";

export interface PricingPlan {
  tier: PricingTier;
  name: string;
  employeeRange: string;
  minEmployees: number;
  maxEmployees: number | null;
  yearlyPrice: number;
  monthlyPrice: number;
  features: string[];
  popularFeatures: string[];
}

/**
 * HMS Nova 2.0 Prisplan
 * 
 * Samme pris som Grønn Jobb, men MER innhold!
 * 
 * HMS Nova vs Grønn Jobb:
 * - Samme pris: 8.000 kr / 12.000 kr / 16.000 kr
 * - MER funksjonalitet: Digital signatur, 7 roller, ISO 9001 100%, KPI-måling, 5 Whys, API
 * - MER support: Chat, e-post, telefon (Grønn Jobb: kun e-post)
 * - MER gratis innhold: 50+ skjemaer, guider, maler (Grønn Jobb: HMS-håndbok)
 * - MER bransjemaler: 10 bransjer med 150+ maler (Grønn Jobb: generiske)
 */
export const PRICING_PLANS: PricingPlan[] = [
  {
    tier: "MICRO",
    name: "Starter",
    employeeRange: "0-20 ansatte",
    minEmployees: 1,
    maxEmployees: 20,
    yearlyPrice: 8000,
    monthlyPrice: 800,
    features: [
      "✅ Komplett HMS-system",
      "✅ Avvikshåndtering",
      "✅ Risikovurderinger",
      "✅ Digital signatur på skjemaer",
      "✅ Stoffkartotek",
      "✅ Mobilapp inkludert",
      "✅ Bransjespesifikke maler",
      "✅ E-post support",
      "✅ Opplæring & oppfølging",
      "✅ ISO 9001 kompatibel",
    ],
    popularFeatures: [
      "Digital signatur",
      "Mobilapp",
      "Bransjemaler",
    ],
  },
  {
    tier: "SMALL",
    name: "Professional",
    employeeRange: "21-50 ansatte",
    minEmployees: 21,
    maxEmployees: 50,
    yearlyPrice: 12000,
    monthlyPrice: 1200,
    features: [
      "✅ Alt i Mikro +",
      "✅ Avansert rapportering",
      "✅ Revisjonsmodul",
      "✅ Opplæringsmatrise",
      "✅ Mål & KPI-oppfølging",
      "✅ Integrert BHT-samarbeid",
      "✅ Telefon support",
      "✅ Prioritert oppfølging",
      "✅ Månedlig HMS-rapporter",
      "✅ Tilpassede skjemaer",
    ],
    popularFeatures: [
      "Revisjonsmodul",
      "KPI-oppfølging",
      "Telefon support",
    ],
  },
  {
    tier: "MEDIUM",
    name: "Enterprise",
    employeeRange: "51+ ansatte",
    minEmployees: 51,
    maxEmployees: 200,
    yearlyPrice: 16000,
    monthlyPrice: 1600,
    features: [
      "✅ Alt i Små bedrifter +",
      "✅ Multi-lokasjon støtte",
      "✅ Avansert rollestyring (7 roller)",
      "✅ API-tilgang",
      "✅ Fiken integrasjon",
      "✅ Egendefinerte dashboards",
      "✅ Dedikert kundekonsulent",
      "✅ Kvartalsvis HMS-gjennomgang",
      "✅ Prioritert support (4t responstid)",
      "✅ Tilpassbar fakturering",
    ],
    popularFeatures: [
      "Multi-lokasjon",
      "API-tilgang",
      "Dedikert konsulent",
    ],
  },
  {
    tier: "LARGE",
    name: "Enterprise Plus",
    employeeRange: "200+ ansatte",
    minEmployees: 201,
    maxEmployees: null,
    yearlyPrice: 29990,
    monthlyPrice: 2999,
    features: [
      "✅ Alt i Mellomstore bedrifter +",
      "✅ Enterprise SLA",
      "✅ Ubegrenset antall brukere",
      "✅ White-label mulighet",
      "✅ On-premise deployment (valgfritt)",
      "✅ Dedikert HMS-rådgiver",
      "✅ Månedlige strategi-møter",
      "✅ Skreddersydde integrasjoner",
      "✅ 1t responstid support",
      "✅ Årlig HMS-audit inkludert",
    ],
    popularFeatures: [
      "Enterprise SLA",
      "Dedikert rådgiver",
      "White-label",
    ],
  },
];

/**
 * Beregn pricing tier basert på antall ansatte
 * Matcher Grønn Jobb sine kategorier
 */
export function calculatePricingTier(employeeCount: number): PricingTier {
  if (employeeCount <= 20) return "MICRO";    // 0-20 = Starter (8.000 kr)
  if (employeeCount <= 50) return "SMALL";    // 21-50 = Professional (12.000 kr)
  if (employeeCount <= 200) return "MEDIUM";  // 51-200 = Enterprise (16.000 kr)
  return "LARGE";                              // 200+ = Enterprise Plus (29.990 kr)
}

/**
 * Hent pricing plan for en tier
 */
export function getPricingPlan(tier: PricingTier): PricingPlan {
  return PRICING_PLANS.find((p) => p.tier === tier) || PRICING_PLANS[0];
}

/**
 * Hent pris basert på antall ansatte
 */
export function getPriceForEmployeeCount(employeeCount: number, isYearly: boolean = true): number {
  const tier = calculatePricingTier(employeeCount);
  const plan = getPricingPlan(tier);
  return isYearly ? plan.yearlyPrice : plan.monthlyPrice;
}

/**
 * HMS Nova 2.0 vs Grønn Jobb - Konkurransefortrinn
 */
export const COMPETITIVE_ADVANTAGES = [
  {
    feature: "Digital signatur på skjemaer",
    hmsNova: "✅ Inkludert",
    gronnJobb: "❌ Ikke tilgjengelig",
    advantage: "Ansatte kan signere direkte med pålogging",
  },
  {
    feature: "Roller & tilgangsstyring",
    hmsNova: "✅ 7 roller (Admin, HMS, Leader, Verneombud, Ansatt, BHT, Revisor)",
    gronnJobb: "⚠️ Begrenset",
    advantage: "Granulær kontroll over hvem som kan gjøre hva",
  },
  {
    feature: "ISO 9001 sertifisering",
    hmsNova: "✅ 100% compliant med dokumentasjon",
    gronnJobb: "⚠️ Delvis",
    advantage: "Ferdig for sertifisering out-of-the-box",
  },
  {
    feature: "Revisjonsmodul",
    hmsNova: "✅ Komplett med 27 ISO-klausuler",
    gronnJobb: "⚠️ Enkel revisjon",
    advantage: "Strukturert revisjonshåndtering med funn, korrigerende tiltak og verifisering",
  },
  {
    feature: "Mål & KPI",
    hmsNova: "✅ Automatisk og manuell måling",
    gronnJobb: "❌ Ikke tilgjengelig",
    advantage: "Strategisk oppfølging av HMS-mål",
  },
  {
    feature: "Stoffkartotek",
    hmsNova: "✅ Med fareskilt og verneutstyr",
    gronnJobb: "⚠️ Enkel kjemikal-liste",
    advantage: "Visuell fremstilling med UN-piktogrammer",
  },
  {
    feature: "5 Whys metode",
    hmsNova: "✅ Integrert i hendelseshåndtering",
    gronnJobb: "❌ Ikke tilgjengelig",
    advantage: "Rotårsaksanalyse direkte i systemet",
  },
  {
    feature: "Multi-tenant arkitektur",
    hmsNova: "✅ Profesjonell",
    gronnJobb: "⚠️ Ukjent",
    advantage: "Sikker isolering mellom kunder",
  },
  {
    feature: "API & Integrasjoner",
    hmsNova: "✅ REST API + Fiken",
    gronnJobb: "❌ Ikke tilgjengelig",
    advantage: "Koble til andre systemer",
  },
  {
    feature: "Moderne UX",
    hmsNova: "✅ shadcn/ui + Tailwind",
    gronnJobb: "⚠️ Eldre design",
    advantage: "Bedre brukeropplevelse og raskere læringskurve",
  },
];

/**
 * Onboarding checklist
 */
export const ONBOARDING_STEPS = [
  {
    id: "admin_created",
    title: "Admin-bruker opprettet",
    description: "Første admin-bruker må opprettes og få tilgang",
    estimatedTime: "5 min",
  },
  {
    id: "company_info",
    title: "Bedriftsinformasjon",
    description: "Fyll ut org.nr, adresse, kontaktinfo",
    estimatedTime: "10 min",
  },
  {
    id: "users_invited",
    title: "Inviter ansatte",
    description: "Legg til brukere med riktige roller",
    estimatedTime: "15 min",
  },
  {
    id: "templates_configured",
    title: "Velg bransjemaler",
    description: "Velg relevante maler for din bransje",
    estimatedTime: "20 min",
  },
  {
    id: "documents_uploaded",
    title: "Last opp eksisterende dokumenter",
    description: "Importer gamle HMS-dokumenter",
    estimatedTime: "30 min",
  },
  {
    id: "training_setup",
    title: "Sett opp opplæring",
    description: "Definer obligatoriske kurs",
    estimatedTime: "20 min",
  },
  {
    id: "chemicals_registered",
    title: "Registrer kjemikalier",
    description: "Legg til produkter i stoffkartotek",
    estimatedTime: "30 min",
  },
  {
    id: "first_risk_assessment",
    title: "Første risikovurdering",
    description: "Gjennomfør risikovurdering",
    estimatedTime: "1 time",
  },
  {
    id: "mobile_app",
    title: "Last ned mobilapp",
    description: "Alle ansatte laster ned app",
    estimatedTime: "10 min",
  },
  {
    id: "training_completed",
    title: "Gjennomfør opplæring",
    description: "System-opplæring med kundekonsulent",
    estimatedTime: "2 timer",
  },
];

/**
 * Industrier vi støtter med spesialiserte maler
 */
export const SUPPORTED_INDUSTRIES = [
  { value: "construction", label: "Bygg og anlegg", templates: 25 },
  { value: "healthcare", label: "Helsevesen", templates: 20 },
  { value: "manufacturing", label: "Industri & produksjon", templates: 30 },
  { value: "retail", label: "Handel & service", templates: 15 },
  { value: "transport", label: "Transport & logistikk", templates: 22 },
  { value: "hospitality", label: "Hotell & restaurant", templates: 18 },
  { value: "education", label: "Utdanning", templates: 12 },
  { value: "technology", label: "Teknologi & IT", templates: 10 },
  { value: "agriculture", label: "Landbruk", templates: 16 },
  { value: "other", label: "Annet", templates: 8 },
];

