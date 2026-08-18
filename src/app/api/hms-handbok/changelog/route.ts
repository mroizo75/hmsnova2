import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPermissions } from "@/lib/permissions";
import { generateBrandedPdf, type PdfSection } from "@/lib/pdf-brand";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import type { Role } from "@prisma/client";

/**
 * Endringslogg-PDF for HMS Håndbok.
 * Dokumenterer alle versjoner, endringer, godkjenninger og signaturer.
 * Ment for Arbeidstilsynet som bevis på kontinuerlig forbedring (IK-HMS § 5 nr. 8).
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId || !session.user.role) {
    return NextResponse.json({ error: "Ikke autorisert" }, { status: 401 });
  }

  const permissions = getPermissions(session.user.role as Role);
  if (!permissions.canReadDocuments) {
    return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });
  }

  const tenantId = session.user.tenantId;
  const now = new Date();

  const [tenant, versions, improvementLogs] = await Promise.all([
    prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: { name: true, orgNumber: true, address: true, logoUrl: true },
    }),
    prisma.handbookVersion.findMany({
      where: { handbook: { tenantId } },
      orderBy: { createdAt: "desc" },
      include: {
        approvedBy: { select: { name: true } },
        signatures: {
          include: { user: { select: { name: true, email: true } } },
          orderBy: { signedAt: "desc" },
        },
        _count: { select: { sections: true } },
      },
    }),
    prisma.improvementLog.findMany({
      where: { tenantId },
      orderBy: { changedAt: "desc" },
      take: 50,
      include: {
        suggestion: { select: { title: true, legalBasis: true } },
      },
    }),
  ]);

  function fmtDate(d: Date | string | null | undefined) {
    if (!d) return "–";
    return format(new Date(d), "d. MMM yyyy", { locale: nb });
  }

  const sections: PdfSection[] = [];

  // Versjonsoversikt
  if (versions.length > 0) {
    sections.push({
      title: "Versjonsoversikt",
      legalRef: "IK-HMS § 5 nr. 8",
      content: [
        {
          type: "table",
          headers: ["Versjon", "Status", "Endringsbeskrivelse", "Godkjent av", "Dato", "Seksjoner", "Signaturer"],
          rows: versions.map((v) => [
            v.version,
            v.status === "APPROVED" ? "Godkjent" : v.status === "DRAFT" ? "Utkast" : v.status === "ARCHIVED" ? "Arkivert" : "Venter",
            v.changeNote ?? "–",
            v.approvedBy?.name ?? "–",
            fmtDate(v.approvedAt ?? v.createdAt),
            v._count.sections,
            v.signatures.length,
          ]),
        },
      ],
    });
  }

  // Detaljert signaturhistorikk per versjon
  for (const version of versions) {
    if (version.signatures.length === 0) continue;

    sections.push({
      title: `Signaturer – Versjon ${version.version}`,
      content: [
        {
          type: "signature-block",
          signatures: version.signatures.map((s) => ({
            name: s.user.name ?? s.user.email,
            date: fmtDate(s.signedAt),
            comment: s.comment ?? undefined,
          })),
        },
      ],
    });
  }

  // Forbedringslogg
  if (improvementLogs.length > 0) {
    sections.push({
      title: "Forbedringslogg",
      legalRef: "IK-HMS § 5 nr. 7–8",
      content: [
        {
          type: "table",
          headers: ["Dato", "Type", "Beskrivelse", "Lovhenvisning", "Forslag"],
          rows: improvementLogs.map((log) => [
            fmtDate(log.changedAt),
            log.changeType,
            log.description.length > 100 ? log.description.slice(0, 100) + "…" : log.description,
            log.legalReference ?? "–",
            log.suggestion?.title ?? "–",
          ]),
        },
      ],
    });
  }

  const pdfBuffer = await generateBrandedPdf({
    type: "formal",
    reportLabel: "Endringslogg HMS-håndbok",
    title: `Endringslogg HMS Håndbok – ${tenant.name}`,
    subtitle: `Generert ${fmtDate(now)} · Dokumentasjon av kontinuerlig forbedring`,
    tenant: {
      name: tenant.name,
      orgNumber: tenant.orgNumber,
      address: tenant.address,
      logoUrl: tenant.logoUrl,
    },
    generatedBy: session.user.name ?? session.user.email ?? "Ukjent",
    generatedAt: now,
    legalReference: "IK-HMS § 5 nr. 8: Foreta systematisk overvåking og gjennomgang",
    sections,
  });

  const filename = `Endringslogg-HMS-${tenant.name.replace(/[^a-zA-Z0-9æøåÆØÅ]/g, "-")}-${format(now, "yyyy-MM-dd")}.pdf`;

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": pdfBuffer.byteLength.toString(),
    },
  });
}
