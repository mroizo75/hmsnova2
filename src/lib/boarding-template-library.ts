/**
 * Standardmaler for onboarding og offboarding.
 *
 * Hjemmel (lovpålagte oppgaver):
 *   AML § 14-5 / § 14-6: skriftlig arbeidsavtale senest 7 dager
 *   AML § 3-2 + org.forskr. kap. 8 + IK-HMS § 5 nr. 2: opplæring og instruksjon
 *   AML § 2 A-6: varslingsrutiner skal være lett tilgjengelige
 *   AML § 6-2: verneombudets rolle skal være kjent
 *   AML § 15-15: sluttattest
 *   GDPR art. 13: informasjon ved innsamling av personopplysninger
 *   GDPR art. 5(1)e / art. 17: lagringsbegrensning og sletting (med bokføringsplikt)
 *   A-opplysningsloven: a-melding ved start og slutt
 *   OTP-loven: innmelding fra første arbeidsdag der plikten gjelder
 *   Yrkesskadeforsikringsloven: forsikring fra første arbeidsdag
 *   Brannforebyggingsforskriften: brannvern og rømning
 *
 * AML § 3-5 er personlig plikt for øverste leder – ikke generell nyansatt-opplæring.
 */

export type BoardingAssigneeRole = "EMPLOYEE" | "MANAGER" | "HR" | "IT";
export type BoardingTaskSeverity = "MANDATORY" | "RECOMMENDED";

export type BoardingLibraryTask = {
  sourceKey: string;
  title: string;
  description: string;
  assigneeRole: BoardingAssigneeRole;
  daysOffset: number;
  category: string;
  isRequired: boolean;
  legalRef?: string;
  severity: BoardingTaskSeverity;
  industryScope: string[];
};

export type BoardingLibraryTemplate = {
  sourceKey: "onboarding-standard" | "offboarding-standard";
  name: string;
  type: "ONBOARDING" | "OFFBOARDING";
  description: string;
  tasks: BoardingLibraryTask[];
};

const ALL = ["all"] as const;

