/**
 * Maler for sykefraværssamtale.
 *
 * Hjemmel:
 *   AML § 4-6 (3): oppfølgingsplan senest etter fire uker
 *   AML § 4-6 (4): dialogmøte 1 senest innen sju uker ved fullt fravær
 *   AML § 4-6 (5): dokumentere innkalling og deltakelse
 *   Folketrygdloven § 8-7a: dialogmøte 2, NAV innkaller senest innen 26 uker
 *   GDPR art. 9: malene spør om arbeidsevne og tiltak, ikke diagnose
 */

export type SickLeaveQuestion = {
  id: string;
  label: string;
  help: string;
  required: boolean;
};

export type SickLeaveTemplate = {
  key: string;
  title: string;
  legalRef: string;
  deadline: string;
  summary: string;
  questions: SickLeaveQuestion[];
};

export const SICK_LEAVE_TEMPLATES: SickLeaveTemplate[] = [
  {
    key: "tidlig-kontakt",
    title: "Tidlig sykefraværssamtale",
    legalRef: "AML § 4-6 (3)",
    deadline: "Så tidlig som mulig etter at fraværet startet",
    summary:
      "Arbeidet med oppfølging skal starte så tidlig som mulig. Samtalen gjelder arbeid og tilrettelegging.",
    questions: [
      {
        id: "kontakt",
        label: "Avtalt kontaktform og hyppighet",
        help: "Hvordan leder og ansatt holder kontakten mens fraværet pågår.",
        required: true,
      },
      {
        id: "arbeidsoppgaver",
        label: "Hvilke arbeidsoppgaver kan utføres nå?",
        help: "Beskriv funksjon og oppgaver. Ikke be om eller skriv diagnose.",
        required: true,
      },
      {
        id: "tilrettelegging",
        label: "Behov for tilrettelegging av arbeid eller arbeidstid",
        help: "AML § 4-6 (1): arbeidstaker skal så langt det er mulig få passende arbeid.",
        required: true,
      },
      {
        id: "neste",
        label: "Avtalt neste steg",
        help: "For eksempel ny kontakt, eller oppstart av oppfølgingsplan.",
        required: true,
      },
    ],
  },
  {
    key: "oppfolgingsplan",
    title: "Oppfølgingsplan",
    legalRef: "AML § 4-6 (3)",
    deadline: "Senest når arbeidstaker har vært helt eller delvis borte fra arbeidet i fire uker",
    summary:
      "Planen lages i samråd med arbeidstaker og skal formidles til sykmelder så snart den er utarbeidet, senest etter fire uker.",
    questions: [
      {
        id: "arbeidsevne",
        label: "Vurdering av arbeidsoppgaver og arbeidsevne",
        help: "Lovpålagt innhold. Vurder oppgaver, ikke diagnose.",
        required: true,
      },
      {
        id: "tiltak-arbeidsgiver",
        label: "Aktuelle tiltak i arbeidsgivers regi",
        help: "Tilrettelegging av arbeid, arbeidstid, utstyr eller oppgaver.",
        required: true,
      },
      {
        id: "bistand",
        label: "Aktuelle tiltak med bistand fra NAV, BHT eller andre",
        help: "Skriv «ingen aktuelt nå» hvis det ikke er behov.",
        required: true,
      },
      {
        id: "videre",
        label: "Plan for videre oppfølging",
        help: "Neste kontakt, dialogmøte og hvem som følger opp.",
        required: true,
      },
      {
        id: "sykmelder",
        label: "Når og hvordan planen formidles til sykmelder",
        help: "Arbeidsgiver skal sende planen uoppfordret, senest etter fire uker.",
        required: true,
      },
    ],
  },
  {
    key: "dialogmote-1",
    title: "Dialogmøte 1",
    legalRef: "AML § 4-6 (4) og (5)",
    deadline:
      "Senest innen sju uker ved fullt fravær. Ved delvis fravær når arbeidsgiver, arbeidstaker eller sykmelder mener det er hensiktsmessig.",
    summary:
      "Møtet gjelder innholdet i oppfølgingsplanen. Sykmelder skal innkalles hvis arbeidstakeren ønsker det, eller begge ønsker det. Arbeidsgiver skal kunne dokumentere hvem som var innkalt og hvem som deltok.",
    questions: [
      {
        id: "innkalt",
        label: "Hvem er innkalt",
        help: "Arbeidstaker, og sykmelder, NAV eller bedriftshelsetjeneste der det er aktuelt.",
        required: true,
      },
      {
        id: "deltatt",
        label: "Hvem deltok",
        help: "AML § 4-6 (5): deltakelse skal kunne dokumenteres.",
        required: true,
      },
      {
        id: "plan",
        label: "Gjennomgang av oppfølgingsplanen",
        help: "Hva som fungerer, og hva som må endres.",
        required: true,
      },
      {
        id: "avtalt",
        label: "Avtalte tiltak og hvem som gjør hva",
        help: "Konkrete tiltak med ansvarlig.",
        required: true,
      },
      {
        id: "unntak",
        label: "Hvis møtet er åpenbart unødvendig: begrunnelse",
        help: "La feltet stå tomt når møtet gjennomføres. Unntaket følger AML § 4-6 (4).",
        required: false,
      },
    ],
  },
  {
    key: "dialogmote-2",
    title: "Dialogmøte 2 med NAV",
    legalRef: "AML § 4-6 (3) og folketrygdloven § 8-7a",
    deadline:
      "NAV innkaller senest innen 26 uker. Oppdatert oppfølgingsplan sendes NAV senest én uke før møtet.",
    summary:
      "Arbeidsgiver og arbeidstaker forbereder møtet NAV innkaller til, og oppdaterer planen før den sendes.",
    questions: [
      {
        id: "status",
        label: "Status på tiltak i oppfølgingsplanen",
        help: "Hva som er prøvd, og hva som gjenstår.",
        required: true,
      },
      {
        id: "rest",
        label: "Mulig arbeidsrelatert aktivitet",
        help: "Folketrygdloven stiller aktivitetskrav. Beskriv oppgaver som kan prøves, ikke diagnose.",
        required: true,
      },
      {
        id: "nav",
        label: "Oppdatert plan sendt til NAV",
        help: "Senest én uke før dialogmøtet NAV innkaller til.",
        required: true,
      },
      {
        id: "deltakere",
        label: "Deltakere i møtet",
        help: "Hvem som er innkalt og hvem som deltar.",
        required: true,
      },
      {
        id: "videre",
        label: "Avtalt videre oppfølging",
        help: "Neste steg etter møtet.",
        required: true,
      },
    ],
  },
];

