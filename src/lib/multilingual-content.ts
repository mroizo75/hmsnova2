/**
 * Flerspråklig nøkkelinnhold for HMS Nova.
 * Prioriterte språk: norsk (nb), engelsk (en).
 * Brukes for onboarding-sjekkliste, nøkkelrutiner og HMS-tavle offentlig visning.
 *
 * Lovforankring:
 * - AML § 4-2 (tilrettelegging, informasjon)
 * - HMS-forskriften § 5 (medvirkning, forståelse)
 */

export type SupportedLocale = "nb" | "en";

export interface TranslatedContent {
  nb: string;
  en: string;
}

// ---------------------------------------------------------------------------
// Onboarding-sjekkliste
// ---------------------------------------------------------------------------

export interface OnboardingChecklistItem {
  id: string;
  category: string;
  text: TranslatedContent;
  required: boolean;
}

export const ONBOARDING_CHECKLIST: OnboardingChecklistItem[] = [
  // Brann og evakuering
  {
    id: "fire-exits",
    category: "Brann / Fire",
    text: { nb: "Rømningsveier og nødutganger er vist frem og forstått", en: "Fire exits and emergency exits have been shown and understood" },
    required: true,
  },
  {
    id: "fire-alarm",
    category: "Brann / Fire",
    text: { nb: "Brannalarm og møteplass ved evakuering er gjennomgått", en: "Fire alarm and assembly point for evacuation have been reviewed" },
    required: true,
  },
  {
    id: "fire-extinguisher",
    category: "Brann / Fire",
    text: { nb: "Brannslokkingsutstyr er vist og bruk gjennomgått", en: "Fire extinguisher location and use have been demonstrated" },
    required: true,
  },
  // Ulykker og førstehjelp
  {
    id: "first-aid-location",
    category: "Førstehjelp / First aid",
    text: { nb: "Plassering av førstehjelpsskap er kjent", en: "Location of first aid kit is known" },
    required: true,
  },
  {
    id: "first-aid-contact",
    category: "Førstehjelp / First aid",
    text: { nb: "Nødnummer og nærmeste lege/sykehus er kjent", en: "Emergency numbers and nearest doctor/hospital are known" },
    required: true,
  },
  {
    id: "accident-reporting",
    category: "Førstehjelp / First aid",
    text: { nb: "Prosedyre for ulykker og skader er gjennomgått (AML § 5-2)", en: "Procedure for accidents and injuries has been reviewed (AML § 5-2)" },
    required: true,
  },
  // Vold og trusler
  {
    id: "violence-procedure",
    category: "Vold og trusler / Violence and threats",
    text: { nb: "Rutine for håndtering av vold og trusler er gjennomgått", en: "Procedure for handling violence and threats has been reviewed" },
    required: true,
  },
  {
    id: "alarm-button",
    category: "Vold og trusler / Violence and threats",
    text: { nb: "Trygghetsalarm / nødknapp er kjent (hvis aktuelt)", en: "Panic alarm / emergency button is known (if applicable)" },
    required: false,
  },
  // HMS generelt
  {
    id: "safety-officer",
    category: "HMS / HSE",
    text: { nb: "Verneombud er presentert og kontaktinfo er kjent", en: "Safety representative has been introduced and contact info is known" },
    required: true,
  },
  {
    id: "chemical-hazards",
    category: "HMS / HSE",
    text: { nb: "Kjemikalier i arbeidsstedet og sikkerhetsdatablader er gjennomgått", en: "Chemicals at the workplace and safety data sheets have been reviewed" },
    required: false,
  },
  {
    id: "ppe",
    category: "HMS / HSE",
    text: { nb: "Personlig verneutstyr (PVU) er utdelt og bruk forklart", en: "Personal protective equipment (PPE) has been issued and use explained" },
    required: false,
  },
  {
    id: "incident-reporting",
    category: "HMS / HSE",
    text: { nb: "Avvikssystem og rapporteringsrutine er gjennomgått", en: "Incident reporting system and procedure have been reviewed" },
    required: true,
  },
];

// ---------------------------------------------------------------------------
// Nøkkelrutiner
// ---------------------------------------------------------------------------

export interface KeyRoutineTranslation {
  id: string;
  title: TranslatedContent;
  steps: TranslatedContent[];
  legalRef?: string;
}