const ONBOARDING_TASKS: BoardingLibraryTask[] = [
  {
    sourceKey: "onb-it-workplace",
    title: "Forbered arbeidsplass og IT-tilgang",
    description:
      "Sørg for pc, e-post, systemtilganger og arbeidsplass før første arbeidsdag.",
    assigneeRole: "IT",
    daysOffset: -7,
    category: "IT/Tilgang",
    isRequired: false,
    severity: "RECOMMENDED",
    industryScope: [...ALL],
  },
  {
    sourceKey: "onb-insurance",
    title: "Bekreft yrkesskadeforsikring",
    description:
      "Arbeidsgiver skal ha yrkesskadeforsikring som dekker arbeidstaker fra første arbeidsdag.",
    assigneeRole: "HR",
    daysOffset: -7,
    category: "Dokumenter",
    isRequired: true,
    legalRef: "Yrkesskadeforsikringsloven § 3",
    severity: "MANDATORY",
    industryScope: [...ALL],
  },
  {
    sourceKey: "onb-welcome",
    title: "Send velkomstinformasjon",
    description:
      "Send praktisk informasjon om første arbeidsdag, møtested, utstyr og kontaktperson.",
    assigneeRole: "HR",
    daysOffset: -3,
    category: "Sosialt",
    isRequired: false,
    severity: "RECOMMENDED",
    industryScope: [...ALL],
  },
  {
    sourceKey: "onb-contract",
    title: "Inngå skriftlig arbeidsavtale",
    description:
      "Skriftlig arbeidsavtale skal foreligge snarest mulig og senest sju dager etter oppstart. Ved ansettelse under én måned eller utleie skal avtalen inngås umiddelbart. Avtalen skal minst inneholde opplysningene i AML § 14-6.",
    assigneeRole: "HR",
    daysOffset: 0,
    category: "Dokumenter",
    isRequired: true,
    legalRef: "AML § 14-5 og § 14-6",
    severity: "MANDATORY",
    industryScope: [...ALL],
  },
  {
    sourceKey: "onb-privacy",
    title: "Gi personverninformasjon",
    description:
      "Informer den nyansatte om hvilke personopplysninger som behandles, formål, rettslig grunnlag, lagringstid og rettigheter.",
    assigneeRole: "HR",
    daysOffset: 0,
    category: "Dokumenter",
    isRequired: true,
    legalRef: "GDPR art. 13",
    severity: "MANDATORY",
    industryScope: [...ALL],
  },
  {
    sourceKey: "onb-a-melding",
    title: "Registrer arbeidsforhold i a-meldingen",
    description:
      "Nytt arbeidsforhold skal rapporteres i a-meldingen. Best practice er å registrere umiddelbart, senest innen ordinær frist den 5. i påfølgende måned.",
    assigneeRole: "HR",
    daysOffset: 0,
    category: "Dokumenter",
    isRequired: true,
    legalRef: "A-opplysningsloven",
    severity: "MANDATORY",
    industryScope: [...ALL],
  },
  {
    sourceKey: "onb-otp",
    title: "Meld inn i tjenestepensjon (OTP)",
    description:
      "Der virksomheten er OTP-pliktig skal arbeidstaker som fyller vilkårene meldes inn med virkning fra første arbeidsdag.",
    assigneeRole: "HR",
    daysOffset: 0,
    category: "Dokumenter",
    isRequired: true,
    legalRef: "OTP-loven / tjenestepensjonsloven § 3-3",
    severity: "MANDATORY",
    industryScope: [...ALL],
  },
  {
    sourceKey: "onb-keys",
    title: "Utlevere nøkler og adgangskort",
    description: "Utlever nødvendig adgang og registrer utstyret.",
    assigneeRole: "IT",
    daysOffset: 0,
    category: "IT/Tilgang",
    isRequired: false,
    severity: "RECOMMENDED",
    industryScope: [...ALL],
  },
  {
    sourceKey: "onb-tour",
    title: "Velkomst, omvisning og arbeidsoppgaver",
    description:
      "Nyansatte skal få tydelig informasjon om hvilke oppgaver som skal utføres, hvilken opplæring som kreves, og hvem som gir instruksjon.",
    assigneeRole: "MANAGER",
    daysOffset: 0,
    category: "Sosialt",
    isRequired: true,
    legalRef: "AML § 3-2",
    severity: "MANDATORY",
    industryScope: [...ALL],
  },
  {
    sourceKey: "onb-hms-intro",
    title: "HMS-introduksjon og sikkerhetsopplæring",
    description:
      "Gi nødvendig opplæring, øvelse og instruksjon. Gjøre kjent med ulykkes- og helsefarer, interne rutiner, sikkerhetsregler, beredskap og personlig verneutstyr. Opplæringen skal dokumenteres.",
    assigneeRole: "MANAGER",
    daysOffset: 1,
    category: "HMS",
    isRequired: true,
    legalRef: "AML § 3-2, org.forskr. kap. 8, IK-HMS § 5 nr. 2",
    severity: "MANDATORY",
    industryScope: [...ALL],
  },
  {
    sourceKey: "onb-fire",
    title: "Brannvern, rømningsveier og førstehjelp",
    description:
      "Vis rømningsveier, møteplass, slokkeutstyr og førstehjelpsutstyr. Gå gjennom hva den ansatte skal gjøre ved brann eller ulykke.",
    assigneeRole: "MANAGER",
    daysOffset: 0,
    category: "HMS",
    isRequired: true,
    legalRef: "Brannforebyggingsforskriften § 8",
    severity: "MANDATORY",
    industryScope: [...ALL],
  },
  {
    sourceKey: "onb-whistleblowing",
    title: "Gjennomgå varslingsrutiner",
    description:
      "Virksomheter med minst fem arbeidstakere skal ha skriftlige varslingsrutiner. Rutinene skal være lett tilgjengelige for alle ansatte og gjennomgås ved oppstart.",
    assigneeRole: "MANAGER",
    daysOffset: 1,
    category: "HMS",
    isRequired: true,
    legalRef: "AML § 2 A-6",
    severity: "MANDATORY",
    industryScope: [...ALL],
  },
  {
    sourceKey: "onb-handbook",
    title: "Gjennomgå HMS-håndbok og internkontrollrutiner",
    description:
      "Arbeidstakerne skal ha tilstrekkelige kunnskaper om det systematiske HMS-arbeidet, inkludert virksomhetens rutiner og mål.",
    assigneeRole: "EMPLOYEE",
    daysOffset: 1,
    category: "HMS",
    isRequired: true,
    legalRef: "IK-HMS § 5 nr. 2",
    severity: "MANDATORY",
    industryScope: [...ALL],
  },
  {
    sourceKey: "onb-safety-rep",
    title: "Informer om verneombud og medvirkning",
    description:
      "Gjør kjent hvem som er verneombud, hvordan vernearbeidet er organisert, og arbeidstakers medvirkningsplikt.",
    assigneeRole: "MANAGER",
    daysOffset: 1,
    category: "HMS",
    isRequired: true,
    legalRef: "AML § 6-2 og § 2-3",
    severity: "MANDATORY",
    industryScope: [...ALL],
  },
  {
    sourceKey: "onb-hours",
    title: "Informer om arbeidstid, pauser og overtid",
    description:
      "Gå gjennom arbeidstidsordning, pauser, hviletid og regler for overtid som gjelder stillingen.",
    assigneeRole: "MANAGER",
    daysOffset: 1,
    category: "Dokumenter",
    isRequired: true,
    legalRef: "AML kap. 10",
    severity: "MANDATORY",
    industryScope: [...ALL],
  },
  {
    sourceKey: "onb-systems",
    title: "Opplæring i systemer som brukes i arbeidet",
    description:
      "Gi opplæring i datasystemer og verktøy som brukes til å planlegge og utføre arbeidet.",
    assigneeRole: "MANAGER",
    daysOffset: 3,
    category: "IT/Tilgang",
    isRequired: false,
    legalRef: "AML § 4-2",
    severity: "RECOMMENDED",
    industryScope: [...ALL],
  },
  {
    sourceKey: "onb-team",
    title: "Introduksjon til team og samarbeidspartnere",
    description: "Presenter kolleger, nøkkelkontakter og hvordan samarbeidet er organisert.",
    assigneeRole: "MANAGER",
    daysOffset: 3,
    category: "Sosialt",
    isRequired: false,
    severity: "RECOMMENDED",
    industryScope: [...ALL],
  },
  {
    sourceKey: "onb-contract-confirm",
    title: "Bekreft at arbeidsavtalen er signert",
    description:
      "Kontroller at skriftlig arbeidsavtale er på plass innen sju dager etter oppstart.",
    assigneeRole: "HR",
    daysOffset: 7,
    category: "Dokumenter",
    isRequired: true,
    legalRef: "AML § 14-5",
    severity: "MANDATORY",
    industryScope: [...ALL],
  },
  {
    sourceKey: "onb-followup-14",
    title: "Oppfølgingssamtale etter 2 uker",
    description: "Sjekk at opplæring, tilganger og arbeidsoppgaver fungerer.",
    assigneeRole: "MANAGER",
    daysOffset: 14,
    category: "Sosialt",
    isRequired: false,
    severity: "RECOMMENDED",
    industryScope: [...ALL],
  },
  {
    sourceKey: "onb-followup-30",
    title: "Oppfølgingssamtale etter 1 måned",
    description: "Følg opp kompetanse, arbeidsmiljø og behov for mer opplæring.",
    assigneeRole: "MANAGER",
    daysOffset: 30,
    category: "Sosialt",
    isRequired: false,
    severity: "RECOMMENDED",
    industryScope: [...ALL],
  },
  {
    sourceKey: "onb-followup-60",
    title: "Oppfølgingssamtale etter 2 måneder",
    description: "Vurder om opplæringen er tilstrekkelig og om arbeidsforholdet er forsvarlig.",
    assigneeRole: "MANAGER",
    daysOffset: 60,
    category: "Sosialt",
    isRequired: false,
    severity: "RECOMMENDED",
    industryScope: [...ALL],
  },
  {
    sourceKey: "onb-probation",
    title: "Evaluering av prøvetid",
    description:
      "Gjennomfør evaluering før utløp av avtalt prøvetid. Prøvetid og oppsigelsesfrist i prøvetiden skal fremgå av arbeidsavtalen.",
    assigneeRole: "MANAGER",
    daysOffset: 90,
    category: "Dokumenter",
    isRequired: false,
    legalRef: "AML § 15-6, § 14-6",
    severity: "RECOMMENDED",
    industryScope: [...ALL],
  },
  {
    sourceKey: "onb-leader-hms",
    title: "HMS-opplæring for leder (dersom nyansatt er leder)",
    description:
      "Øverste leder har personlig plikt til HMS-opplæring som ikke kan delegeres. Gjelder bare hvis den nyansatte er daglig leder eller tilsvarende.",
    assigneeRole: "HR",
    daysOffset: 30,
    category: "HMS",
    isRequired: false,
    legalRef: "AML § 3-5",
    severity: "RECOMMENDED",
    industryScope: [...ALL],
  },
  {
    sourceKey: "onb-halfyear",
    title: "Halvårsevaluering",
    description: "Følg opp utvikling, arbeidsmiljø og kompetanse etter seks måneder.",
    assigneeRole: "MANAGER",
    daysOffset: 180,
    category: "Sosialt",
    isRequired: false,
    severity: "RECOMMENDED",
    industryScope: [...ALL],
  },
  {
    sourceKey: "onb-hms-kort",
    title: "Utsted eller kontroller HMS-kort",
    description:
      "Alle som utfører arbeid på bygge- eller anleggsplass skal ha gyldig HMS-kort. Kortet skal bæres synlig.",
    assigneeRole: "HR",
    daysOffset: 0,
    category: "HMS",
    isRequired: true,
    legalRef: "Forskrift om HMS-kort § 4",
    severity: "MANDATORY",
    industryScope: ["construction"],
  },
  {
    sourceKey: "onb-sha",
    title: "Gjennomgå SHA-plan og plasspesifikke farer",
    description:
      "Gjøre den nyansatte kjent med SHA-plan, risikoforhold på plassen og gjeldende sikkerhetsrutiner før arbeid starter.",
    assigneeRole: "MANAGER",
    daysOffset: 0,
    category: "HMS",
    isRequired: true,
    legalRef: "Byggherreforskriften § 8 og § 9",
    severity: "MANDATORY",
    industryScope: ["construction"],
  },
  {
    sourceKey: "onb-ppe",
    title: "Opplæring i personlig verneutstyr",
    description:
      "Gi opplæring i riktig bruk, vedlikehold og begrensninger for påkrevd verneutstyr.",
    assigneeRole: "MANAGER",
    daysOffset: 0,
    category: "HMS",
    isRequired: true,
    legalRef: "Forskrift om utførelse av arbeid kap. 3",
    severity: "MANDATORY",
    industryScope: ["construction", "manufacturing", "bergverk", "offshore", "oil_gas", "elektro"],
  },
  {
    sourceKey: "onb-hygiene",
    title: "Hygieneopplæring og IK-mat",
    description:
      "Gi opplæring i hygiene, håndtering av næringsmidler og virksomhetens internkontroll for mattrygghet.",
    assigneeRole: "MANAGER",
    daysOffset: 1,
    category: "HMS",
    isRequired: true,
    legalRef: "IK-mat § 5, forordning 852/2004",
    severity: "MANDATORY",
    industryScope: ["hospitality"],
  },
  {
    sourceKey: "onb-alcohol",
    title: "Opplæring i skjenking og alderskontroll",
    description:
      "Gå gjennom alderskontroll, beruselse og bortvisning dersom den ansatte skal servere alkohol.",
    assigneeRole: "MANAGER",
    daysOffset: 1,
    category: "HMS",
    isRequired: true,
    legalRef: "Alkoholloven § 1-7c, alkoholforskriften § 8-3",
    severity: "MANDATORY",
    industryScope: ["hospitality"],
  },
  {
    sourceKey: "onb-confidentiality",
    title: "Taushetsplikt og personvern i helsetjenesten",
    description:
      "Gjennomgå taushetsplikt, journaltilgang og smittevernrutiner før pasientenært arbeid.",
    assigneeRole: "MANAGER",
    daysOffset: 0,
    category: "HMS",
    isRequired: true,
    legalRef: "Helsepersonelloven § 21, AML § 3-2",
    severity: "MANDATORY",
    industryScope: ["healthcare"],
  },
  {
    sourceKey: "onb-fse",
    title: "FSE-opplæring og elsikkerhet",
    description:
      "Kontroller at FSE-opplæring er gyldig før arbeid på eller nær elektriske anlegg.",
    assigneeRole: "HR",
    daysOffset: 0,
    category: "HMS",
    isRequired: true,
    legalRef: "FSE-forskriften",
    severity: "MANDATORY",
    industryScope: ["elektro"],
  },
];

