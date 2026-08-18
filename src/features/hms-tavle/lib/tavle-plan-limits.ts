import { HmsTavlePlan, HmsTavleSectionType } from "@prisma/client";

export interface TavlePlanLimits {
  maxTavler: number;
  maxSections: number;
  maxExternalLinks: number;
  allowedSectionTypes: HmsTavleSectionType[];
  hasUePortal: boolean;
  hasQrCheckin: boolean;
  hasKioskMode: boolean;
  hasAiInsight: boolean;
  hasLovkravSjekkliste: boolean;
  hasLiveHmsNovaData: boolean; // Kun ADDON
  hasGuestSlaEscalation: boolean; // Automatisk eskalering av gjestmeldinger forbi SLA
  hasBulkRoomQr: boolean; // Rom-/bord-QR i skala med utskriftsark
}

const ALLE_SEKSJONER: HmsTavleSectionType[] = [
  "SHA_PLAN",
  "MANNSKAPSLISTE",
  "AVVIK_STATISTIKK",
  "RUH_LISTE",
  "SJA_AKTIVE",
  "VERNERUNDE_STATUS",
  "KONTAKTINFO",
  "BEREDSKAPSPLAN",
  "DOKUMENT_HUB",
  "EKSTERN_LENKE",
  "VAERMELDING",
  "KPI_DASHBOARD",
  "HMS_PLAN_AARSHJUL",
  "FREMDRIFTSPLAN",
  "RIGGPLAN",
  "RISIKOMATRISE",
  "OPPLARING_STATUS",
  "LOVKRAV_SJEKKLISTE",
  "NYHETER_MELDINGER",
  "SNARVEIER",
  "GJEST_SKJEMA",
  "GJESTESERVICE_STATUS",
];

export const PLAN_LIMITS: Record<HmsTavlePlan, TavlePlanLimits> = {
  ENKEL: {
    maxTavler: 1,
    maxSections: 5,
    maxExternalLinks: 3,
    allowedSectionTypes: [
      "KONTAKTINFO",
      "BEREDSKAPSPLAN",
      "SHA_PLAN",
      "RIGGPLAN",
      "DOKUMENT_HUB",
      "EKSTERN_LENKE",
      "SNARVEIER",
    ],
    hasUePortal: false,
    hasQrCheckin: false,
    hasKioskMode: false,
    hasAiInsight: false,
    hasLovkravSjekkliste: false,
    hasLiveHmsNovaData: false,
    hasGuestSlaEscalation: false,
    hasBulkRoomQr: false,
  },
  STANDARD: {
    maxTavler: 3,
    maxSections: 12,
    maxExternalLinks: 10,
    allowedSectionTypes: [
      "KONTAKTINFO",
      "BEREDSKAPSPLAN",
      "SHA_PLAN",
      "RIGGPLAN",
      "MANNSKAPSLISTE",
      "DOKUMENT_HUB",
      "EKSTERN_LENKE",
      "AVVIK_STATISTIKK",
      "RUH_LISTE",
      "SJA_AKTIVE",
      "VAERMELDING",
      "FREMDRIFTSPLAN",
      "NYHETER_MELDINGER",
      "SNARVEIER",
      "GJEST_SKJEMA",
      "GJESTESERVICE_STATUS",
    ],
    hasUePortal: true,
    hasQrCheckin: true,
    hasKioskMode: false,
    hasAiInsight: false,
    hasLovkravSjekkliste: false,
    hasLiveHmsNovaData: false,
    hasGuestSlaEscalation: false,
    hasBulkRoomQr: false,
  },
  AVANSERT: {
    maxTavler: 999,
    maxSections: 999,
    maxExternalLinks: 999,
    allowedSectionTypes: ALLE_SEKSJONER,
    hasUePortal: true,
    hasQrCheckin: true,
    hasKioskMode: true,
    hasAiInsight: true,
    hasLovkravSjekkliste: true,
    hasLiveHmsNovaData: false,
    hasGuestSlaEscalation: true,
    hasBulkRoomQr: true,
  },
  ADDON: {
    maxTavler: 999,
    maxSections: 999,
    maxExternalLinks: 999,
    allowedSectionTypes: ALLE_SEKSJONER,
    hasUePortal: true,
    hasQrCheckin: true,
    hasKioskMode: true,
    hasAiInsight: true,
    hasLovkravSjekkliste: true,
    hasLiveHmsNovaData: true, // Full HMS Nova-integrasjon
    hasGuestSlaEscalation: true,
    hasBulkRoomQr: true,
  },
};

export function getPlanLimits(plan: HmsTavlePlan): TavlePlanLimits {
  return PLAN_LIMITS[plan];
}

export function isSectionAllowed(plan: HmsTavlePlan, type: HmsTavleSectionType): boolean {
  return PLAN_LIMITS[plan].allowedSectionTypes.includes(type);
}

export const PLAN_PRICES: Record<HmsTavlePlan, number> = {
  ENKEL: 390,
  STANDARD: 590,
  AVANSERT: 790,
  ADDON: 290,
};

export const PLAN_LABELS: Record<HmsTavlePlan, string> = {
  ENKEL: "Enkel",
  STANDARD: "Standard",
  AVANSERT: "Avansert",
  ADDON: "HMS Nova Add-on",
};
