import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPermissions } from "@/lib/permissions";
import { generateBrandedPdf, type PdfSection } from "@/lib/pdf-brand";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import type { Role } from "@prisma/client";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId || !session.user.role) {
    return NextResponse.json({ error: "Ikke autorisert" }, { status: 401 });
  }

  const permissions = getPermissions(session.user.role as Role);
  if (!permissions.canReadDocuments && !permissions.canReadRoutines) {
    return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });
  }

  const tenantId = session.user.tenantId;
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [tenant, handbook, riskAssessments, routines, incidents, trainings] =
    await Promise.all([
      prisma.tenant.findUniqueOrThrow({
        where: { id: tenantId },
        select: { name: true, orgNumber: true, industry: true, hmsContactName: true, hmsContactPhone: true, address: true, logoUrl: true },
      }),
      prisma.hmsHandbook.findUnique({
        where: { tenantId },
        include: {
          reviewedBy: { select: { name: true } },
          branding: true,
        },
      }),
      prisma.riskAssessment.findMany({
        where: { tenantId },
        select: { title: true, assessmentYear: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
        take: 20,
      }),
      prisma.routine.findMany({
        where: { tenantId, status: "ACTIVE" },
        select: { title: true, lastReviewedAt: true, nextReviewAt: true },
        orderBy: { title: "asc" },
        take: 30,
      }),
      prisma.incident.findMany({
        where: { tenantId, occurredAt: { gte: thirtyDaysAgo }, status: { not: "CLOSED" } },
        select: { avviksnummer: true, title: true, type: true, occurredAt: true, severity: true },
        orderBy: { occurredAt: "desc" },
        take: 20,
      }),
      prisma.training.findMany({
        where: { tenantId, completedAt: null },
        select: { title: true, validUntil: true },
        orderBy: { validUntil: "asc" },
        take: 20,
      }),
    ]);

  function fmtDate(d: Date | string | null | undefined) {
    if (!d) return "–";
    return format(new Date(d), "d. MMM yyyy", { locale: nb });
  }

  // Hent gjeldende versjon: currentVersionId -> nyeste APPROVED -> nyeste uansett
  let currentVersion = handbook?.currentVersionId
    ? await prisma.handbookVersion.findUnique({
        where: { id: handbook.currentVersionId },
        include: {
          approvedBy: { select: { name: true } },
          sections: { orderBy: { sortOrder: "asc" } },
          signatures: {
            include: { user: { select: { name: true, email: true } } },
            orderBy: { signedAt: "desc" },
          },
        },
      })
    : null;

  if (!currentVersion && handbook) {
    currentVersion = await prisma.handbookVersion.findFirst({
      where: { handbookId: handbook.id },
      orderBy: { createdAt: "desc" },
      include: {
        approvedBy: { select: { name: true } },
        sections: { orderBy: { sortOrder: "asc" } },
        signatures: {
          include: { user: { select: { name: true, email: true } } },
          orderBy: { signedAt: "desc" },
        },
      },
    });
  }

  const branding = handbook?.branding;
  const versionLabel = currentVersion ? `v${currentVersion.version}` : "";

  const sections: PdfSection[] = [];

  const totalEmployees = await prisma.userTenant.count({
    where: { tenantId },
  });
  const signatureCount = currentVersion?.signatures?.length ?? 0;

  const statusLabel: Record<string, string> = {
    APPROVED: "Godkjent",
    DRAFT: "Utkast – ikke godkjent",
    PENDING_APPROVAL: "Venter på godkjenning",
    ARCHIVED: "Arkivert",
  };

  // Forside-info
  sections.push({
    title: "Om bedriften",
    legalRef: "IK-HMS § 5 nr. 1",
    content: [
      {
        type: "keyvalue",
        pairs: [
          ["Bedrift", tenant.name],
          ["Org.nr.", tenant.orgNumber ?? "–"],
          ["Bransje", tenant.industry ?? "–"],
          ["Adresse", tenant.address ?? "–"],
          ["HMS-kontakt", tenant.hmsContactName ?? "–"],
          ["HMS-telefon", tenant.hmsContactPhone ?? "–"],
        ],
      },
    ],
  });

  // Status og godkjenning
  const statusContent: PdfSection["content"] = [];

  if (currentVersion) {
    statusContent.push({
      type: "status-badge",
      label: "Status",
      status: currentVersion.status === "APPROVED" ? "ok" : currentVersion.status === "DRAFT" ? "warning" : "info",
    });
    statusContent.push({
      type: "keyvalue",
      pairs: [
        ["Versjon", currentVersion.version],
        ["Status", statusLabel[currentVersion.status] ?? currentVersion.status],
        ["Godkjent av", currentVersion.approvedBy?.name ?? "–"],
        ["Godkjent dato", currentVersion.status === "APPROVED" ? fmtDate(currentVersion.approvedAt) : "Ikke godkjent"],
        ["Sist gjennomgått", handbook?.lastReviewedAt ? fmtDate(handbook.lastReviewedAt) : "–"],
        ["Signert av", `${signatureCount} av ${totalEmployees} ansatte${signatureCount >= totalEmployees && totalEmployees > 0 ? " (alle)" : ""}`],
      ],
    });
  } else {
    statusContent.push({
      type: "alert",
      text: "Denne HMS-håndboken er ikke versjonskontrollert. Opprett og godkjenn en versjon for å oppfylle kravene i IK-HMS § 5.",
      severity: "warning",
    });
  }

  sections.push({
    title: "Status og godkjenning",
    legalRef: "IK-HMS § 5 nr. 8",
    content: statusContent,
  });

  // Dynamiske seksjoner fra versjonskontroll
  if (currentVersion && currentVersion.sections.length > 0) {
    for (const section of currentVersion.sections) {
      if (section.parentId) continue;

      const childSections = currentVersion.sections.filter(
        (s) => s.parentId === section.id,
      );

      const contentBlocks: PdfSection["content"] = [];

      if (section.content && section.content.trim() !== "<p></p>") {
        contentBlocks.push({ type: "html", html: section.content });
      }

      if (childSections.length > 0) {
        for (const child of childSections) {
          contentBlocks.push({
            type: "html",
            html: `<h4>${child.sectionNumber} ${child.title}</h4>${child.content}`,
          });
        }
      }

      // Årshjul: legg til live fremdrift fra sjekklisten
      if (section.sectionKey === "s13") {
        const { ANNUAL_HMS_PLAN_STEPS, getCategoryLabel } = await import(
          "@/lib/annual-hms-plan-steps"
        );
        const currentYear = now.getFullYear();
        const completions = await prisma.hmsAnnualPlanCompletion.findMany({
          where: { tenantId, year: currentYear },
          select: { stepKey: true, completedAt: true },
        });
        const completedKeys = new Set(completions.map((c) => c.stepKey));
        const completedCount = completedKeys.size;

        contentBlocks.push({
          type: "paragraph",
          text: `Fremdrift ${currentYear}: ${completedCount} av ${ANNUAL_HMS_PLAN_STEPS.length} aktiviteter fullført (${Math.round((completedCount / ANNUAL_HMS_PLAN_STEPS.length) * 100)} %)`,
        });

        contentBlocks.push({
          type: "table" as const,
          headers: ["Aktivitet", "Kategori", "Status"],
          rows: ANNUAL_HMS_PLAN_STEPS.map((step) => [
            step.title,
            getCategoryLabel(step.category),
            completedKeys.has(step.key) ? "✓ Fullført" : "○ Ikke fullført",
          ]),
        });
      }

      if (contentBlocks.length === 0) {
        contentBlocks.push({ type: "paragraph", text: "Ikke utfylt." });
      }

      sections.push({
        title: `${section.sectionNumber}. ${section.title}`,
        legalRef: section.legalRef ?? undefined,
        content: contentBlocks,
      });
    }
  } else {
    // Fallback: live data som før
    sections.push(
      {
        title: "Risikovurderinger",
        legalRef: "IK-HMS § 5 nr. 6, AML § 3-1",
        content: riskAssessments.length > 0
          ? [{
              type: "table" as const,
              headers: ["Tittel", "År", "Sist oppdatert"],
              rows: riskAssessments.map((r) => [r.title, r.assessmentYear?.toString() ?? "–", fmtDate(r.updatedAt)]),
            }]
          : [{ type: "alert" as const, text: "Ingen risikovurderinger er registrert ennå.", severity: "info" as const }],
      },
      {
        title: "Rutiner og prosedyrer",
        legalRef: "IK-HMS § 5 nr. 7, AML § 3-1",
        content: routines.length > 0
          ? [{
              type: "table" as const,
              headers: ["Rutine", "Sist gjennomgått", "Neste gjennomgang"],
              rows: routines.map((r) => [r.title, fmtDate(r.lastReviewedAt), fmtDate(r.nextReviewAt)]),
            }]
          : [{ type: "alert" as const, text: "Ingen aktive rutiner.", severity: "info" as const }],
      },
      {
        title: "Åpne avvik (siste 30 dager)",
        legalRef: "AML § 5-2, IK-HMS § 5 nr. 7",
        content: incidents.length > 0
          ? [{
              type: "table" as const,
              headers: ["Ref.", "Tittel", "Type", "Dato", "Alvorlighet"],
              rows: incidents.map((i) => [i.avviksnummer ?? "–", i.title, i.type, fmtDate(i.occurredAt), i.severity ?? "–"]),
            }]
          : [{ type: "alert" as const, text: "Ingen åpne avvik siste 30 dager.", severity: "info" as const }],
      },
      {
        title: "Aktive opplæringstiltak",
        legalRef: "AML § 3-2, IK-HMS § 5 nr. 4",
        content: trainings.length > 0
          ? [{
              type: "table" as const,
              headers: ["Opplæringstiltak", "Frist"],
              rows: trainings.map((t) => [t.title, fmtDate(t.validUntil)]),
            }]
          : [{ type: "alert" as const, text: "Ingen aktive opplæringstiltak.", severity: "info" as const }],
      },
    );
  }

  // Signaturliste fra versjon
  const versionSignatures = currentVersion?.signatures ?? [];
  const signedUserIds = new Set(versionSignatures.map((s) => s.userId));

  const allEmployees = await prisma.userTenant.findMany({
    where: { tenantId },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  const unsignedEmployees = allEmployees.filter((e) => !signedUserIds.has(e.userId));

  const signatureContent: PdfSection["content"] = [];

  if (versionSignatures.length > 0) {
    signatureContent.push({
      type: "signature-block",
      signatures: versionSignatures.map((s) => ({
        name: s.user.name ?? s.user.email,
        date: fmtDate(s.signedAt),
        comment: s.comment ?? undefined,
      })),
    });
  }

  if (unsignedEmployees.length > 0) {
    signatureContent.push({
      type: "alert",
      text: `${unsignedEmployees.length} ansatt${unsignedEmployees.length > 1 ? "e" : ""} har ikke signert: ${unsignedEmployees.map((e) => e.user.name ?? e.user.email).join(", ")}`,
      severity: versionSignatures.length === 0 ? "danger" : "warning",
    });
  } else if (versionSignatures.length > 0) {
    signatureContent.push({
      type: "alert",
      text: "Alle ansatte har signert denne versjonen.",
      severity: "info",
    });
  }

  sections.push({
    title: `Signaturliste – ${signatureCount} av ${totalEmployees} signert`,
    legalRef: "IK-HMS § 5 nr. 8, AML § 3-1",
    content: signatureContent.length > 0
      ? signatureContent
      : [{ type: "alert" as const, text: "Ingen signaturer registrert for denne versjonen.", severity: "warning" as const }],
  });

  // Endringslogg
  const allVersions = await prisma.handbookVersion.findMany({
    where: { handbook: { tenantId } },
    orderBy: { createdAt: "desc" },
    include: {
      approvedBy: { select: { name: true } },
      _count: { select: { signatures: true } },
    },
  });

  if (allVersions.length > 1) {
    sections.push({
      title: "Endringslogg",
      legalRef: "IK-HMS § 5 nr. 8",
      content: [
        {
          type: "table" as const,
          headers: ["Versjon", "Status", "Endringsbeskrivelse", "Godkjent av", "Dato", "Signaturer"],
          rows: allVersions.map((v) => [
            v.version,
            statusLabel[v.status] ?? v.status,
            v.changeNote ?? "–",
            v.approvedBy?.name ?? "–",
            fmtDate(v.approvedAt ?? v.createdAt),
            v._count.signatures.toString(),
          ]),
        },
      ],
    });
  }

  const headerText = branding?.headerText ?? `HMS Håndbok ${new Date().getFullYear()}`;
  const footerText = branding?.footerText ?? `Konfidensielt – ${tenant.name}`;

  const pdfBuffer = await generateBrandedPdf({
    type: "formal",
    reportLabel: "HMS-HÅNDBOK",
    title: `${headerText} – ${tenant.name}`,
    subtitle: currentVersion
      ? `Versjon ${currentVersion.version} · ${statusLabel[currentVersion.status] ?? currentVersion.status} · Generert ${fmtDate(now)} · IK-HMS § 5`
      : `Generert ${fmtDate(now)} · IK-HMS § 5`,
    tenant: {
      name: tenant.name,
      orgNumber: tenant.orgNumber,
      address: tenant.address,
      logoUrl: branding?.logoUrl ?? tenant.logoUrl,
    },
    generatedBy: session.user.name ?? session.user.email ?? "Ukjent",
    generatedAt: now,
    legalReference: "IK-HMS § 5, AML kap. 3",
    sections,
  });

  const filename = `HMS-handbok-${tenant.name.replace(/[^a-zA-Z0-9æøåÆØÅ]/g, "-")}-${versionLabel}-${format(now, "yyyy-MM-dd")}.pdf`;

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": pdfBuffer.byteLength.toString(),
    },
  });
}

function stripHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<li>/gi, "  • ")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
