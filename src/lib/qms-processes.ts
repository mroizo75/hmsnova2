/**
 * Prosessregister etter ISO 9001:2015 pkt. 4.4.
 * Forslagene er et utgangspunkt. Virksomheten tilpasser dem før de settes aktive.
 */

export const QMS_PROCESS_KINDS = ["STYRENDE", "HOVED", "STOTTE"] as const;
export type QmsProcessKindValue = (typeof QMS_PROCESS_KINDS)[number];

export const QMS_PROCESS_STATUSES = ["DRAFT", "ACTIVE", "OUT_OF_SCOPE", "ARCHIVED"] as const;
export type QmsProcessStatusValue = (typeof QMS_PROCESS_STATUSES)[number];

export const QMS_PROCESS_KIND_LABELS: Record<QmsProcessKindValue, string> = {
  STYRENDE: "Styrende",
  HOVED: "Hovedprosess",
  STOTTE: "Støtteprosess",
};

export const QMS_PROCESS_STATUS_LABELS: Record<QmsProcessStatusValue, string> = {
  DRAFT: "Utkast",
  ACTIVE: "Aktiv",
  OUT_OF_SCOPE: "Utenfor omfang",
  ARCHIVED: "Arkivert",
};

export const QMS_KIND_ORDER: QmsProcessKindValue[] = ["STYRENDE", "HOVED", "STOTTE"];

/** Moduler en prosess kan peke til. Tom streng betyr ingen kobling. */
export const QMS_MODULE_LINKS = [
  { href: "", label: "Ingen modul" },
  { href: "/dashboard/goals", label: "Mål" },
  { href: "/dashboard/management-reviews", label: "Ledelsens gjennomgang" },
  { href: "/dashboard/audits", label: "Revisjoner" },
  { href: "/dashboard/incidents", label: "Avvik og hendelser" },
  { href: "/dashboard/leverandorer", label: "Leverandører" },
  { href: "/dashboard/complaints", label: "Kundeklager" },
  { href: "/dashboard/hms-handbok", label: "Håndbok" },
  { href: "/dashboard/risks", label: "Risikovurdering" },
  { href: "/dashboard/training", label: "Kompetanse" },
  { href: "/dashboard/documents", label: "Dokumenter" },
  { href: "/dashboard/rutiner", label: "Rutiner" },
  { href: "/dashboard/sja", label: "SJA" },
] as const;

export type QmsModuleHref = (typeof QMS_MODULE_LINKS)[number]["href"];

export type QmsProcessStepInput = {
  title: string;
  description?: string;
};

export type QmsProcessRecordInput = {
  name: string;
  status: QmsProcessStatusValue;
  purpose: string;
  inputs: string;
  outputs: string;
  criteria: string;
  resources: string;
  risksAndOpportunities: string;
  scopeReason: string;
  ownerId: string;
  nextReviewAt: string;
  steps: QmsProcessStepInput[];
};

export type QmsProcessStarter = {
  sourceKey: string;
  name: string;
  kind: QmsProcessKindValue;
  sortOrder: number;
  purpose: string;
  inputs: string;
  outputs: string;
  criteria: string;
  resources: string;
  risksAndOpportunities: string;
  moduleHref: QmsModuleHref;
  deliversTo: string[];
  steps: QmsProcessStepInput[];
};

