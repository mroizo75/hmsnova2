import type { PatternType, SuggestionTemplate } from "../types"

export const SUGGESTION_TEMPLATES: Record<PatternType, SuggestionTemplate[]> = {
  RECURRING_INCIDENT: [
    {
      target: "UPDATE_ROUTINE",
      titleTemplate: "Vurder å oppdatere rutine for «{{area}}»",
      descriptionTemplate:
        "Det er registrert {{count}} avvik relatert til «{{area}}» de siste {{days}} dagene. " +
        "Gjentakende avvik i samme område kan tyde på at gjeldende rutine ikke dekker " +
        "situasjonen tilstrekkelig, eller at rutinen ikke er kjent/fulgt av ansatte. " +
        "Vurder å gjennomgå og oppdatere relevant rutine.",
      legalBasis:
        "IK-HMS § 5 nr. 7: Iverksette rutiner for å avdekke, rette opp og forebygge overtredelser av krav",
      targetSectionKey: "s4",
    },
    {
      target: "ADD_TRAINING",
      titleTemplate: "Vurder opplæring innen «{{area}}»",
      descriptionTemplate:
        "{{count}} gjentakende avvik innen «{{area}}» kan tyde på behov for " +
        "opplæring eller oppfriskning for berørte ansatte.",
      legalBasis: "AML § 3-2 (1): Arbeidsgiver skal sørge for nødvendig opplæring",
      targetSectionKey: "s5",
    },
  ],
  INSPECTION_TREND: [
    {
      target: "SCHEDULE_INSPECTION",
      titleTemplate: "Planlegg oppfølgingsinspeksjon for «{{area}}»",
      descriptionTemplate:
        "Lignende funn er registrert i {{count}} vernerunder de siste {{days}} dagene. " +
        "Gjentakende funn tyder på at korrigerende tiltak ikke har hatt ønsket effekt. " +
        "Vurder å planlegge en dedikert oppfølgingsinspeksjon.",
      legalBasis: "AML § 3-1 (2) e: Sørge for systematisk arbeid med forebygging",
      targetSectionKey: "s8",
    },
    {
      target: "UPDATE_ROUTINE",
      titleTemplate: "Oppdater rutine basert på vernerundenfunn",
      descriptionTemplate:
        "Gjentakende funn fra vernerunder innen «{{area}}» bør reflekteres i " +
        "gjeldende rutiner for å forebygge fremtidige avvik.",
      legalBasis: "IK-HMS § 5 nr. 7",
      targetSectionKey: "s8",
    },
  ],
  TRAINING_GAP: [
    {
      target: "ADD_TRAINING",
      titleTemplate: "Opplæringsgap oppdaget: {{area}}",
      descriptionTemplate:
        "{{count}} ansatte mangler påkrevd opplæring eller har utløpte sertifikater " +
        "innen «{{area}}». Arbeidsgiver plikter å sørge for at ansatte har nødvendig " +
        "kompetanse for arbeidsoppgavene sine.",
      legalBasis: "AML § 3-2 (1): Arbeidsgiver skal sørge for opplæring",
      targetSectionKey: "s5",
    },
  ],
  RISK_ESCALATION: [
    {
      target: "ADD_RISK_ASSESSMENT",
      titleTemplate: "Risikoscore har økt for «{{area}}»",
      descriptionTemplate:
        "Risikoscoren innen «{{area}}» har økt med {{count}} poeng siden forrige " +
        "vurdering, eller risikovurderingen er utdatert. Gjennomfør en oppdatert risikovurdering og vurder nye tiltak.",
      legalBasis: "IK-HMS § 5 nr. 6: Kartlegge farer og vurdere risiko",
      targetSectionKey: "s3",
    },
  ],
  MEASURE_INEFFECTIVE: [
    {
      target: "UPDATE_ROUTINE",
      titleTemplate: "Tiltak ga ikke ønsket effekt – vurder ny tilnærming",
      descriptionTemplate:
        "Avvik har gjenoppstått innen «{{area}}» etter at tiltak ble lukket. " +
        "Dette tyder på at tiltaket ikke adresserte rotårsaken. Vurder å gjennomføre " +
        "en grundigere årsaksanalyse og oppdatere rutinen.",
      legalBasis: "IK-HMS § 5 nr. 8: Foreta systematisk overvåking og gjennomgang",
      targetSectionKey: "s4",
    },
  ],
  COMPLIANCE_DRIFT: [
    {
      target: "UPDATE_ROUTINE",
      titleTemplate: "Rutine «{{routineTitle}}» ser ut til å ikke følges",
      descriptionTemplate:
        "{{count}} avvik de siste {{days}} dagene er relatert til området som " +
        "dekkes av rutine «{{routineTitle}}». Vurder om rutinen er praktisk gjennomførbar, " +
        "om den er tilstrekkelig kommunisert til ansatte, eller om den trenger revisjon.",
      legalBasis: "IK-HMS § 5 nr. 7: Iverksette rutiner for å avdekke, rette opp og forebygge",
      targetSectionKey: "s3",
    },
    {
      target: "ADD_TRAINING",
      titleTemplate: "Behov for opplæring i rutine «{{routineTitle}}»",
      descriptionTemplate:
        "Gjentakende avvik tyder på at ansatte ikke kjenner eller følger " +
        "rutine «{{routineTitle}}». Vurder opplæring eller oppfriskning.",
      legalBasis: "AML § 3-2 (1)",
      targetSectionKey: "s5",
    },
  ],
  RUH_TREND: [
    {
      target: "UPDATE_ROUTINE",
      titleTemplate: "Gjentakende RUH-rapporter innen «{{area}}»",
      descriptionTemplate:
        "{{count}} RUH-rapporter med kategori/lokasjon «{{area}}» de siste {{days}} dagene. " +
        "Gjentakende uønskede hendelser i samme område indikerer at forebyggende tiltak " +
        "bør styrkes eller at rutinen bør oppdateres.",
      legalBasis: "IK-HMS § 5 nr. 7: Iverksette rutiner for å avdekke, rette opp og forebygge",
      targetSectionKey: "s4",
    },
  ],
  SJA_COVERAGE_GAP: [
    {
      target: "UPDATE_SJA_TEMPLATE",
      titleTemplate: "Høyrisiko-aktivitet mangler SJA-dekning",
      descriptionTemplate:
        "{{count}} risikoer med score ≥ 12 har ingen tilhørende SJA (sikker jobb-analyse). " +
        "Alle høyrisiko-aktiviteter bør ha en gjennomført SJA med identifiserte farer og tiltak.",
      legalBasis: "AML § 3-1 (2) c: Vurdere risikoforhold og iverksette tiltak",
      targetSectionKey: "s6",
    },
  ],
  CHEMICAL_COMPLIANCE: [
    {
      target: "UPDATE_HANDBOOK",
      titleTemplate: "Kjemikalier med utdatert sikkerhetsdatablad",
      descriptionTemplate:
        "{{count}} kjemikalier i stoffkartoteket har utdatert eller manglende " +
        "sikkerhetsdatablad (SDS). Oppdaterte datablad er påkrevd for alle kjemikalier i bruk.",
      legalBasis: "Kjemikalieforskriften § 5, AML § 4-5",
      targetSectionKey: "s12",
    },
  ],
  FIRE_SAFETY_GAP: [
    {
      target: "SCHEDULE_INSPECTION",
      titleTemplate: "Brannøvelse ikke gjennomført",
      descriptionTemplate:
        "Det er over 12 måneder siden siste brannøvelse ble gjennomført. " +
        "Brannøvelser skal gjennomføres jevnlig for å sikre at alle ansatte " +
        "kjenner evakueringsrutinene.",
      legalBasis: "Forskrift om brannforebygging § 12, § 13",
      targetSectionKey: "s7",
    },
  ],
  MANAGEMENT_REVIEW_OVERDUE: [
    {
      target: "UPDATE_HANDBOOK",
      titleTemplate: "Ledelsens gjennomgang er forfalt",
      descriptionTemplate:
        "Ledelsens gjennomgang av HMS-systemet er ikke gjennomført innen planlagt tid. " +
        "Ledelsen skal minst årlig gjennomgå internkontrollsystemet for å sikre " +
        "at det fungerer som forutsatt.",
      legalBasis: "IK-HMS § 5 nr. 8: Foreta systematisk overvåking og gjennomgang",
      targetSectionKey: "s9",
    },
  ],
}

export function renderTemplate(
  template: string,
  vars: Record<string, string | number>,
): string {
  let result = template
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), String(value))
  }
  return result
}
