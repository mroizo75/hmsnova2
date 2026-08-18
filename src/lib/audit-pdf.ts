/**
 * PDF Generator for Audits (ISO 9001/45001 Revisjoner)
 * Bruker profesjonell HMS Nova-branding via pdf-brand.ts
 */

import { generateBrandedPdf, type PdfSection } from "@/lib/pdf-brand";
import { format } from "date-fns";
import { nb } from "date-fns/locale";

interface AuditData {
  id: string;
  title: string;
  auditType: string;
  scope: string;
  criteria: string;
  scheduledDate: Date;
  completedAt?: Date | null;
  area: string;
  department?: string | null;
  status: string;
  summary?: string | null;
  conclusion?: string | null;
  tenantName?: string;
  tenantOrgNumber?: string | null;
  tenantLogoUrl?: string | null;
  conductedBy?: string;
  findings: Array<{
    id: string;
    findingType: string;
    clause: string;
    description: string;
    evidence: string;
    requirement: string;
    status: string;
    dueDate?: Date | null;
    correctiveAction?: string | null;
    rootCause?: string | null;
  }>;
}

const TYPE_LABELS: Record<string, string> = {
  INTERNAL: "Internrevisjon",
  EXTERNAL: "Eksternrevisjon",
  CERTIFICATION: "Sertifisering",
  SUPPLIER: "Leverandørrevisjon",
  FOLLOW_UP: "Oppfølging",
};

const STATUS_LABELS: Record<string, string> = {
  PLANNED: "Planlagt",
  IN_PROGRESS: "Pågår",
  COMPLETED: "Fullført",
  CANCELLED: "Avbrutt",
};

const FINDING_TYPE_LABELS: Record<string, string> = {
  MAJOR_NC: "Større avvik (Major NC)",
  MINOR_NC: "Mindre avvik (Minor NC)",
  OBSERVATION: "Observasjon",
};

function fmtDate(d: Date | null | undefined) {
  if (!d) return "–";
  return format(new Date(d), "d. MMMM yyyy", { locale: nb });
}

export async function generateAuditReport(audit: AuditData): Promise<Buffer> {
  const majorNc = audit.findings.filter((f) => f.findingType === "MAJOR_NC").length;
  const minorNc = audit.findings.filter((f) => f.findingType === "MINOR_NC").length;
  const observations = audit.findings.filter((f) => f.findingType === "OBSERVATION").length;

  const sections: PdfSection[] = [
    {
      title: "Revisjonsinformasjon",
      legalRef: "ISO 9001:2015 kap. 9.2",
      content: [
        {
          type: "keyvalue",
          pairs: [
            ["Type", TYPE_LABELS[audit.auditType] ?? audit.auditType],
            ["Område", audit.area],
            ...(audit.department ? [["Avdeling", audit.department] as [string, string]] : []),
            ["Status", STATUS_LABELS[audit.status] ?? audit.status],
            ["Planlagt dato", fmtDate(audit.scheduledDate)],
            ...(audit.completedAt ? [["Gjennomført", fmtDate(audit.completedAt)] as [string, string]] : []),
          ],
        },
      ],
    },
    {
      title: "Revisjonens omfang",
      legalRef: "ISO 9001:2015 – 9.2.2a",
      content: [{ type: "paragraph", text: audit.scope }],
    },
    {
      title: "Revisjonskriterier",
      legalRef: "ISO 9001:2015 – 9.2.2b",
      content: [{ type: "paragraph", text: audit.criteria }],
    },
    ...(audit.summary
      ? [{ title: "Oppsummering", content: [{ type: "paragraph" as const, text: audit.summary }] }]
      : []),
    {
      title: "Funn-oversikt",
      content: [
        {
          type: "table",
          headers: ["Funntype", "Antall"],
          rows: [
            ["Større avvik (Major NC)", majorNc],
            ["Mindre avvik (Minor NC)", minorNc],
            ["Observasjoner", observations],
            ["Totalt", audit.findings.length],
          ],
        },
      ],
    },
  ];

  if (audit.findings.length > 0) {
    sections.push({
      title: "Funn – oversiktstabell",
      content: [
        {
          type: "table",
          headers: ["#", "Klausul", "Type", "Beskrivelse", "Status"],
          rows: audit.findings.map((f, i) => [
            i + 1,
            f.clause,
            FINDING_TYPE_LABELS[f.findingType] ?? f.findingType,
            f.description.length > 70 ? f.description.substring(0, 70) + "…" : f.description,
            f.status,
          ]),
        },
      ],
    });

    sections.push({
      title: "Detaljerte funn",
      content: audit.findings.flatMap((f, i) => [
        {
          type: "keyvalue" as const,
          pairs: [
            [`${i + 1}. ${FINDING_TYPE_LABELS[f.findingType] ?? f.findingType}`, ""],
            ["ISO-klausul", f.clause],
            ["Krav", f.requirement],
            ["Beskrivelse", f.description],
            ["Bevis/Observasjon", f.evidence],
            ...(f.correctiveAction ? [["Korrigerende tiltak", f.correctiveAction] as [string, string]] : []),
            ...(f.rootCause ? [["Rotårsak", f.rootCause] as [string, string]] : []),
            ...(f.dueDate ? [["Frist", fmtDate(f.dueDate)] as [string, string]] : []),
          ] as [string, string][],
        },
      ]),
    });
  }

  if (audit.conclusion) {
    sections.push({
      title: "Konklusjon og anbefaling",
      content: [{ type: "paragraph", text: audit.conclusion }],
    });
  }

  if (majorNc > 0) {
    sections.push({
      content: [
        {
          type: "alert",
          text: `${majorNc} større avvik (Major NC) er identifisert og krever umiddelbare korrigerende tiltak.`,
          severity: "danger",
        },
      ],
    });
  }

  return generateBrandedPdf({
    type: "formal",
    reportLabel: TYPE_LABELS[audit.auditType] ?? "Revisjon",
    title: `Revisjonsrapport – ${audit.title}`,
    subtitle: `${STATUS_LABELS[audit.status] ?? audit.status} · ${fmtDate(audit.scheduledDate)}`,
    tenant: {
      name: audit.tenantName ?? "HMS Nova",
      orgNumber: audit.tenantOrgNumber,
      logoUrl: audit.tenantLogoUrl,
    },
    generatedBy: audit.conductedBy,
    generatedAt: new Date(),
    legalReference: "ISO 9001:2015 kap. 9.2, ISO 45001:2018 kap. 9.2",
    sections,
  });
}
