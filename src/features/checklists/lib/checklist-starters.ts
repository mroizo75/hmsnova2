export interface ChecklistStarterItem {
  prompt: string;
  helpText: string;
  required: boolean;
}

export interface ChecklistStarterSection {
  title: string;
  items: ChecklistStarterItem[];
}

export interface ChecklistStarter {
  id: string;
  title: string;
  description: string;
  usageNote: string;
  sections: ChecklistStarterSection[];
}

/**
 * Utgangspunkt bedriften kan endre.
 * Hjemmel: IK-HMS § 5 nr. 6–7 (kartlegge, kontrollere og følge opp)
 * og AML § 2-3 (melde feil og mangler).
 */
export const CHECKLIST_STARTERS: ChecklistStarter[] = [
  {
    id: "oppstart",
    title: "Daglig oppstart",
    description: "Kort kontroll før arbeidet starter.",
    usageNote: "Brukes ved oppstart av arbeidsdagen, før noen begynner på oppgavene.",
    sections: [
      {
        title: "Området",
        items: [
          {
            prompt: "Arbeidsområdet er ryddig og uten åpenbare snublefarer",
            helpText: "AML § 4-4: arbeidsplassen skal være innrettet slik at arbeidstakerne er sikret.",
            required: true,
          },
          {
            prompt: "Nødutganger og slokkeutstyr er tilgjengelig",
            helpText: "",
            required: true,
          },
          {
            prompt: "Nødvendig verneutstyr er på plass og i orden",
            helpText: "",
            required: true,
          },
        ],
      },
      {
        title: "Dagens arbeid",
        items: [
          {
            prompt: "Dagens oppgaver og kjente farer er gjennomgått",
            helpText: "",
            required: true,
          },
          {
            prompt: "Alle vet hvem de varsler ved feil eller skade",
            helpText: "AML § 2-3: arbeidstaker skal melde fra om feil og mangler.",
            required: true,
          },
        ],
      },
    ],
  },
  {
    id: "for-jobb",
    title: "Før oppgaven starter",
    description: "Kontroll av at personen og utstyret er klare.",
    usageNote: "Brukes rett før en konkret oppgave, ikke som erstatning for risikovurdering.",
    sections: [
      {
        title: "Person og utstyr",
        items: [
          {
            prompt: "Jeg har opplæringen som trengs for denne oppgaven",
            helpText: "AML § 3-2: arbeidsgiver skal sørge for nødvendig opplæring.",
            required: true,
          },
          {
            prompt: "Utstyret er kontrollert og klart til bruk",
            helpText: "",
            required: true,
          },
          {
            prompt: "Jeg kan stoppe arbeidet hvis noe er utrygt",
            helpText: "",
            required: true,
          },
        ],
      },
    ],
  },
];