export const QMS_PROCESS_STARTERS: QmsProcessStarter[] = [
  {
    sourceKey: "ledelse",
    name: "Ledelse og forbedring",
    kind: "STYRENDE",
    sortOrder: 10,
    purpose: "Sette retning for styringssystemet, følge opp mål og sørge for at avvik og revisjon fører til forbedring.",
    inputs: "Kundekrav, lovkrav, måleresultater, avvik, revisjonsfunn og tilbakemelding fra øvrige prosesser.",
    outputs: "Beslutninger, mål, prioriterte tiltak og endringer i prosessene.",
    criteria: "Mål er kjent og følges opp. Ledelsens gjennomgang holdes minst årlig. Avvik som kan gjenta seg, får korrigerende tiltak.",
    resources: "Daglig leder, prosesseiere og tid til gjennomgang.",
    risksAndOpportunities: "Risiko: mål og avvik blir ikke fulgt opp. Mulighet: erfaring fra leveranser brukes til å forbedre prosessene.",
    moduleHref: "/dashboard/management-reviews",
    deliversTo: ["salg", "utforming", "hms", "innkjop", "levering", "installasjon", "kompetanse"],
    steps: [
      { title: "Sett og følg opp mål", description: "Kvalitets- og HMS-mål gjennomgås minst årlig." },
      { title: "Behandle avvik og korrigerende tiltak", description: "Årsak rettes der forholdet kan gjenta seg." },
      { title: "Gjennomfør internrevisjon", description: "Revisjonen dekker prosessene som er i bruk." },
      { title: "Hold ledelsens gjennomgang", description: "Beslutninger og endringer dokumenteres." },
    ],
  },
  {
    sourceKey: "salg",
    name: "Salg og kundekrav",
    kind: "HOVED",
    sortOrder: 20,
    purpose: "Forstå og bekrefte kravene til det som skal leveres, før arbeidet starter.",
    inputs: "Forespørsel fra kunde, rammeavtale og lovkrav som gjelder leveransen.",
    outputs: "Bekreftet avtale med krav til produkt, tjeneste, tid og dokumentasjon.",
    criteria: "Krav er avklart og bekreftet før utførelse. Endringer i krav er sporbar. Avvik fra avtale registreres.",
    resources: "Den som har kundekontakt, og tilgang til gjeldende rutine for tilbud og avtale.",
    risksAndOpportunities: "Risiko: arbeidet starter på uklare krav. Mulighet: tydelige krav gir færre reklamasjoner.",
    moduleHref: "/dashboard/complaints",
    deliversTo: ["utforming", "levering"],
    steps: [
      { title: "Avklar kundens krav", description: "Inkluder lovkrav og det kunden ikke har sagt, men som leveransen forutsetter." },
      { title: "Bekreft tilbud eller avtale", description: "Krav til resultat, tid og dokumentasjon skal være kjent." },
      { title: "Håndter endring i krav", description: "Endringen vurderes før den godtas, og berørte prosesser informeres." },
    ],
  },
  {
    sourceKey: "utforming",
    name: "Utforming og utvikling",
    kind: "HOVED",
    sortOrder: 30,
    purpose: "Omsette kundekrav til en løsning som kan kjøpes inn, produseres, installeres eller leveres. Merk prosessen utenfor omfang dersom virksomheten ikke utformer egne løsninger.",
    inputs: "Bekreftede kundekrav og gjeldende regelverk for løsningen.",
    outputs: "Underlag som utførelse, innkjøp og installasjon kan arbeide etter.",
    criteria: "Inngangskrav er gjennomgått. Løsningen er verifisert mot kravene før den frigis til utførelse.",
    resources: "Fagperson med ansvar for utforming, og tid til gjennomgang før frigivelse.",
    risksAndOpportunities: "Risiko: løsningen oppfyller ikke kravene. Mulighet: feil oppdages før innkjøp og installasjon.",
    moduleHref: "",
    deliversTo: ["innkjop", "levering"],
    steps: [
      { title: "Planlegg utformingen", description: "Avklar hvem som gjennomgår og hvem som frigi." },
      { title: "Fastsett inngangskrav", description: "Kundekrav, lovkrav og egne krav samles før arbeidet starter." },
      { title: "Verifiser og frigi", description: "Løsningen slippes til innkjøp og utførelse når kravene er innfridd." },
    ],
  },
  {
    sourceKey: "innkjop",
    name: "Innkjøp",
    kind: "HOVED",
    sortOrder: 40,
    purpose: "Sikre at varer og tjenester som påvirker leveransen, kjøpes fra leverandører som kan oppfylle kravene.",
    inputs: "Krav til det som skal kjøpes, fra avtale, utforming eller drift.",
    outputs: "Mottatt vare eller tjeneste som er kontrollert mot kravene.",
    criteria: "Krav er kjent for leverandøren før bestilling. Leverandøren er vurdert. Mottak kontrolleres. Re-evaluering skjer innen avtalt dato.",
    resources: "Innkjøpsansvarlig og leverandørregisteret.",
    risksAndOpportunities: "Risiko: feil vare eller ukvalifisert leverandør. Mulighet: stabile leverandører gir jevnere leveranse.",
    moduleHref: "/dashboard/leverandorer",
    deliversTo: ["levering", "installasjon"],
    steps: [
      { title: "Still krav til leveransen", description: "Krav til produkt, kompetanse og kontroll kommuniseres før bestilling." },
      { title: "Velg vurdert leverandør", description: "Kjøp som påvirker kvaliteten, går til leverandør som er vurdert." },
      { title: "Kontroller mottak", description: "Avvik fra krav registreres og følges opp." },
      { title: "Re-evaluer leverandøren", description: "Vurderingen fornyes innen datoen i leverandørregisteret." },
    ],
  },
  {
    sourceKey: "levering",
    name: "Levering og utførelse",
    kind: "HOVED",
    sortOrder: 50,
    purpose: "Utføre og frigi leveransen slik at den samsvarer med avtalte krav.",
    inputs: "Bekreftet avtale, eventuelt utformingsunderlag, innkjøpte varer og gjeldende rutiner.",
    outputs: "Leveranse som er kontrollert før den frigis, og registrerte avvik der krav ikke er oppfylt.",
    criteria: "Arbeidet følger gjeldende rutine. Kontroll skjer før frigivelse. Avvik fra krav registreres.",
    resources: "Personell med rett kompetanse, utstyr og gjeldende arbeidsunderlag.",
    risksAndOpportunities: "Risiko: leveranse som ikke oppfyller kravene. Mulighet: kontroll før frigivelse fanger feilen hos oss.",
    moduleHref: "/dashboard/incidents",
    deliversTo: ["installasjon"],
    steps: [
      { title: "Planlegg utførelsen", description: "Krav, kompetanse og rekkefølge er kjent før arbeidet starter." },
      { title: "Utfør etter krav og rutine", description: "Avvik fra planen tas opp før arbeidet fortsetter." },
      { title: "Kontroller før frigivelse", description: "Leveransen slippes når kriteriene er oppfylt." },
    ],
  },
  {
    sourceKey: "installasjon",
    name: "Installasjon og oppstart",
    kind: "HOVED",
    sortOrder: 60,
    purpose: "Installere, verifisere og sette i drift det som er levert. Merk prosessen utenfor omfang dersom virksomheten ikke installerer eller setter i drift.",
    inputs: "Godkjent leveranse, monteringsunderlag og krav til verifikasjon før oppstart.",
    outputs: "Installasjon som er verifisert, og en overlevering som viser at oppstart er gjennomført.",
    criteria: "Verifikasjon er utført før oppstart. Avvik er lukket eller kjent før overlevering. Erfaring meldes tilbake til ledelse.",
    resources: "Personell med rett kompetanse for installasjon og verifikasjon.",
    risksAndOpportunities: "Risiko: oppstart uten verifikasjon. Mulighet: feil rettes før kunden tar løsningen i bruk.",
    moduleHref: "",
    deliversTo: ["ledelse"],
    steps: [
      { title: "Planlegg installasjonen", description: "Underlag, kompetanse og rekkefølge er avklart." },
      { title: "Utfør installasjonen", description: "Arbeidet følger krav og gjeldende rutine." },
      { title: "Verifiser før oppstart", description: "Oppstart skjer etter at kontrollen er gjennomført." },
      { title: "Overlever", description: "Avvik og erfaring tas med tilbake til ledelse og forbedring." },
    ],
  },
  {
    sourceKey: "hms",
    name: "HMS",
    kind: "STOTTE",
    sortOrder: 70,
    purpose: "Kartlegge fare, styre arbeidet og følge opp avvik slik at leveransen kan utføres forsvarlig.",
    inputs: "Arbeidsoppgaver, endringer, hendelser og krav i arbeidsmiljøloven og internkontrollforskriften.",
    outputs: "Risikovurdering, rutiner, gjennomførte kontroller og lukkede tiltak.",
    criteria: "Fare er kartlagt før arbeidet. Avvik meldes og følges opp. Tiltak har ansvarlig og frist.",
    resources: "Ledere, verneombud, ansatte og tid til vernerunde og risikovurdering.",
    risksAndOpportunities: "Risiko: arbeid uten kartlagt fare. Mulighet: erfaring fra avvik brukes i neste jobb.",
    moduleHref: "/dashboard/hms-handbok",
    deliversTo: ["levering", "installasjon"],
    steps: [
      { title: "Kartlegg fare og risiko", description: "Vurderingen oppdateres når arbeidet eller utstyret endres." },
      { title: "Styr arbeidet", description: "Rutiner, sikker jobb-analyse og vernerunde brukes der de treffer." },
      { title: "Meld og følg opp avvik", description: "Tiltak lukkes og effekten vurderes der årsaken kan gjenta seg." },
    ],
  },
  {
    sourceKey: "kompetanse",
    name: "Kompetanse og dokumentert informasjon",
    kind: "STOTTE",
    sortOrder: 80,
    purpose: "Sikre at de som utfører arbeidet har nødvendig kompetanse, og at gjeldende dokumenter brukes.",
    inputs: "Krav til roller, nye ansatte, endrede rutiner og dokumenter som skal revideres.",
    outputs: "Dokumentert kompetanse og gjeldende versjon av rutiner og andre styrende dokumenter.",
    criteria: "Kompetansekrav er kjent for rollen. Dokumenter har eier og revisjonsfrist. Utførelsen bruker gjeldende versjon.",
    resources: "Nærmeste leder, og tid til opplæring og dokumentgjennomgang.",
    risksAndOpportunities: "Risiko: arbeid utføres uten nødvendig kompetanse eller etter utdatert rutine. Mulighet: tydelige dokumenter gjør utførelsen lik fra gang til gang.",
    moduleHref: "/dashboard/training",
    deliversTo: ["salg", "utforming", "innkjop", "levering", "installasjon", "hms"],
    steps: [
      { title: "Fastsett kompetansebehov", description: "Kravet følger rollen og arbeidet som skal utføres." },
      { title: "Sørg for opplæring", description: "Gjennomført opplæring dokumenteres." },
      { title: "Hold dokumentene oppdatert", description: "Rutiner og prosedyrer gjennomgås innen fristen." },
    ],
  },
];

