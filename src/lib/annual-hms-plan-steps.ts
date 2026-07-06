/**
 * Definisjon av stegene i den årlige HMS-planen (sjekkliste).
 * Dekker norske og EU-krav slik at bedriften kan huke av steg for steg
 * og vite at alle krav er oppfylt når listen er fullført.
 */

export interface AnnualHmsPlanStep {
  key: string;
  title: string;
  description: string;
  category: "ledelse" | "risiko" | "dokumenter" | "kontroll" | "opplæring" | "oppfølging" | "personell" | "annen";
  order: number;
  href: string | null;
  legalRef?: string;
}

export const ANNUAL_HMS_PLAN_STEPS: AnnualHmsPlanStep[] = [
  {
    key: "management_review",
    title: "Ledelsens gjennomgang gjennomført",
    description: "Minst én ledelsens gjennomgang i året. Gjennomgå mål, avvik, risiko, revisjoner og ressurser.",
    category: "ledelse",
    order: 1,
    href: "/dashboard/management-reviews",
    legalRef: "ISO 45001/9001/14001 kap. 9.3, AML § 3-1",
  },
  {
    key: "risk_assessment",
    title: "Årlig risikovurdering oppdatert",
    description: "Risikovurdering for arbeidsmiljøet er gjennomført eller oppdatert (fysisk, kjemisk, ergonomi, psykososialt).",
    category: "risiko",
    order: 2,
    href: "/dashboard/risks",
    legalRef: "AML § 4-1, Internkontrollforskriften § 5",
  },
  {
    key: "hms_goals",
    title: "HMS-mål satt og gjennomgått",
    description: "HMS-mål for året er definert, målt og gjennomgått i ledelsen.",
    category: "ledelse",
    order: 3,
    href: "/dashboard/goals",
    legalRef: "ISO 45001 kap. 6.2",
  },
  {
    key: "document_review",
    title: "Dokumenter revidert (håndbok, prosedyrer)",
    description: "Relevante HMS-dokumenter (håndbok, prosedyrer, instrukser) er gjennomgått og oppdatert minst årlig.",
    category: "dokumenter",
    order: 4,
    href: "/dashboard/documents",
    legalRef: "ISO 45001 kap. 7.5, AML systematisk arbeid",
  },
  {
    key: "chemical_inventory",
    title: "Stoffkartotek og kjemikalier revidert",
    description: "Stoffkartotek og sikkerhetsdatablad (SDS) er gjennomgått og oppdatert. Kjemikalieforskriften.",
    category: "dokumenter",
    order: 5,
    href: "/dashboard/chemicals",
    legalRef: "Kjemikalieforskriften, REACH/CLP",
  },
  {
    key: "inspections",
    title: "Vernerunder / inspeksjoner gjennomført",
    description: "Planlagte vernerunder eller HMS-inspeksjoner er gjennomført. Funn er dokumentert og fulgt opp.",
    category: "kontroll",
    order: 6,
    href: "/dashboard/inspections",
    legalRef: "AML § 6-2, systematisk kontroll",
  },
  {
    key: "internal_audit",
    title: "Internrevisjon av HMS gjennomført",
    description: "Internrevisjon av HMS-systemet eller relevante prosesser er gjennomført. Funn og tiltak dokumentert.",
    category: "kontroll",
    order: 7,
    href: "/dashboard/audits",
    legalRef: "ISO 45001 kap. 9.2",
  },
  {
    key: "training",
    title: "Opplæring og kompetansekrav oppdatert",
    description: "Opplæringsbehov er vurdert. Obligatorisk opplæring (førstehjelp, brann, etc.) er gjennomført og dokumentert.",
    category: "opplæring",
    order: 8,
    href: "/dashboard/training",
    legalRef: "AML § 4-2, HMS-forskriften",
  },
  {
    key: "incidents_followup",
    title: "Avvik og hendelser gjennomgått og tiltak lukket",
    description: "Åpne avvik og hendelser er gjennomgått. Tiltak er iverksatt og lukket der det er relevant.",
    category: "oppfølging",
    order: 9,
    href: "/dashboard/incidents",
    legalRef: "AML § 5-1, ISO 45001 kap. 10.2",
  },
  {
    key: "meetings_amu_vo",
    title: "AMU- og verneombudsmøter holdt",
    description: "AMU-møter og/eller verneombudsmøter er holdt. Referat er dokumentert.",
    category: "ledelse",
    order: 10,
    href: "/dashboard/meetings",
    legalRef: "AML § 7-2, OLM-forskriften",
  },
  {
    key: "actions_closed",
    title: "Tiltak fra forrige gjennomgang lukket",
    description: "Tiltak knyttet til ledelsens gjennomgang, revisjoner eller avvik er fulgt opp og lukket.",
    category: "oppfølging",
    order: 11,
    href: "/dashboard/actions",
    legalRef: "ISO 45001 kap. 10.2",
  },
  {
    key: "emergency_drill",
    title: "Beredskaps- / evakueringsøvelse gjennomført",
    description: "Evakuering eller annen beredskapsøvelse er gjennomført (hvis aktuelt for virksomheten).",
    category: "kontroll",
    order: 12,
    href: "/dashboard/inspections",
    legalRef: "Brannvernforskriften, AML",
  },
  {
    key: "whistleblowing",
    title: "Varslingskanal tilgjengelig og informert",
    description: "Varslingsordning er tilgjengelig og ansatte er informert om hvordan de kan varsle.",
    category: "annen",
    order: 13,
    href: "/dashboard/whistleblowing",
    legalRef: "Varslerloven, AML § 2A",
  },
  {
    key: "legal_changes",
    title: "Lov- og forskriftsendringer vurdert",
    description: "Relevante endringer i lover og forskrifter er vurdert og eventuelle tiltak iverksatt.",
    category: "annen",
    order: 14,
    href: null,
    legalRef: "Lovpålagt oppdatering",
  },
  {
    key: "plan_approved",
    title: "Årlig HMS-plan for året godkjent",
    description: "Ledelsen har godkjent at den årlige HMS-planen for året er gjennomført (sjekkliste fullført).",
    category: "ledelse",
    order: 15,
    href: null,
    legalRef: "Dokumentasjon av ansvar",
  },

  // ── Medarbeidersamtaler (AML § 4-2, § 4-3) ──────────────────────────────
  {
    key: "employee_reviews_conducted",
    title: "Medarbeidersamtaler gjennomført for alle ansatte",
    description:
      "Alle ansatte har hatt minst én medarbeidersamtale med sin leder i løpet av året. Samtalene dekker trivsel, psykososialt arbeidsmiljø, mål og kompetanseutvikling.",
    category: "personell",
    order: 16,
    href: "/dashboard/medarbeidersamtale",
    legalRef: "AML § 4-2 (2): faglig og personlig utvikling, AML § 4-3 (2026): psykososialt arbeidsmiljø",
  },
  {
    key: "employee_reviews_psyk",
    title: "Psykososialt arbeidsmiljø kartlagt via medarbeidersamtaler",
    description:
      "Alle fire psykososiale faktorer er vurdert i samtalene: krav og forventninger, emosjonelle krav, arbeidsmengde/tidspress og støtte/hjelp. Funn er fulgt opp.",
    category: "personell",
    order: 17,
    href: "/dashboard/medarbeidersamtale",
    legalRef: "AML § 4-3 (2)a–d (presisert 1. jan 2026)",
  },
  {
    key: "employee_reviews_actions_followed",
    title: "Tiltak fra medarbeidersamtaler fulgt opp",
    description:
      "Avtalte tiltak fra årets medarbeidersamtaler er dokumentert og fulgt opp. IK-HMS § 5: tiltak skal ha frist og ansvarlig.",
    category: "personell",
    order: 18,
    href: "/dashboard/medarbeidersamtale",
    legalRef: "IK-HMS § 5, AML § 4-2",
  },
  {
    key: "employee_reviews_signed",
    title: "Medarbeidersamtaler signert av begge parter",
    description:
      "Referat fra gjennomførte medarbeidersamtaler er bekreftet/signert av både leder og ansatt. Konfidensialitet ivaretas (GDPR art. 5).",
    category: "personell",
    order: 19,
    href: "/dashboard/medarbeidersamtale",
    legalRef: "GDPR art. 5 (konfidensialitet og dokumentasjon)",
  },
];

