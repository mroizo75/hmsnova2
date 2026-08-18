import type { PatternRule } from "../types"

export const PATTERN_RULES: PatternRule[] = [
  {
    type: "RECURRING_INCIDENT",
    description: "Gjentakende avvik i samme kategori/område",
    threshold: 3,
    windowDays: 90,
    severityCalc: (count: number) => Math.min(5, Math.ceil(count / 2)),
    legalBasis: "IK-HMS § 5 nr. 7",
  },
  {
    type: "INSPECTION_TREND",
    description: "Vernerundenfunn som gjentar seg på tvers av inspeksjoner",
    threshold: 2,
    windowDays: 180,
    severityCalc: (count: number) => Math.min(5, count),
    legalBasis: "AML § 3-1, IK-HMS § 5 nr. 6",
  },
  {
    type: "TRAINING_GAP",
    description: "Ansatte mangler påkrevd opplæring eller har utløpte sertifikater",
    threshold: 1,
    windowDays: 365,
    severityCalc: (count: number) => (count >= 5 ? 5 : count >= 3 ? 4 : 3),
    legalBasis: "AML § 3-2 (1): Arbeidsgiver skal sørge for opplæring",
  },
  {
    type: "RISK_ESCALATION",
    description: "Risikoscore økt eller risikovurdering utdatert (> 12 mnd)",
    threshold: 1,
    windowDays: 365,
    severityCalc: (delta: number) => (delta >= 6 ? 5 : delta >= 3 ? 4 : 3),
    legalBasis: "IK-HMS § 5 nr. 6: Kartlegge farer og vurdere risiko",
  },
  {
    type: "MEASURE_INEFFECTIVE",
    description: "Tiltak som ikke gir effekt – avvik gjenoppstår etter lukking",
    threshold: 1,
    windowDays: 90,
    severityCalc: () => 4,
    legalBasis: "IK-HMS § 5 nr. 8: Foreta systematisk overvåking og gjennomgang",
  },
  {
    type: "COMPLIANCE_DRIFT",
    description: "Rutiner som ikke følges – gjentakende avvik i område dekket av rutine",
    threshold: 2,
    windowDays: 90,
    severityCalc: (count: number) => Math.min(5, count + 1),
    legalBasis: "IK-HMS § 5 nr. 7: Iverksette rutiner for å avdekke, rette opp og forebygge",
  },
  {
    type: "RUH_TREND",
    description: "Gjentakende RUH-rapporter i samme kategori/lokasjon",
    threshold: 3,
    windowDays: 90,
    severityCalc: (count: number) => Math.min(5, Math.ceil(count / 2)),
    legalBasis: "IK-HMS § 5 nr. 7",
  },
  {
    type: "SJA_COVERAGE_GAP",
    description: "Høyrisiko-aktiviteter uten tilhørende SJA",
    threshold: 1,
    windowDays: 365,
    severityCalc: (count: number) => (count >= 3 ? 5 : 4),
    legalBasis: "AML § 3-1 (2) c: Vurdere risikoforhold og iverksette tiltak",
  },
  {
    type: "CHEMICAL_COMPLIANCE",
    description: "Kjemikalier med utdatert eller manglende sikkerhetsdatablad",
    threshold: 1,
    windowDays: 365,
    severityCalc: (count: number) => (count >= 5 ? 5 : count >= 2 ? 4 : 3),
    legalBasis: "Kjemikalieforskriften § 5, AML § 4-5",
  },
  {
    type: "FIRE_SAFETY_GAP",
    description: "Brannøvelse ikke gjennomført siste 12 måneder",
    threshold: 1,
    windowDays: 365,
    severityCalc: () => 4,
    legalBasis: "Forskrift om brannforebygging § 12, § 13",
  },
  {
    type: "MANAGEMENT_REVIEW_OVERDUE",
    description: "Ledelsens gjennomgang ikke gjennomført i tide",
    threshold: 1,
    windowDays: 365,
    severityCalc: () => 4,
    legalBasis: "IK-HMS § 5 nr. 8: Foreta systematisk overvåking og gjennomgang",
  },
]

export function getRuleForType(type: string): PatternRule | undefined {
  return PATTERN_RULES.find((r) => r.type === type)
}