const MODULE_HREFS = new Set<string>(QMS_MODULE_LINKS.map((link) => link.href));

export function isQmsModuleHref(value: string): value is QmsModuleHref {
  return MODULE_HREFS.has(value);
}

/** Krav som må være oppfylt før en prosess kan brukes som styrende informasjon. */
export function processRecordError(input: QmsProcessRecordInput): string | null {
  if (input.name.trim().length < 2) return "Navn må være minst 2 tegn.";
  if (input.status === "OUT_OF_SCOPE" && input.scopeReason.trim().length < 10) {
    return "Utenfor omfang krever en begrunnelse på minst 10 tegn (ISO 9001:2015 pkt. 4.3).";
  }
  if (input.status !== "ACTIVE") return null;
  if (input.purpose.trim().length < 10) {
    return "En aktiv prosess må ha et formål (ISO 9001:2015 pkt. 4.4.1).";
  }
  if (input.inputs.trim().length < 3) {
    return "En aktiv prosess må ha innganger (ISO 9001:2015 pkt. 4.4.1 a).";
  }
  if (input.outputs.trim().length < 3) {
    return "En aktiv prosess må ha forventede resultater (ISO 9001:2015 pkt. 4.4.1 a).";
  }
  if (input.criteria.trim().length < 10) {
    return "En aktiv prosess må ha kriterier for styring og oppfølging (ISO 9001:2015 pkt. 4.4.1 c).";
  }
  if (input.resources.trim().length < 3) {
    return "En aktiv prosess må ha ressurser (ISO 9001:2015 pkt. 4.4.1 d).";
  }
  if (!input.ownerId.trim()) {
    return "En aktiv prosess må ha en prosesseier (ISO 9001:2015 pkt. 4.4.1 e).";
  }
  if (input.risksAndOpportunities.trim().length < 10) {
    return "En aktiv prosess må si hvordan risiko og muligheter er vurdert (ISO 9001:2015 pkt. 4.4.1 f).";
  }
  if (input.nextReviewAt.trim().length < 8) {
    return "En aktiv prosess må ha dato for neste vurdering (ISO 9001:2015 pkt. 4.4.1 g).";
  }
  if (!input.steps.some((step) => step.title.trim().length > 0)) {
    return "En aktiv prosess må ha minst ett steg.";
  }
  return null;
}

export function starterReadyToActivate(starter: QmsProcessStarter): boolean {
  return (
    processRecordError({
      name: starter.name,
      status: "ACTIVE",
      purpose: starter.purpose,
      inputs: starter.inputs,
      outputs: starter.outputs,
      criteria: starter.criteria,
      resources: starter.resources,
      risksAndOpportunities: starter.risksAndOpportunities,
      scopeReason: "",
      ownerId: "prosesseier",
      nextReviewAt: "2026-12-01",
      steps: starter.steps,
    }) === null
  );
}
