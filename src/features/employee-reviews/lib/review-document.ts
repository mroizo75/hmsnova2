import type { PdfReportConfig, PdfSection } from "@/lib/pdf-brand";
import {
  getSickLeaveTemplate,
  parseTemplateAnswers,
} from "@/features/employee-reviews/lib/sick-leave-templates";
import { slugifyDocumentTitle } from "@/lib/template-copy";

export type ReviewDocumentInput = {
  kind: "MEDARBEIDER" | "SYKEFRAVAER";
  status: string;
  templateKey: string | null;
  templateAnswers: unknown;
  scheduledDate: Date | string;
  completedDate: Date | string | null;
  employeeName: string;
  reviewerName: string;
  signertAvAnsatt: boolean;
  signertAvLeder: boolean;
  ansattSignertAt: Date | string | null;
  lederSignertAt: Date | string | null;
  oppsummeringKommentar?: string | null;
  lederTilbakemeldingTilAnsatt?: string | null;
  ansattTilbakemeldingTilLeder?: string | null;
  ansattForberedelse?: string | null;
  goals?: { description: string; status: string }[];
  actions?: { description: string; ansvarlig: string | null }[];
};

const STATUS_LABEL: Record<string, string> = {
  PLANLAGT: "Planlagt",
  FORBEREDT: "Forberedt",
  GJENNOMFORT: "Gjennomført",
  SIGNERT: "Bekreftet av begge",
  AVBRUTT: "Avbrutt",
};

function stamp(value: Date | string | null | undefined): string {
  if (!value) return "Ikke bekreftet";
  return new Intl.DateTimeFormat("nb-NO", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Oslo",
  }).format(new Date(value));
}

function day(value: Date | string): string {
  return new Intl.DateTimeFormat("nb-NO", {
    dateStyle: "long",
    timeZone: "Europe/Oslo",
  }).format(new Date(value));
}

function textSection(title: string, text: string | null | undefined): PdfSection | null {
  const value = text?.trim();
  if (!value) return null;
  return { title, content: [{ type: "paragraph", text: value }] };
}

export function bothPartiesConfirmed(input: Pick<ReviewDocumentInput, "signertAvAnsatt" | "signertAvLeder">): boolean {
  return input.signertAvAnsatt && input.signertAvLeder;
}

export function buildReviewDocument(input: ReviewDocumentInput, tenantName: string): {
  title: string;
  fileName: string;
  legalRef: string;
  config: PdfReportConfig;
} {
  const template = input.kind === "SYKEFRAVAER" ? getSickLeaveTemplate(input.templateKey) : null;
  const title = template?.title ?? "Medarbeidersamtale";
  const legalRef = template?.legalRef ?? "AML § 4-2 (2)";
  const confirmed = bothPartiesConfirmed(input);
  const answers = parseTemplateAnswers(input.templateAnswers);

  const sections: PdfSection[] = [
    {
      title: "Parter",
      legalRef,
      content: [
        {
          type: "keyvalue",
          pairs: [
            ["Ansatt", input.employeeName],
            ["Leder", input.reviewerName],
            ["Dato", day(input.scheduledDate)],
            ["Status", STATUS_LABEL[input.status] ?? input.status],
            ["Gjennomført", input.completedDate ? day(input.completedDate) : null],
          ],
        },
      ],
    },
  ];

  if (!confirmed) {
    sections.push({
      content: [
        {
          type: "alert",
          severity: "warning",
          text: "Utkast. Dokumentet legges i personalmappen når både ansatt og leder har bekreftet i systemet.",
        },
      ],
    });
  }

  if (template) {
    sections.push({
      title: template.title,
      legalRef: template.legalRef,
      content: template.questions.map((question) => ({
        type: "keyvalue" as const,
        pairs: [[question.label, answers[question.id]?.trim() || "Ikke utfylt"]] as [string, string][],
      })),
    });
  }

  for (const section of [
    textSection("Ansattes forberedelse", input.ansattForberedelse),
    textSection("Oppsummering", input.oppsummeringKommentar),
    textSection("Leders tilbakemelding", input.lederTilbakemeldingTilAnsatt),
    textSection("Ansattes tilbakemelding", input.ansattTilbakemeldingTilLeder),
  ]) {
    if (section && input.kind === "MEDARBEIDER") sections.push(section);
  }

  if (input.kind === "MEDARBEIDER" && input.goals && input.goals.length > 0) {
    sections.push({
      title: "Mål",
      content: [
        {
          type: "table",
          headers: ["Mål", "Status"],
          rows: input.goals.map((goal) => [goal.description, goal.status]),
        },
      ],
    });
  }

  if (input.kind === "MEDARBEIDER" && input.actions && input.actions.length > 0) {
    sections.push({
      title: "Tiltak",
      legalRef: "IK-HMS § 5",
      content: [
        {
          type: "table",
          headers: ["Tiltak", "Ansvarlig"],
          rows: input.actions.map((action) => [action.description, action.ansvarlig ?? ""]),
        },
      ],
    });
  }

  sections.push({
    title: "Bekreftelser",
    legalRef,
    content: [
      {
        type: "paragraph",
        text: "Bekreftelsen er registrert i HMS Nova med navn og tidspunkt. Den er et spor på at parten har lest og deltatt. Den er ikke en kvalifisert elektronisk signatur.",
      },
      {
        type: "signature-block",
        signatures: [
          {
            name: `Ansatt: ${input.employeeName}`,
            date: input.signertAvAnsatt ? stamp(input.ansattSignertAt) : "Ikke bekreftet",
            comment: input.signertAvAnsatt ? "Bekreftet i systemet" : "Mangler bekreftelse",
          },
          {
            name: `Leder: ${input.reviewerName}`,
            date: input.signertAvLeder ? stamp(input.lederSignertAt) : "Ikke bekreftet",
            comment: input.signertAvLeder ? "Bekreftet i systemet" : "Mangler bekreftelse",
          },
        ],
      },
    ],
  });

  const fileName = `${slugifyDocumentTitle(title)}.pdf`;

  return {
    title,
    fileName,
    legalRef,
    config: {
      type: "formal",
      title,
      subtitle: input.employeeName,
      reportLabel: "HR-samtale",
      tenant: { name: tenantName },
      legalReference: legalRef,
      sections,
    },
  };
}
