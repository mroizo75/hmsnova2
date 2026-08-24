import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPermissions } from "@/lib/permissions";
import { generateBrandedPdf, type PdfSection } from "@/lib/pdf-brand";
import { getTilsynConfig, type TilsynType, type LiveDataType } from "@/lib/tilsynsrapport-config";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import type { Role } from "@prisma/client";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId || !session.user.role) {
    return NextResponse.json({ error: "Ikke autorisert" }, { status: 401 });
  }

  const permissions = getPermissions(session.user.role as Role);
  if (!permissions.canReadDocuments) {
    return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });
  }

  const type = request.nextUrl.searchParams.get("type") as TilsynType | null;
  if (!type) {
    return NextResponse.json({ error: "Mangler type parameter" }, { status: 400 });
  }

  const config = getTilsynConfig(type);
  if (!config) {
    return NextResponse.json({ error: "Ugyldig tilsynstype" }, { status: 400 });
  }

  const tenantId = session.user.tenantId;
  const now = new Date();
  const twelveMonthsAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

  function fmtDate(d: Date | string | null | undefined) {
    if (!d) return "–";
    return format(new Date(d), "d. MMM yyyy", { locale: nb });
  }

  const [tenant, handbook] = await Promise.all([
    prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: { name: true, orgNumber: true, industry: true, hmsContactName: true, hmsContactPhone: true, address: true, logoUrl: true },
    }),
    prisma.hmsHandbook.findUnique({
      where: { tenantId },
      include: { branding: true },
    }),
  ]);

  let currentVersion = handbook?.currentVersionId
    ? await prisma.handbookVersion.findUnique({
        where: { id: handbook.currentVersionId },
        include: {
          approvedBy: { select: { name: true } },
          sections: { orderBy: { sortOrder: "asc" } },
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
      },
    });
  }

  const sections: PdfSection[] = [];

  // ── Forside / identifikasjon ──────────────────────────────────────────────
  sections.push({
    title: "Virksomhetsinformasjon",
    content: [
      {
        type: "keyvalue",
        pairs: [
          ["Bedrift", tenant.name],
          ["Org.nr.", tenant.orgNumber ?? "–"],
          ["Bransje", tenant.industry ?? "–"],
          ["Adresse", tenant.address ?? "–"],
          ["HMS-ansvarlig", tenant.hmsContactName ?? "–"],
          ["Telefon", tenant.hmsContactPhone ?? "–"],
          ["Tilsynstype", config.label],
          ["Lovhjemmel", config.legalBasis],
          ["Rapport generert", fmtDate(now)],
        ],
      },
    ],
  });

  // ── Relevante seksjoner fra HMS-håndboken ─────────────────────────────────
  // KUN de seksjonene som tilsynet faktisk krever dokumentasjon på
  if (currentVersion && currentVersion.sections.length > 0) {
    const filteredSections = currentVersion.sections.filter(
      (s) => !s.parentId && config.sectionKeys.includes(s.sectionKey),
    );

    for (const section of filteredSections) {
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

      // Inject live-data direkte etter relevant seksjon
      const liveDataForSection = await getLiveDataForSection(section.sectionKey, config.liveData, tenantId, twelveMonthsAgo, now, fmtDate);
      if (liveDataForSection.length > 0) {
        contentBlocks.push(...liveDataForSection);
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
  }

  // ── Tilleggsdata som ikke tilhører en spesifikk seksjon ───────────────────
  if (config.liveData.includes("measures")) {
    const measures = await prisma.measure.findMany({
      where: { tenantId, status: { in: ["PENDING", "IN_PROGRESS"] } },
      select: { title: true, status: true, dueAt: true, category: true },
      orderBy: { dueAt: "asc" },
      take: 20,
    });

    if (measures.length > 0) {
      sections.push({
        title: "Åpne tiltak og handlingsplan",
        legalRef: "IK-HMS § 5 nr. 6–7",
        content: [{
          type: "table" as const,
          headers: ["Tiltak", "Status", "Kategori", "Frist"],
          rows: measures.map((m) => [m.title, m.status, m.category ?? "–", fmtDate(m.dueAt)]),
        }],
      });
    }
  }

  if (config.liveData.includes("employee_reviews")) {
    const reviews = await prisma.employeeReview.findMany({
      where: { tenantId, scheduledDate: { gte: twelveMonthsAgo } },
      select: { status: true, scheduledDate: true, completedDate: true, trivselScore: true, arbeidsmiljoeScore: true },
      orderBy: { scheduledDate: "desc" },
    });

    const completed = reviews.filter((r) => r.status === "GJENNOMFORT" || r.status === "SIGNERT");
    const avgTrivsel = completed.length > 0
      ? (completed.reduce((sum, r) => sum + (r.trivselScore ?? 0), 0) / completed.length).toFixed(1)
      : "–";
    const avgArbeidsmiljo = completed.length > 0
      ? (completed.reduce((sum, r) => sum + (r.arbeidsmiljoeScore ?? 0), 0) / completed.length).toFixed(1)
      : "–";

    sections.push({
      title: "Medarbeidersamtaler",
      legalRef: "AML § 4-2",
      content: [{
        type: "keyvalue",
        pairs: [
          ["Gjennomførte (12 mnd)", completed.length.toString()],
          ["Planlagte totalt", reviews.length.toString()],
          ["Gjennomsnitt trivsel (1–5)", avgTrivsel],
          ["Gjennomsnitt arbeidsmiljø (1–5)", avgArbeidsmiljo],
        ],
      }],
    });
  }

  // ── Generer PDF ───────────────────────────────────────────────────────────
  const branding = handbook?.branding;

  const pdfBuffer = await generateBrandedPdf({
    type: "formal",
    reportLabel: `TILSYNSRAPPORT – ${config.label.toUpperCase()}`,
    title: `Tilsynsrapport: ${config.label}`,
    subtitle: `${tenant.name} · ${fmtDate(now)} · ${config.legalBasis}`,
    tenant: {
      name: tenant.name,
      orgNumber: tenant.orgNumber,
      address: tenant.address,
      logoUrl: branding?.logoUrl ?? tenant.logoUrl,
    },
    generatedBy: session.user.name ?? session.user.email ?? "Ukjent",
    generatedAt: now,
    legalReference: config.legalBasis,
    sections,
    coverPage: true,
  });

  const filename = `Tilsynsrapport-${config.label.replace(/[^a-zA-ZæøåÆØÅ0-9]/g, "-")}-${format(now, "yyyy-MM-dd")}.pdf`;

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

/**
 * Returnerer live-data content blocks som hører under en spesifikk
 * HMS-håndbokseksjon, slik at data vises i kontekst med dokumentasjonen.
 */
async function getLiveDataForSection(
  sectionKey: string,
  enabledData: LiveDataType[],
  tenantId: string,
  twelveMonthsAgo: Date,
  now: Date,
  fmtDate: (d: Date | string | null | undefined) => string,
): Promise<PdfSection["content"]> {
  const content: PdfSection["content"] = [];

  // s3 = Risikovurdering → vis aktive risikoer
  if (sectionKey === "s3" && enabledData.includes("risks")) {
    const risks = await prisma.risk.findMany({
      where: { tenantId },
      select: { title: true, category: true, likelihood: true, consequence: true, score: true, status: true },
      orderBy: { score: "desc" },
      take: 20,
    });
    if (risks.length > 0) {
      content.push({
        type: "paragraph",
        text: `Aktive risikoer i systemet: ${risks.length} registrert`,
      });
      content.push({
        type: "table" as const,
        headers: ["Risiko", "Kategori", "S", "K", "Score", "Status"],
        rows: risks.map((r) => [r.title, r.category, r.likelihood.toString(), r.consequence.toString(), r.score.toString(), r.status]),
      });
    }
  }

  // s4 = Avvikshåndtering → vis avviksstatistikk
  if (sectionKey === "s4" && enabledData.includes("incidents")) {
    const incidents = await prisma.incident.findMany({
      where: { tenantId, occurredAt: { gte: twelveMonthsAgo } },
      select: { avviksnummer: true, title: true, type: true, status: true, occurredAt: true, severity: true },
      orderBy: { occurredAt: "desc" },
      take: 30,
    });

    const openCount = incidents.filter((i) => i.status !== "CLOSED").length;
    const closedCount = incidents.filter((i) => i.status === "CLOSED").length;

    content.push({
      type: "keyvalue",
      pairs: [
        ["Totalt registrert (12 mnd)", incidents.length.toString()],
        ["Åpne", openCount.toString()],
        ["Lukkede", closedCount.toString()],
      ],
    });

    if (incidents.length > 0) {
      content.push({
        type: "table" as const,
        headers: ["Ref.", "Hendelse", "Type", "Status", "Dato", "Alvorlighet"],
        rows: incidents.slice(0, 15).map((i) => [i.avviksnummer ?? "–", i.title, i.type, i.status, fmtDate(i.occurredAt), i.severity?.toString() ?? "–"]),
      });
    }
  }

  // s5 = Opplæring → vis opplæringsstatus
  if (sectionKey === "s5" && enabledData.includes("training")) {
    const trainings = await prisma.training.findMany({
      where: { tenantId },
      select: { title: true, completedAt: true, validUntil: true, isRequired: true },
      orderBy: [{ isRequired: "desc" }, { validUntil: "asc" }],
      take: 30,
    });

    const completed = trainings.filter((t) => t.completedAt);
    const expired = trainings.filter((t) => t.validUntil && new Date(t.validUntil) < now);

    content.push({
      type: "keyvalue",
      pairs: [
        ["Totalt registrert", trainings.length.toString()],
        ["Fullført", completed.length.toString()],
        ["Utløpt/mangler fornyelse", expired.length.toString()],
      ],
    });

    if (trainings.length > 0) {
      content.push({
        type: "table" as const,
        headers: ["Kurs/opplæring", "Obligatorisk", "Fullført", "Gyldig til"],
        rows: trainings.slice(0, 20).map((t) => [
          t.title,
          t.isRequired ? "Ja" : "Nei",
          t.completedAt ? fmtDate(t.completedAt) : "Ikke fullført",
          fmtDate(t.validUntil),
        ]),
      });
    }
  }

  // s7 = Brannvern → vis brannøvelser
  if (sectionKey === "s7" && enabledData.includes("fire_drills")) {
    const fireDrills = await prisma.fireDrill.findMany({
      where: { tenantId, completedAt: { gte: twelveMonthsAgo } },
      select: { title: true, drillType: true, completedAt: true, actualParticipantCount: true, objectivesAchieved: true },
      orderBy: { completedAt: "desc" },
      take: 10,
    });

    if (fireDrills.length > 0) {
      content.push({
        type: "paragraph",
        text: `Gjennomførte brannøvelser siste 12 måneder: ${fireDrills.length}`,
      });
      content.push({
        type: "table" as const,
        headers: ["Øvelse", "Type", "Gjennomført", "Deltakere", "Mål oppnådd"],
        rows: fireDrills.map((d) => [d.title, d.drillType, fmtDate(d.completedAt), d.actualParticipantCount?.toString() ?? "–", d.objectivesAchieved ?? "–"]),
      });
    } else {
      content.push({
        type: "alert" as const,
        text: "Ingen brannøvelser dokumentert siste 12 måneder.",
        severity: "warning" as const,
      });
    }
  }

  // s8 = Vernerunder → vis gjennomførte inspeksjoner
  if (sectionKey === "s8" && enabledData.includes("inspections")) {
    const inspections = await prisma.inspection.findMany({
      where: { tenantId, scheduledDate: { gte: twelveMonthsAgo } },
      select: { title: true, type: true, status: true, scheduledDate: true, completedDate: true },
      orderBy: { scheduledDate: "desc" },
      take: 10,
    });

    if (inspections.length > 0) {
      content.push({
        type: "paragraph",
        text: `Vernerunder/inspeksjoner siste 12 måneder: ${inspections.length}`,
      });
      content.push({
        type: "table" as const,
        headers: ["Inspeksjon", "Type", "Status", "Planlagt", "Gjennomført"],
        rows: inspections.map((i) => [i.title, i.type, i.status, fmtDate(i.scheduledDate), fmtDate(i.completedDate)]),
      });
    }
  }

  // s12 = Kjemikalier → vis stoffkartotek
  if (sectionKey === "s12" && enabledData.includes("chemicals")) {
    const chemicals = await prisma.chemical.findMany({
      where: { tenantId, status: "ACTIVE" },
      select: { productName: true, supplier: true, hazardClass: true, location: true },
      orderBy: { productName: "asc" },
      take: 30,
    });

    if (chemicals.length > 0) {
      content.push({
        type: "paragraph",
        text: `Aktive kjemikalier i stoffkartotek: ${chemicals.length}`,
      });
      content.push({
        type: "table" as const,
        headers: ["Produkt", "Leverandør", "Fareklasse", "Plassering"],
        rows: chemicals.map((c) => [c.productName, c.supplier ?? "–", c.hazardClass ?? "–", c.location ?? "–"]),
      });
    }
  }

  // s15 = Rutiner → vis aktive rutiner
  if (sectionKey === "s15" && enabledData.includes("routines")) {
    const routines = await prisma.routine.findMany({
      where: { tenantId, status: { in: ["ACTIVE", "NEEDS_REVIEW"] } },
      select: { title: true, status: true, lastReviewedAt: true, nextReviewAt: true, category: true },
      orderBy: { title: "asc" },
      take: 20,
    });

    if (routines.length > 0) {
      content.push({
        type: "table" as const,
        headers: ["Rutine", "Kategori", "Status", "Sist gjennomgått", "Neste"],
        rows: routines.map((r) => [r.title, r.category ?? "–", r.status === "ACTIVE" ? "Aktiv" : "Trenger gjennomgang", fmtDate(r.lastReviewedAt), fmtDate(r.nextReviewAt)]),
      });
    }
  }

  return content;
}
