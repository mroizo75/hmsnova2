/**
 * Avviksrapport PDF – server-side generering
 * Erstatter klient-side jsPDF med branded server-side PDF via Adobe
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPermissions } from "@/lib/permissions";
import { generateBrandedPdf, type PdfSection } from "@/lib/pdf-brand";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import type { Role } from "@prisma/client";

const TYPE_LABELS: Record<string, string> = {
  AVVIK: "Avvik",
  NESTEN: "Nestenulykke",
  ULYKKE: "Arbeidsulykke",
  FARLIG_SITUASJON: "Farlig situasjon",
  YRKESSYKDOM: "Yrkessykdom",
  MILJO: "Miljøavvik",
  KVALITET: "Kvalitetsavvik",
  CUSTOMER: "Kundeklage",
};

const STATUS_LABELS: Record<string, string> = {
  OPEN: "Åpen",
  INVESTIGATING: "Under etterforskning",
  ACTION_TAKEN: "Tiltak iverksatt",
  CLOSED: "Lukket",
  ARCHIVED: "Arkivert",
};

function fmtDate(d: Date | string | null | undefined) {
  if (!d) return "–";
  return format(new Date(d), "d. MMMM yyyy", { locale: nb });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId || !session.user.role) {
    return NextResponse.json({ error: "Ikke autorisert" }, { status: 401 });
  }

  const permissions = getPermissions(session.user.role as Role);
  if (!permissions.canReadIncidents && !permissions.canReadOwnIncidents) {
    return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });
  }

  const { id } = await params;
  const tenantId = session.user.tenantId;

  const incident = await prisma.incident.findFirst({
    where: { id, tenantId },
    include: {
      measures: {
        include: { responsible: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      },
      tenant: {
        select: { name: true, orgNumber: true, address: true, logoUrl: true },
      },
    },
  });

  if (!incident) {
    return NextResponse.json({ error: "Avvik ikke funnet" }, { status: 404 });
  }

  const now = new Date();
  const severity = incident.severity;

  const sections: PdfSection[] = [
    {
      title: "Avviksdetaljer",
      legalRef: "IK-HMS § 5 nr. 7, AML § 5-2",
      content: [
        {
          type: "keyvalue",
          pairs: [
            ["Referanse", incident.avviksnummer ?? "–"],
            ["Type", TYPE_LABELS[incident.type] ?? incident.type],
            ["Status", STATUS_LABELS[incident.status] ?? incident.status],
            ...(severity != null ? [["Alvorlighetsgrad", `${severity}/5`] as [string, string]] : []),
            ["Dato", fmtDate(incident.occurredAt)],
            ["Registrert", fmtDate(incident.createdAt)],
            ...(incident.location ? [["Sted", incident.location] as [string, string]] : []),
            ...(incident.witnessName ? [["Vitne", incident.witnessName] as [string, string]] : []),
            ...(incident.closedAt ? [["Lukket", fmtDate(incident.closedAt)] as [string, string]] : []),
          ] as [string, string][],
        },
        { type: "paragraph", text: incident.description },
      ],
    },
  ];

  if (incident.immediateAction) {
    sections.push({
      title: "Umiddelbare tiltak",
      legalRef: "ISO 9001 kap. 10.2",
      content: [{ type: "paragraph", text: incident.immediateAction }],
    });
  }

  if (incident.rootCause || incident.contributingFactors) {
    sections.push({
      title: "Årsaksanalyse",
      legalRef: "ISO 9001 kap. 10.2, ISO 45001 kap. 10.2",
      content: [
        ...(incident.rootCause
          ? [{ type: "keyvalue" as const, pairs: [["Rotårsak", incident.rootCause] as [string, string]] }]
          : []),
        ...(incident.contributingFactors
          ? [{ type: "paragraph" as const, text: `Medvirkende faktorer:\n${incident.contributingFactors}` }]
          : []),
      ],
    });
  }

  if (incident.measures.length > 0) {
    sections.push({
      title: "Tiltak og oppfølging",
      content: [
        {
          type: "table",
          headers: ["Tiltak", "Status", "Ansvarlig", "Frist"],
          rows: incident.measures.map((m) => [
            m.description,
            m.status,
            m.responsible?.name ?? "–",
            fmtDate(m.deadline),
          ]),
        },
      ],
    });
  }

  if (incident.effectivenessReview) {
    sections.push({
      title: "Effektivitetsvurdering",
      content: [{ type: "paragraph", text: incident.effectivenessReview }],
    });
  }

  if (incident.lessonsLearned) {
    sections.push({
      title: "Læringspunkter",
      content: [{ type: "paragraph", text: incident.lessonsLearned }],
    });
  }

  // Varsler for meldepliktige typer
  if (incident.type === "ULYKKE" || incident.type === "YRKESSYKDOM") {
    sections.push({
      content: [
        {
          type: "alert",
          text: "Meldepliktig hendelse: Husk å melde til NAV via Altinn (Ftrl. § 13-14).",
          severity: "info",
        },
      ],
    });
    if (incident.isFatal) {
      sections.push({
        content: [
          {
            type: "alert",
            text: "DØDELIG ULYKKE: Skal straks meldes til Arbeidstilsynet (815 48 222) og politiet (AML § 5-2).",
            severity: "danger",
          },
        ],
      });
    }
  }

  const pdfBuffer = await generateBrandedPdf({
    type: "formal",
    reportLabel: TYPE_LABELS[incident.type] ?? "Avvik",
    title: incident.title,
    subtitle: `${STATUS_LABELS[incident.status] ?? incident.status} · ${fmtDate(incident.occurredAt)} · Ref: ${incident.avviksnummer ?? id}`,
    tenant: {
      name: incident.tenant.name,
      orgNumber: incident.tenant.orgNumber,
      address: incident.tenant.address,
      logoUrl: incident.tenant.logoUrl,
    },
    generatedBy: session.user.name ?? session.user.email ?? "Ukjent",
    generatedAt: now,
    legalReference: "AML § 5-2, IK-HMS § 5, ISO 9001 kap. 10.2",
    sections,
  });

  const filename = `Avviksrapport-${incident.avviksnummer ?? id}-${format(now, "yyyy-MM-dd")}.pdf`;

  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": pdfBuffer.byteLength.toString(),
    },
  });
}