const OFFBOARDING_TASKS: BoardingLibraryTask[] = [
  {
    sourceKey: "off-inform-team",
    title: "Informere team",
    description: "Informer berørte kolleger om fratreden og overføring av oppgaver.",
    assigneeRole: "MANAGER",
    daysOffset: -14,
    category: "Sosialt",
    isRequired: false,
    severity: "RECOMMENDED",
    industryScope: [...ALL],
  },
  {
    sourceKey: "off-knowledge",
    title: "Kunnskapsoverføring",
    description: "Sørg for at nøkkeloppgaver, tilganger og dokumentasjon overføres.",
    assigneeRole: "EMPLOYEE",
    daysOffset: -7,
    category: "Dokumenter",
    isRequired: false,
    severity: "RECOMMENDED",
    industryScope: [...ALL],
  },
  {
    sourceKey: "off-exit-talk",
    title: "Sluttsamtale",
    description: "Gjennomfør sluttsamtale for erfaringsoverføring og arbeidsmiljølæring.",
    assigneeRole: "MANAGER",
    daysOffset: -3,
    category: "Sosialt",
    isRequired: false,
    severity: "RECOMMENDED",
    industryScope: [...ALL],
  },
  {
    sourceKey: "off-equipment",
    title: "Innlevere utstyr",
    description: "Samle inn pc, telefon, verktøy og annet virksomhetens utstyr.",
    assigneeRole: "EMPLOYEE",
    daysOffset: -1,
    category: "Utstyr",
    isRequired: false,
    severity: "RECOMMENDED",
    industryScope: [...ALL],
  },
  {
    sourceKey: "off-keys",
    title: "Innlevere nøkler og adgangskort",
    description: "Inndra nøkler, adgangskort og HMS-kort der det er aktuelt.",
    assigneeRole: "EMPLOYEE",
    daysOffset: -1,
    category: "Utstyr",
    isRequired: false,
    severity: "RECOMMENDED",
    industryScope: [...ALL],
  },
  {
    sourceKey: "off-it-access",
    title: "Stenge IT-tilgang og kontoer",
    description:
      "Fjern tilganger samme dag som arbeidsforholdet opphører for å begrense behandling av personopplysninger og beskytte virksomhetens data.",
    assigneeRole: "IT",
    daysOffset: 0,
    category: "IT/Tilgang",
    isRequired: true,
    legalRef: "GDPR art. 5(1)f",
    severity: "MANDATORY",
    industryScope: [...ALL],
  },
  {
    sourceKey: "off-payroll",
    title: "Sluttoppgjør og feriepenger",
    description:
      "Gjør opp lønn, feriepenger og andre ytelser i tråd med ferieloven og arbeidsavtalen.",
    assigneeRole: "HR",
    daysOffset: 0,
    category: "Dokumenter",
    isRequired: true,
    legalRef: "Ferieloven § 11",
    severity: "MANDATORY",
    industryScope: [...ALL],
  },
  {
    sourceKey: "off-certificate",
    title: "Utstede sluttattest",
    description:
      "Arbeidstaker kan kreve sluttattest. Attesten skal minst inneholde navn, fødselsdato, hva arbeidet har bestått i og arbeidsforholdets varighet. Best practice er å utstede attesten uten at den ansatte må etterspørre den.",
    assigneeRole: "HR",
    daysOffset: 0,
    category: "Dokumenter",
    isRequired: true,
    legalRef: "AML § 15-15",
    severity: "MANDATORY",
    industryScope: [...ALL],
  },
  {
    sourceKey: "off-a-melding",
    title: "Meld fra om avsluttet arbeidsforhold",
    description: "Oppdater a-meldingen med sluttdato for arbeidsforholdet.",
    assigneeRole: "HR",
    daysOffset: 0,
    category: "Dokumenter",
    isRequired: true,
    legalRef: "A-opplysningsloven",
    severity: "MANDATORY",
    industryScope: [...ALL],
  },
  {
    sourceKey: "off-otp",
    title: "Meld ut av tjenestepensjon",
    description: "Oppdater pensjonsleverandør om at arbeidsforholdet er avsluttet.",
    assigneeRole: "HR",
    daysOffset: 0,
    category: "Dokumenter",
    isRequired: true,
    legalRef: "OTP-loven",
    severity: "MANDATORY",
    industryScope: [...ALL],
  },
  {
    sourceKey: "off-gdpr",
    title: "Begrens og arkiver personopplysninger",
    description:
      "Slett eller begrens personopplysninger som ikke lenger er nødvendige. Lønn, skatt og bokføringspliktige opplysninger skal likevel oppbevares så lenge loven krever det.",
    assigneeRole: "HR",
    daysOffset: 7,
    category: "Dokumenter",
    isRequired: true,
    legalRef: "GDPR art. 5(1)e og art. 17",
    severity: "MANDATORY",
    industryScope: [...ALL],
  },
  {
    sourceKey: "off-access-check",
    title: "Kontroller at alle tilganger er fjernet",
    description: "Etterkontroll av systemer, nøkler og eksterne tjenester.",
    assigneeRole: "IT",
    daysOffset: 30,
    category: "IT/Tilgang",
    isRequired: false,
    severity: "RECOMMENDED",
    industryScope: [...ALL],
  },
];