export const KEY_ROUTINE_TRANSLATIONS: KeyRoutineTranslation[] = [
  {
    id: "fire-evacuation",
    legalRef: "AML § 5-2, Brann- og eksplosjonsvernloven § 6",
    title: { nb: "Brann og evakuering", en: "Fire and evacuation" },
    steps: [
      { nb: "Aktiver brannalarm og varsle alle i bygget", en: "Activate the fire alarm and warn everyone in the building" },
      { nb: "Ring 110 (brannvesen) straks", en: "Call 110 (fire brigade) immediately" },
      { nb: "Evakuer via nærmeste rømningsvei – bruk aldri heis", en: "Evacuate via the nearest emergency exit – never use the elevator" },
      { nb: "Møt på angitt møteplass og sjekk av alle ansatte og gjester", en: "Assemble at the designated meeting point and check off all staff and guests" },
      { nb: "Forsøk kun å slukke brannen dersom det er trygt og uten risiko for deg selv", en: "Attempt to extinguish the fire only if it is safe and poses no risk to yourself" },
    ],
  },
  {
    id: "violence-threat",
    legalRef: "AML § 4-3 (3), § 3-3 nr. 3",
    title: { nb: "Vold og trusler", en: "Violence and threats" },
    steps: [
      { nb: "Behold roen og unngå konfrontasjon", en: "Stay calm and avoid confrontation" },
      { nb: "Aktiver nødknapp / trygghetsalarm hvis tilgjengelig", en: "Activate panic alarm / emergency button if available" },
      { nb: "Forsøk å roe ned situasjonen med rolig tale", en: "Try to de-escalate the situation with calm speech" },
      { nb: "Tilkall hjelp fra kollega/leder diskret", en: "Discretely call for help from a colleague/manager" },
      { nb: "Ring 112 (politi) om du er i umiddelbar fare", en: "Call 112 (police) if you are in immediate danger" },
      { nb: "Rapporter hendelsen til leder og i avvikssystemet", en: "Report the incident to your manager and in the incident reporting system" },
    ],
  },
  {
    id: "accident",
    legalRef: "AML § 5-2, § 2-3",
    title: { nb: "Ulykke og personskade", en: "Accident and personal injury" },
    steps: [
      { nb: "Sikre skadestedet og varsle kollegaer", en: "Secure the scene and alert colleagues" },
      { nb: "Ring 113 (ambulanse) ved alvorlig skade", en: "Call 113 (ambulance) for serious injury" },
      { nb: "Yte førstehjelp inntil helsepersonell ankommer", en: "Provide first aid until medical personnel arrive" },
      { nb: "Varsle leder / verneombud umiddelbart", en: "Notify manager / safety representative immediately" },
      { nb: "Registrer hendelsen i avvikssystemet (AML § 5-2)", en: "Register the incident in the incident reporting system (AML § 5-2)" },
      { nb: "Ved alvorlig personskade: varsle Arbeidstilsynet uten ugrunnet opphold", en: "For serious injury: notify the Labour Inspection Authority without undue delay" },
    ],
  },
];

// ---------------------------------------------------------------------------
// HMS-tavle offentlig visning – oversatte seksjonstekster
// ---------------------------------------------------------------------------

export interface TavlePublicTranslation {
  sectionKey: string;
  title: TranslatedContent;
  description?: TranslatedContent;
}

export const TAVLE_PUBLIC_TRANSLATIONS: TavlePublicTranslation[] = [
  {
    sectionKey: "MANNSKAP",
    title: { nb: "Personell på vakt", en: "Staff on duty" },
    description: { nb: "Oversikt over personell på vakt i dag", en: "Overview of staff on duty today" },
  },
  {
    sectionKey: "NODETATER",
    title: { nb: "Nødetater", en: "Emergency services" },
    description: { nb: "Viktige nødnumre og kontakter", en: "Important emergency numbers and contacts" },
  },
  {
    sectionKey: "SNARVEIER",
    title: { nb: "Snarveier", en: "Quick links" },
  },
  {
    sectionKey: "LOVKRAV",
    title: { nb: "HMS-krav", en: "HSE requirements" },
    description: { nb: "Aktuelle lovkrav og sjekkpunkter", en: "Current legal requirements and checkpoints" },
  },
  {
    sectionKey: "GJEST_SKJEMA",
    title: { nb: "Meld fra", en: "Report an issue" },
    description: {
      nb: "Har du observert noe farlig, eller vil du gi tilbakemelding? Meld fra her.",
      en: "Have you observed something dangerous, or would you like to give feedback? Report it here.",
    },
  },
  {
    sectionKey: "RIGGPLAN",
    title: { nb: "Riggplan / Plantegning", en: "Site plan / Floor plan" },
  },
  {
    sectionKey: "VARSEL",
    title: { nb: "Aktive varsler", en: "Active alerts" },
  },
  {
    sectionKey: "EKSTERNLENKE",
    title: { nb: "Eksterne lenker", en: "External links" },
  },
];

// ---------------------------------------------------------------------------
// Hjelpefunksjon
// ---------------------------------------------------------------------------

export function getTranslation(content: TranslatedContent, locale: SupportedLocale): string {
  return content[locale] ?? content.nb;
}
