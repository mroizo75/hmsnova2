/**
 * Startseksjoner per bransje for Digital HMS Tavle.
 *
 * Reiselivsbedrifter skal komme rett i gang uten å bygge tavlen fra tomt ark.
 * Seedingen er kun et utgangspunkt – virksomheten kan fjerne, legge til og
 * omrokere alt i seksjonsbyggeren etterpå.
 *
 * Merk: gjestmeldinger seedes ALDRI som offentlig innhold. Kun innsendings-
 * skjemaet og det anonymiserte tillitspanelet legges på tavlen.
 */

import type { HmsTavlePlan, HmsTavleSectionType, TavleDisplayMode } from "@prisma/client";
import { getPlanLimits, isSectionAllowed } from "./tavle-plan-limits";
import { GUEST_TYPE_VALUES } from "./gjesteservice-config";

export interface SeedSection {
  type: HmsTavleSectionType;
  title: string | null;
  order: number;
  isVisible: boolean;
  displayMode: TavleDisplayMode;
  config: Record<string, unknown>;
}

const REISELIV_BRANSJER = new Set([
  "HOTELL_OVERNATTING",
  "RESTAURANT_SERVERING",
  "ATTRAKSJON_OPPLEVELSE",
  "TUROPERATOR",
  "TURISTTRANSPORT",
]);

export function isReiselivBransje(bransje: string | null | undefined): boolean {
  return REISELIV_BRANSJER.has(bransje ?? "");
}

/** Hva gjesten kalles og hvilket sted-felt som er relevant per bransje */
function getStedsfelt(bransje: string): { label: string; labelEn: string } {
  switch (bransje) {
    case "RESTAURANT_SERVERING":
      return { label: "Bordnummer", labelEn: "Table number" };
    case "TURISTTRANSPORT":
      return { label: "Avgang eller setenummer", labelEn: "Departure or seat number" };
    case "TUROPERATOR":
      return { label: "Reise eller bookingnummer", labelEn: "Trip or booking reference" };
    case "ATTRAKSJON_OPPLEVELSE":
      return { label: "Sted eller aktivitet", labelEn: "Location or activity" };
    default:
      return { label: "Romnummer", labelEn: "Room number" };
  }
}

function getVelkomsttekst(bransje: string): { nb: string; en: string } {
  if (bransje === "RESTAURANT_SERVERING") {
    return {
      nb: "Fortell oss hvordan besøket var. Gjelder det mat, allergier eller noe som ikke var som det skulle, tar vi tak i det med en gang.",
      en: "Tell us how your visit was. If it concerns food, allergies or something that was not right, we will act on it right away.",
    };
  }

  return {
    nb: "Vi ønsker at oppholdet ditt skal bli best mulig. Meld fra om noe ikke er som det skal, så følger vi opp og holder deg oppdatert.",
    en: "We want your stay to be as good as possible. Let us know if something is not right and we will follow up and keep you posted.",
  };
}

function getServiceloftetekst(bransje: string): { nb: string; en: string } {
  if (bransje === "RESTAURANT_SERVERING") {
    return {
      nb: "Vi svarer på alle tilbakemeldinger, og saker om mat og allergier håndteres umiddelbart.",
      en: "We respond to all feedback, and cases about food and allergies are handled immediately.",
    };
  }

  return {
    nb: "Vi svarer på alle tilbakemeldinger, og du kan følge saken din fra mobilen hele veien.",
    en: "We respond to all feedback, and you can follow your case from your phone all the way.",
  };
}

/**
 * Matforgiftning er kun relevant der virksomheten serverer mat.
 * Hjemmel: IK-mat § 2 – kravet gjelder virksomheter som omsetter næringsmidler.
 */
function getAktiveMeldingstyper(bransje: string): string[] {
  const serverererMat = ["HOTELL_OVERNATTING", "RESTAURANT_SERVERING", "ATTRAKSJON_OPPLEVELSE"];
  if (serverererMat.includes(bransje)) return [...GUEST_TYPE_VALUES];
  return GUEST_TYPE_VALUES.filter((type) => type !== "MATFORGIFTNING");
}

/**
 * Bygger startseksjoner for en ny tavle. Respekterer plangrenser slik at
 * kunden aldri får seksjoner de ikke har tilgang til.
 */
export function getBransjeSeedSections(
  bransje: string | null | undefined,
  plan: HmsTavlePlan
): SeedSection[] {
  if (!isReiselivBransje(bransje)) return [];

  const valgtBransje = bransje!;
  const sted = getStedsfelt(valgtBransje);
  const velkomst = getVelkomsttekst(valgtBransje);
  const serviceloftet = getServiceloftetekst(valgtBransje);

  const kandidater: Omit<SeedSection, "order">[] = [
    {
      type: "KONTAKTINFO",
      title: null,
      isVisible: true,
      displayMode: "SIDEBAR",
      config: {},
    },
    {
      type: "BEREDSKAPSPLAN",
      title: null,
      isVisible: true,
      displayMode: "KARUSELL",
      config: {},
    },
    {
      type: "GJEST_SKJEMA",
      title: null,
      isVisible: true,
      displayMode: "FOKUS",
      config: {
        welcomeText: velkomst.nb,
        welcomeTextEn: velkomst.en,
        showRoomField: true,
        roomLabel: sted.label,
        roomLabelEn: sted.labelEn,
        activeTypes: getAktiveMeldingstyper(valgtBransje),
        allowAttachments: true,
        slaKritiskMinutes: 60,
        slaHoyMinutes: 240,
        slaNormalMinutes: 1440,
        notifyEmails: [],
        notifySmsNumbers: [],
      },
    },
    {
      type: "GJESTESERVICE_STATUS",
      title: null,
      isVisible: true,
      displayMode: "KARUSELL",
      config: {
        servicePromise: serviceloftet.nb,
        servicePromiseEn: serviceloftet.en,
      },
    },
    {
      type: "LOVKRAV_SJEKKLISTE",
      title: null,
      isVisible: true,
      displayMode: "KARUSELL",
      config: {},
    },
  ];

  const limits = getPlanLimits(plan);

  return kandidater
    .filter((kandidat) => isSectionAllowed(plan, kandidat.type))
    .slice(0, limits.maxSections)
    .map((kandidat, index) => ({ ...kandidat, order: index }));
}