const TEMPLATE_BY_KEY = new Map(SICK_LEAVE_TEMPLATES.map((template) => [template.key, template]));

const MILESTONE_TEMPLATE: Record<string, string> = {
  FOLLOW_UP_PLAN: "oppfolgingsplan",
  DIALOG_MEETING_1: "dialogmote-1",
  ACTIVITY_REQUIREMENT: "oppfolgingsplan",
  DIALOG_MEETING_2: "dialogmote-2",
  DIALOG_MEETING_3: "dialogmote-2",
};

export function getSickLeaveTemplate(key: string | null | undefined): SickLeaveTemplate | null {
  if (!key) return null;
  return TEMPLATE_BY_KEY.get(key) ?? null;
}

const EMPLOYEE_CONFIRMATION_MILESTONES = [
  "FOLLOW_UP_PLAN",
  "DIALOG_MEETING_1",
  "DIALOG_MEETING_2",
  "DIALOG_MEETING_3",
] as const;

export function templateKeyForMilestone(milestone: string): string | null {
  return MILESTONE_TEMPLATE[milestone] ?? null;
}

/** Milepæler den ansatte må bekrefte, AML § 4-6. Aktivitetskrav og maksdato er arbeidsgivers. */
export function milestonesAwaitingEmployeeConfirmation(
  templateKey: string | null | undefined,
): string[] {
  if (!templateKey) return [];
  return EMPLOYEE_CONFIRMATION_MILESTONES.filter(
    (milestone) => templateKeyForMilestone(milestone) === templateKey,
  );
}

export function followUpRequiresEmployeeConfirmation(milestone: string): boolean {
  return (EMPLOYEE_CONFIRMATION_MILESTONES as readonly string[]).includes(milestone);
}

/** En signert samtale lukker ett åpent punkt. Eldre, allerede lukkede punkter bruker opp tidligere bekreftelser. */
export function confirmationCoversMilestone(
  signedConversations: number,
  completedSiblings: number,
): boolean {
  return signedConversations > completedSiblings;
}

export function parseTemplateAnswers(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const answers: Record<string, string> = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === "string") answers[key] = item;
  }
  return answers;
}

export function missingRequiredSickLeaveAnswers(
  templateKey: string | null | undefined,
  answers: unknown,
): string[] {
  const template = getSickLeaveTemplate(templateKey);
  if (!template) return [];
  const parsed = parseTemplateAnswers(answers);
  return template.questions
    .filter((question) => question.required && !parsed[question.id]?.trim())
    .map((question) => question.label);
}
