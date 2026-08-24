/**
 * Konfigurasjon for tilsynsrapport PDF-eksport.
 *
 * Mapper tilsynstype til nøyaktig de dokumentasjonskravene som hvert tilsyn
 * faktisk ber om å se, basert på:
 * - Arbeidstilsynet: IK-HMS § 5 nr. 1–8 (skriftlig dokumentasjon nr. 4–8)
 * - Mattilsynet: IK-mat, HACCP-prinsippene, næringsmiddelhygieneforskriften
 * - Brannvesenet: Forskrift om brannforebygging §§ 4–13, brann- og eksplosjonsvernloven § 13
 */

export type TilsynType = "arbeidstilsynet" | "mattilsynet" | "brannvesenet" | "revisjon";

export interface TilsynTypeConfig {
  id: TilsynType;
  label: string;
  description: string;
  /** HMS-håndbokseksjoner relevant for dette tilsynet */
  sectionKeys: string[];
  /** Live-data som inkluderes i rapporten */
  liveData: LiveDataType[];
  /** Lovhjemmel for dette tilsynet */
  legalBasis: string;
}

export type LiveDataType =
  | "risks"
  | "incidents"
  | "training"
  | "inspections"
  | "chemicals"
  | "routines"
  | "fire_drills"
  | "employee_reviews"
  | "measures";

/**
 * Seksjoner i HMS-håndboken og hva de dekker (for referanse):
 * s1  = HMS-policy og mål               → IK-HMS § 5 nr. 4
 * s2  = Organisasjon og ansvar           → IK-HMS § 5 nr. 5
 * s2b = Ansattes medvirkning             → IK-HMS § 5 nr. 3
 * s2c = Lovkrav og forskrifter           → IK-HMS § 5 nr. 1
 * s3  = Risikovurdering og tiltak        → IK-HMS § 5 nr. 6
 * s4  = Avvikshåndtering                 → IK-HMS § 5 nr. 7
 * s5  = Kompetanse og opplæring          → IK-HMS § 5 nr. 2
 * s6  = SJA / operasjonell kontroll
 * s7  = Brannvern og beredskap           → Forskrift om brannforebygging §§ 4–12
 * s8  = Vernerunder                      → AML § 6-2
 * s9  = Ledelsens gjennomgang            → IK-HMS § 5 nr. 8
 * s10 = Dokumentstyring
 * s11 = Arbeidsmiljø (fysisk/psykososialt) → AML §§ 4-2, 4-3, 4-4
 * s11b= Varsling                         → AML §§ 2A-1 til 2A-6
 * s12 = Ytre miljø / kjemikalier         → Forurensningsloven, AML § 4-5
 * s13 = Årshjul HMS-aktiviteter
 * s14 = Intern revisjon                  → IK-HMS § 5 nr. 8
 * s15 = Rutineoversikt
 */

export const TILSYN_TYPES: TilsynTypeConfig[] = [
  {
    id: "arbeidstilsynet",
    label: "Arbeidstilsynet",
    description: "IK-HMS § 5: HMS-mål, organisasjon, risikovurdering, avvikshåndtering, opplæring, verneombud og internrevisjon",
    legalBasis: "IK-HMS § 5 nr. 4–8, AML kap. 3, 5 og 6",
    sectionKeys: [
      "s1",   // HMS-mål (§ 5 nr. 4)
      "s2",   // Organisasjon og ansvarsfordeling (§ 5 nr. 5)
      "s2b",  // Ansattes medvirkning (§ 5 nr. 3)
      "s2c",  // Lovkravoversikt (§ 5 nr. 1)
      "s3",   // Risikovurdering med tiltaksplaner (§ 5 nr. 6)
      "s4",   // Avvikshåndtering (§ 5 nr. 7)
      "s5",   // Opplæring og kompetanse (§ 5 nr. 2)
      "s8",   // Vernerunder (AML § 6-2)
      "s9",   // Ledelsens gjennomgang (§ 5 nr. 8)
      "s11",  // Arbeidsmiljø fysisk/psykososialt (AML §§ 4-2, 4-3)
      "s11b", // Varsling (AML § 2A-1)
      "s14",  // Intern revisjon (§ 5 nr. 8)
    ],
    liveData: ["risks", "incidents", "training", "inspections", "measures", "employee_reviews"],
  },
  {
    id: "mattilsynet",
    label: "Mattilsynet",
    description: "IK-mat, HACCP-farevurdering, temperaturkontroll, hygiene, sporbarhet og opplæring matpersonale",
    legalBasis: "Matloven § 5, næringsmiddelhygieneforskriften, IK-mat-forskriften",
    sectionKeys: [
      "s1",   // Overordnet policy (internkontrollkrav)
      "s2c",  // Lovkrav matlov
      "s5",   // Opplæring hygiene/HACCP
      "s6",   // Operasjonell kontroll / SJA
      "s12",  // Kjemikalier (rengjøringsmidler, desinfeksjon)
      "s15",  // Rutineoversikt (temperatur, renhold, mottak)
    ],
    liveData: ["chemicals", "training", "routines"],
  },
  {
    id: "brannvesenet",
    label: "Brannvesenet / DSB",
    description: "Brannvernorganisering, beredskapsplan, risikovurdering brann, øvelser og kontroll av installasjoner",
    legalBasis: "Brann- og eksplosjonsvernloven § 13, forskrift om brannforebygging §§ 4–12",
    sectionKeys: [
      "s2",   // Organisasjon brannvern (ansvarsfordeling)
      "s7",   // Brannvern og beredskap (hovedseksjon)
      "s8",   // Vernerunder (brannrelaterte funn)
    ],
    liveData: ["fire_drills", "inspections", "training", "routines"],
  },
  {
    id: "revisjon",
    label: "Intern revisjon (komplett)",
    description: "Fullstendig HMS-dokumentasjon for egenkontroll eller ekstern revisjon",
    legalBasis: "IK-HMS § 5, AML kap. 3",
    sectionKeys: [
      "s1", "s2", "s2b", "s2c", "s3", "s4", "s5", "s6", "s7", "s8",
      "s9", "s10", "s11", "s11b", "s12", "s13", "s14", "s15",
    ],
    liveData: ["risks", "incidents", "training", "inspections", "chemicals", "routines", "fire_drills", "employee_reviews", "measures"],
  },
];

export function getTilsynConfig(type: TilsynType): TilsynTypeConfig | undefined {
  return TILSYN_TYPES.find((t) => t.id === type);
}