const categoryOrder: AnnualHmsPlanStep["category"][] = [
  "ledelse",
  "risiko",
  "dokumenter",
  "kontroll",
  "opplæring",
  "oppfølging",
  "personell",
  "annen",
];

export function getStepsByCategory(): Map<AnnualHmsPlanStep["category"], AnnualHmsPlanStep[]> {
  const map = new Map<AnnualHmsPlanStep["category"], AnnualHmsPlanStep[]>();
  const sorted = [...ANNUAL_HMS_PLAN_STEPS].sort((a, b) => a.order - b.order);
  for (const step of sorted) {
    const list = map.get(step.category) ?? [];
    list.push(step);
    map.set(step.category, list);
  }
  return map;
}

export function getCategoryLabel(category: AnnualHmsPlanStep["category"]): string {
  const labels: Record<AnnualHmsPlanStep["category"], string> = {
    ledelse: "Ledelse og gjennomgang",
    risiko: "Risiko og mål",
    dokumenter: "Dokumenter og stoffkartotek",
    kontroll: "Kontroll og revisjon",
    opplæring: "Opplæring",
    oppfølging: "Oppfølging av avvik og tiltak",
    personell: "Personell – medarbeidersamtaler (AML § 4-2, § 4-3)",
    annen: "Annet",
  };
  return labels[category];
}

export function getCategoryOrder(): AnnualHmsPlanStep["category"][] {
  return categoryOrder;
}
