/**
 * RUH-rapport PDF – server-side generering
 * Hjemmel: AML § 5-2 (3)b – rapportering av nestenulykker og farlige situasjoner
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPermissions } from "@/lib/permissions";
import { generateBrandedPdf } from "@/lib/pdf-brand";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import type { Role } from "@prisma/client";

const CATEGORY_LABELS: Record<string, string> = {
  ULYKKE: "Ulykke",
  NESTEN: "Nestenulykke",
  FARLIG_SITUASJON: "Farlig situasjon",
  OBSERVASJON: "Observasjon/RUH",
  MILJØ: "Miljøhendelse",
};

const STATUS_LABELS: Record<string, string> = {
  NEW: "Ny",
  IN_REVIEW: "Under behandling",
  COMPLETED: "Ferdigbehandlet",
  CLOSED: "Lukket",
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
  if (!permissions.canReadRuh && !permissions.canReadOwnRuh) {
    return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });
  }

  const { id } = await params;
  const tenantId = session.user.tenantId;

  const ruh = await prisma.ruhReport.findFirst({
    where: { id, tenantId },
    include: {
      tenant: { select: { name: true, orgNumber: true, logoUrl: true } },
      reportedByUser: { select: { name: true, email: true } },
    },
  });

  if (!ruh) {
    return NextResponse.json({ error: "RUH-rapport ikke funnet" }, { status: 404 });
  }

  const now = new Date();

  const pdfBuffer = await generateBrandedPdf({
    type: "operational",
    reportLabel: "RUH-rapport",
    title: ruh.title,
    subtitle: `${CATEGORY_LABELS[ruh.category] ?? ruh.category} · ${fmtDate(ruh.occurredAt)}`,
    tenant: {
      name: ruh.tenant.name,
      orgNumber: ruh.tenant.orgNumber,
      logoUrl: ruh.tenant.logoUrl,
    },
    generatedBy: ruh.reportedByUser?.name ?? ruh.reportedByUser?.email ?? "Ukjent",
    generatedAt: now,
    legalReference: "AML § 5-2 (3)b, IK-HMS § 5 nr. 7",
    sections: [
      {
        title: "Hendelsesdetaljer",
        legalRef: "AML § 5-2 (3)b",
        content: [
          {
            type: "keyvalue",
            pairs: [
              ["Type", CATEGORY_LABELS[ruh.category] ?? ruh.category],
              ["Status", STATUS_LABELS[ruh.status] ?? ruh.status],
              ["Dato", fmtDate(ruh.occurredAt)],
              ["Sted", (ruh as any).location ?? "–"],
              ["Innrapportert av", ruh.reportedByUser?.name ?? ruh.reportedByUser?.email ?? "–"],
              ...(ruh.involvedPersons ? [["Involverte", ruh.involvedPersons] as [string, string]] : []),
              ...(ruh.witnessName ? [["Vitne", ruh.witnessName] as [string, string]] : []),
              ["Personskade", ruh.injuryOccurred ? "Ja" : "Nei"],
            ] as [string, string][],
          },
          { type: "paragraph", text: ruh.description },
        ],
      },
      ...(ruh.injuryOccurred && ruh.injuryDescription
        ? [{ title: "Skadebeskrivelse", content: [{ type: "paragraph" as const, text: ruh.injuryDescription }] }]
        : []),
      ...(ruh.immediateAction
        ? [{ title: "Umiddelbare tiltak", content: [{ type: "paragraph" as const, text: ruh.immediateAction }] }]
        : []),
      ...(ruh.suggestedActions
        ? [{ title: "Foreslåtte tiltak", content: [{ type: "paragraph" as const, text: ruh.suggestedActions }] }]
        : []),
      ...(ruh.reviewComment
        ? [{ title: "Behandlingskommentar", content: [{ type: "paragraph" as const, text: ruh.reviewComment }] }]
        : []),
    ],
  });

  const filename = `RUH-rapport-${(ruh as any).ruhNummer ?? id}-${format(now, "yyyy-MM-dd")}.pdf`;

  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": pdfBuffer.byteLength.toString(),
    },
  });
}
