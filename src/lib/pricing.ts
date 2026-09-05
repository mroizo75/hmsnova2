/**
 * Pricing & CRM utilities for HMS Nova 2.0
 * 
 * Konkurransefordel mot Grønn Jobb:
 * - Bedre UI/UX
 * - Mer omfattende funksjonalitet
 * - Digital signatur på skjemaer
 * - Kraftig rapportering og analytics
 * - Automatiserte varsler og oppfølging
 * - Følger ISO 9001:2015 krav
 */

import { PricingTier } from "@prisma/client";
import { SUPPORTED_INDUSTRIES } from "@/lib/industry-packages";

export type BindingPeriod = "none" | "1year" | "2year";

export interface BindingPlan {
  period: BindingPeriod;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  savings?: string;
  popular?: boolean;
}

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
 * HMS Nova Prisplan (Kun Software)
 * 
 * Transparent prising. Ingen skjulte kostnader.
 * 
 * Prismodell: én pakke 12 mnd binding
 * - 12 mnd binding: 300 kr/mnd (3 600 kr/år)
 * 
 * HMS Nova fordeler:
 * - Ingen oppstartskostnader: 0 kr (konkurrenter: 20.000-50.000 kr)
 * - Alt inkludert: Alle funksjoner i prisen
 * - Norsk support: E-post og telefon inkludert
 * - Gratis HMS-håndbok: Ferdig mal klar til bruk
 * - Digital signatur: Inkludert (konkurrenter: ekstrakostnad)
 */
export const BINDING_PLANS: BindingPlan[] = [
  {
    period: "1year",
    name: "12 mnd binding",
    description: "Full tilgang til HMS Nova",
    monthlyPrice: 300,
    yearlyPrice: 3600,
    popular: true,
  },
];

/**
 * Standard funksjoner inkludert i alle planer
 */
export const INCLUDED_FEATURES = [
  "✅ Ubegrenset antall brukere",
  "✅ Dokumenthåndtering med versjonskontroll",
  "✅ Risikovurdering (5x5 matrise)",
  "✅ Hendelsesrapportering & 5-Whys analyse",
  "✅ Digital signaturer (pålogging)",
  "✅ Ferdig HMS-håndbok",
  "✅ Opplæringsmodul & kompetansematrise",
  "✅ Revisjoner & Audits (ISO 9001)",
  "✅ Mål & KPI-oppfølging",
  "✅ Stoffkartotek med sikkerhetsdatablad",
  "✅ Automatiske påminnelser & varsler",
  "✅ Mobiloptimalisert løsning",
  "✅ E-post og telefon support",
  "✅ Ubegrenset lagring",
  "✅ API-tilgang for integrasjoner",
];

// Legacy pricing plans (beholdes for bakoverkompatibilitet)
export const PRICING_PLANS: PricingPlan[] = [
  {
    tier: "MICRO",
    name: "HMS Nova Software",
    employeeRange: "Alle bedriftsstørrelser",
    minEmployees: 1,
    maxEmployees: null,
    yearlyPrice: 3600,
    monthlyPrice: 300,
    features: INCLUDED_FEATURES,
    popularFeatures: [
      "Digital signatur",
      "Ferdig HMS-håndbok",
      "ISO 9001",
    ],
  },
  {
    tier: "SMALL",
    name: "HMS Nova Software",
    employeeRange: "Alle bedriftsstørrelser",
    minEmployees: 1,
    maxEmployees: null,
    yearlyPrice: 3600,
    monthlyPrice: 300,
    features: INCLUDED_FEATURES,
    popularFeatures: [
      "Automatiske varsler",
      "API-tilgang",
      "Telefon support",
    ],
  },
  {
    tier: "MEDIUM",
    name: "HMS Nova Software",
    employeeRange: "Alle bedriftsstørrelser",
    minEmployees: 1,
    maxEmployees: null,
    yearlyPrice: 3600,
    monthlyPrice: 300,
    features: INCLUDED_FEATURES,
    popularFeatures: [
      "Ubegrenset brukere",
      "Ubegrenset lagring",
      "Full support",
    ],
  },
];

/**
 * Beregn pricing tier basert på antall ansatte
 * Nå returnerer alltid MICRO siden alle får samme pris
 */
export function calculatePricingTier(employeeCount: number): PricingTier {
  return "MICRO"; // Alle får samme pris uansett størrelse
}

/**
 * Hent pricing plan for en tier
 */
export function getPricingPlan(tier: PricingTier): PricingPlan {
  return PRICING_PLANS.find((p) => p.tier === tier) || PRICING_PLANS[0];
}

/**
 * Hent binding plan basert på periode
 */
export function getBindingPlan(period: BindingPeriod): BindingPlan {
  return BINDING_PLANS.find((p) => p.period === period) || BINDING_PLANS[0];
}

/**
 * Hent pris basert på bindingsperiode
 */
export function getPriceForBinding(period: BindingPeriod, isYearly: boolean = false): number {
  const plan = getBindingPlan(period);
  return isYearly ? plan.yearlyPrice : plan.monthlyPrice;
}

/**
 * Hent pris basert på antall ansatte (legacy - returnerer 1 år binding pris)
 */
export function getPriceForEmployeeCount(employeeCount: number, isYearly: boolean = true): number {
  const plan = getBindingPlan("1year"); // Standard er 1 år binding
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
    feature: "ISO 9001-støtte",
    hmsNova: "✅ Følger alle ISO 9001:2015 krav",
    gronnJobb: "⚠️ Delvis",
    advantage: "Klargjort for ISO-sertifisering out-of-the-box",
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
export { SUPPORTED_INDUSTRIES };