export const BOARDING_TEMPLATE_LIBRARY: BoardingLibraryTemplate[] = [
  {
    sourceKey: "onboarding-standard",
    name: "Standard onboarding",
    type: "ONBOARDING",
    description:
      "Lovpålagt og anbefalt sjekkliste for nye ansatte. Lovpålagte oppgaver er merket med hjemmel.",
    tasks: ONBOARDING_TASKS,
  },
  {
    sourceKey: "offboarding-standard",
    name: "Standard offboarding",
    type: "OFFBOARDING",
    description:
      "Sjekkliste for avslutning av arbeidsforhold, inkludert sluttattest, a-melding og personvern.",
    tasks: OFFBOARDING_TASKS,
  },
];

export function tasksForIndustry(
  tasks: BoardingLibraryTask[],
  industry: string | null | undefined
): BoardingLibraryTask[] {
  const normalized = industry?.trim().toLowerCase() ?? null;
  return tasks.filter((task) => {
    if (task.industryScope.includes("all")) return true;
    if (!normalized) return false;
    return task.industryScope.includes(normalized);
  });
}

export function getBoardingTemplateLibrary(
  industry?: string | null
): BoardingLibraryTemplate[] {
  return BOARDING_TEMPLATE_LIBRARY.map((template) => ({
    ...template,
    tasks: tasksForIndustry(template.tasks, industry),
  }));
}
