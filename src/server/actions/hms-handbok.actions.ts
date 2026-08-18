"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPermissions } from "@/lib/permissions";
import { notifyUsersByRoles } from "@/server/actions/notification.actions";
import type { HandbookVersionStatus } from "@prisma/client";

// ── Standard seksjoner (IK-HMS § 5, AML kap. 3) ─────────────────────────────

const DEFAULT_SECTIONS = [
  {
    sectionKey: "s1",
    sectionNumber: "1",
    title: "HMS-policy og mål",
    content: "<p>Bedriftens overordnede HMS-policy, konkrete mål for helse, miljø og sikkerhet, og hvordan disse følges opp. Målene skal være målbare og gjennomgås minimum årlig.</p>",
    legalRef: "IK-HMS § 5 nr. 4, AML § 3-1",
    sortOrder: 1,
    moduleLink: null,
  },
  {
    sectionKey: "s2",
    sectionNumber: "2",
    title: "Organisasjon, roller og ansvar",
    content: "<p>Daglig leder, HMS-ansvarlig, verneombud, brannvernleder og organisasjonskart. Oversikt over hvordan ansvar, oppgaver og myndighet for HMS-arbeidet er fordelt.</p>",
    legalRef: "IK-HMS § 5 nr. 5, AML § 3-1, § 6-1, § 6-2",
    sortOrder: 2,
    moduleLink: "/dashboard/organisasjonskart",
  },
  {
    sectionKey: "s2b",
    sectionNumber: "3",
    title: "Medvirkning og HMS-organisering",
    content: "<p>Hvordan ansatte medvirker i HMS-arbeidet. Verneombudets rolle, arbeidsmiljøutvalg (AMU) der det er påkrevd, og prosesser for at samlet kunnskap og erfaring utnyttes i HMS-arbeidet.</p>",
    legalRef: "IK-HMS § 5 nr. 3, AML § 6-1, § 6-2, § 7-1, § 7-2",
    sortOrder: 3,
    moduleLink: null,
  },
  {
    sectionKey: "s2c",
    sectionNumber: "4",
    title: "Gjeldende lover og forskrifter",
    content: "<p>Oversikt over de lover og forskrifter i HMS-lovgivningen som gjelder for virksomheten, med særlig fokus på krav som er av spesiell viktighet for bedriftens bransje og aktiviteter.</p>",
    legalRef: "IK-HMS § 5 nr. 1",
    sortOrder: 4,
    moduleLink: null,
  },
  {
    sectionKey: "s3",
    sectionNumber: "5",
    title: "Risikostyring",
    content: "<p>Prinsipp for risikostyring, metode for risikovurdering og tiltaksstyring.</p>",
    legalRef: "IK-HMS § 5 nr. 6, AML § 3-1",
    sortOrder: 5,
    moduleLink: "/dashboard/risks",
  },
  {
    sectionKey: "s4",
    sectionNumber: "6",
    title: "Avvik, hendelser og forbedring",
    content: "<p>Avviksprosess, alvorlige hendelser, trendanalyse og RUH-rapportering. Meldeplikt til Arbeidstilsynet og politi ved alvorlige personskader og dødsfall.</p>",
    legalRef: "AML § 5-1, § 5-2, § 5-3, IK-HMS § 5 nr. 7",
    sortOrder: 6,
    moduleLink: "/dashboard/incidents",
  },
  {
    sectionKey: "s5",
    sectionNumber: "7",
    title: "Kompetanse og opplæring",
    content: "<p>Kompetansekartlegging, påkrevd opplæring, opplæringsplan for nyansatte og dokumentasjon av gjennomført opplæring.</p>",
    legalRef: "AML § 3-2, IK-HMS § 5 nr. 2",
    sortOrder: 7,
    moduleLink: "/dashboard/training",
  },
  {
    sectionKey: "s6",
    sectionNumber: "8",
    title: "Operasjonell kontroll",
    content: "<p>Bransje-spesifikke prosedyrer, SJA og daglige kontroller.</p>",
    legalRef: "AML § 3-1, IK-HMS § 5 nr. 7",
    sortOrder: 8,
    moduleLink: "/dashboard/sja",
  },
  {
    sectionKey: "s7",
    sectionNumber: "9",
    title: "Brannvern og beredskap",
    content: "<p>Brannvernorganisering, slokkeutstyr, evakueringsplan og øvelser.</p>",
    legalRef: "Brann- og eksplosjonsvernloven § 13, forskrift om brannforebygging § 12",
    sortOrder: 9,
    moduleLink: "/dashboard/fire-drills",
  },
  {
    sectionKey: "s8",
    sectionNumber: "10",
    title: "Vernerunder og løpende internkontroll",
    content: "<p>Frekvens, sjekklister, funn og oppfølging av vernerunder.</p>",
    legalRef: "AML § 6-2, IK-HMS § 5 nr. 7",
    sortOrder: 10,
    moduleLink: "/dashboard/inspections",
  },
  {
    sectionKey: "s9",
    sectionNumber: "11",
    title: "Ledelsens gjennomgang",
    content: "<p>Frekvens, deltakere, innhold og beslutninger fra ledelsens gjennomgang.</p>",
    legalRef: "IK-HMS § 5 nr. 8, ISO 45001 kap. 9.3",
    sortOrder: 11,
    moduleLink: "/dashboard/management-reviews",
  },
  {
    sectionKey: "s10",
    sectionNumber: "12",
    title: "Dokumentstyring og systemkontroll",
    content: "<p>Versjonskontroll, tilgang, arkivering og styrende dokumenter.</p>",
    legalRef: "IK-HMS § 5 nr. 2",
    sortOrder: 12,
    moduleLink: "/dashboard/documents",
  },
  {
    sectionKey: "s11",
    sectionNumber: "13",
    title: "Arbeidsmiljø – fysisk og psykososialt",
    content: "<p>Kartlegging av fysisk og psykososialt arbeidsmiljø, medarbeiderundersøkelser, varsling og sykefravær. Systemet for psykososialt arbeidsmiljø gir oversikt over trivsel, arbeidsmiljøundersøkelser og oppfølging.</p>",
    legalRef: "AML § 4-1, § 4-3, Varslerloven § 2",
    sortOrder: 13,
    moduleLink: "/dashboard/wellbeing",
  },
  {
    sectionKey: "s11b",
    sectionNumber: "14",
    title: "Varsling av kritikkverdige forhold",
    content: "<p>Varslingsrutiner, intern varslingskanal, behandlingsprosess for varsler og vern av varslere. Alle ansatte skal ha tilgang til informasjon om hvordan varsling foregår.</p>",
    legalRef: "AML § 2 A-1 til § 2 A-7, Varslerloven",
    sortOrder: 14,
    moduleLink: null,
  },
  {
    sectionKey: "s12",
    sectionNumber: "15",
    title: "Ytre miljø og avfall",
    content: "<p>Miljørisiko, avfallshåndtering, kjemikaliehåndtering og beredskap.</p>",
    legalRef: "Forurensningsloven, Produktkontrolloven, AML § 4-5",
    sortOrder: 15,
    moduleLink: "/dashboard/chemicals",
  },
  {
    sectionKey: "s13",
    sectionNumber: "16",
    title: "Årshjul for HMS-aktiviteter",
    content: "<p>Planlagte HMS-aktiviteter gjennom året med ansvarlige og frister.</p>",
    legalRef: "IK-HMS § 5 nr. 8",
    sortOrder: 16,
    moduleLink: "/dashboard/annual-hms-plan",
  },
  {
    sectionKey: "s14",
    sectionNumber: "17",
    title: "Intern revisjon og systemevaluering",
    content: "<p>Formål, gjennomføring, rapportering og oppfølging av internrevisjoner.</p>",
    legalRef: "IK-HMS § 5 nr. 8, ISO 45001 kap. 9.2",
    sortOrder: 17,
    moduleLink: "/dashboard/audits",
  },
  {
    sectionKey: "s15",
    sectionNumber: "18",
    title: "Rutiner og prosedyrer",
    content: "<p>Oversikt over bedriftens styrende rutiner og instrukser, med lesebekreftelse og gjennomgangspåminnelser. Rutinene kobles til relevante lovkrav og oppdateres ved behov.</p>",
    legalRef: "IK-HMS § 5 nr. 5, AML § 3-1",
    sortOrder: 18,
    moduleLink: "/dashboard/rutiner",
  },
] as const;

// ── Typer ───────────────────────────────────────────────────────────────────

export type HandbookSignaturePublic = {
  id: string;
  userId: string;
  userName: string | null;
  userEmail: string;
  signedAt: Date | string;
  comment: string | null;
};

export type HandbookSectionData = {
  id: string;
  sectionKey: string;
  sectionNumber: string;
  title: string;
  content: string;
  legalRef: string | null;
  sortOrder: number;
  moduleLink: string | null;
  children: HandbookSectionData[];
};

export type HandbookVersionData = {
  id: string;
  version: string;
  status: HandbookVersionStatus;
  changeNote: string | null;
  approvedByName: string | null;
  approvedAt: Date | string | null;
  publishedAt: Date | string | null;
  createdAt: Date | string;
  signatureCount: number;
  totalEmployees: number;
  sections: HandbookSectionData[];
};

export type HandbookData = {
  id: string;
  tenantId: string;
  lastReviewedAt: Date | string | null;
  reviewedByName: string | null;
  currentVersion: HandbookVersionData | null;
  signatures: HandbookSignaturePublic[];
  createdAt: Date | string;
  updatedAt: Date | string;
};

export type AnnualPlanProgress = {
  year: number;
  totalSteps: number;
  completedSteps: number;
  steps: Array<{
    key: string;
    title: string;
    category: string;
    completed: boolean;
    completedAt: string | null;
  }>;
};

export type LiveHandbookStats = {
  activeRiskAssessments: number;
  activeRoutines: number;
  openIncidentsLast30d: number;
  activeTrainings: number;
  lastIncidentAt: Date | string | null;
  lastRiskReviewAt: Date | string | null;
  lastRoutineReviewAt: Date | string | null;
  annualPlanProgress: AnnualPlanProgress | null;
};

// ── Hjelpefunksjoner ─────────────────────────────────────────────────────────

async function getOrCreateHandbook(tenantId: string) {
  const existing = await prisma.hmsHandbook.findUnique({
    where: { tenantId },
    include: {
      versions: {
        where: { status: "APPROVED" },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (existing) {
    if (existing.versions.length === 0) {
      await seedDefaultVersion(existing.id, tenantId);
    }
    return existing;
  }

  const handbook = await prisma.hmsHandbook.create({
    data: { tenantId },
  });

  await seedDefaultVersion(handbook.id, tenantId);
  return handbook;
}

async function seedDefaultVersion(handbookId: string, tenantId: string) {
  const existingVersion = await prisma.handbookVersion.findFirst({
    where: { handbookId },
  });
  if (existingVersion) return;

  const version = await prisma.handbookVersion.create({
    data: {
      handbookId,
      version: "1.0",
      status: "DRAFT",
      changeNote: "Første versjon – standardseksjoner opprettet",
    },
  });

  await prisma.handbookSection.createMany({
    data: DEFAULT_SECTIONS.map((s) => ({
      versionId: version.id,
      sectionKey: s.sectionKey,
      sectionNumber: s.sectionNumber,
      title: s.title,
      content: s.content,
      legalRef: s.legalRef,
      sortOrder: s.sortOrder,
      moduleLink: s.moduleLink,
    })),
  });

  await prisma.hmsHandbook.update({
    where: { id: handbookId },
    data: { currentVersionId: version.id },
  });
}

function buildSectionTree(sections: Array<{
  id: string;
  sectionKey: string;
  sectionNumber: string;
  title: string;
  content: string;
  legalRef: string | null;
  sortOrder: number;
  moduleLink: string | null;
  parentId: string | null;
}>): HandbookSectionData[] {
  const map = new Map<string, HandbookSectionData>();
  const roots: HandbookSectionData[] = [];

  for (const s of sections) {
    map.set(s.id, {
      id: s.id,
      sectionKey: s.sectionKey,
      sectionNumber: s.sectionNumber,
      title: s.title,
      content: s.content,
      legalRef: s.legalRef,
      sortOrder: s.sortOrder,
      moduleLink: s.moduleLink,
      children: [],
    });
  }

  for (const s of sections) {
    const node = map.get(s.id)!;
    if (s.parentId && map.has(s.parentId)) {
      map.get(s.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  roots.sort((a, b) => a.sortOrder - b.sortOrder);
  for (const node of map.values()) {
    node.children.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  return roots;
}

// ── Actions ──────────────────────────────────────────────────────────────────

export async function getHandbookData(tenantId: string): Promise<{
  success: true;
  handbook: HandbookData;
  stats: LiveHandbookStats;
} | { success: false; error: string }> {
  try {
    await getOrCreateHandbook(tenantId);

    const fullHandbook = await prisma.hmsHandbook.findUniqueOrThrow({
      where: { tenantId },
      include: {
        reviewedBy: { select: { id: true, name: true } },
        signatures: {
          include: { user: { select: { id: true, name: true, email: true } } },
          orderBy: { signedAt: "desc" },
        },
        versions: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            approvedBy: { select: { name: true } },
            sections: { orderBy: { sortOrder: "asc" } },
            signatures: true,
          },
        },
      },
    });

    const currentVersion = fullHandbook.currentVersionId
      ? await prisma.handbookVersion.findUnique({
          where: { id: fullHandbook.currentVersionId },
          include: {
            approvedBy: { select: { name: true } },
            sections: { orderBy: { sortOrder: "asc" } },
            signatures: true,
          },
        })
      : fullHandbook.versions[0] ?? null;

    const totalEmployees = await prisma.userTenant.count({
      where: { tenantId },
    });

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      activeRiskAssessments,
      activeRoutines,
      openIncidentsLast30d,
      activeTrainings,
      lastIncident,
      lastRiskReview,
      lastRoutineReview,
    ] = await Promise.all([
      prisma.riskAssessment.count({ where: { tenantId } }),
      prisma.routine.count({ where: { tenantId, status: "ACTIVE" } }),
      prisma.incident.count({
        where: {
          tenantId,
          occurredAt: { gte: thirtyDaysAgo },
          status: { not: "CLOSED" },
        },
      }),
      prisma.training.count({ where: { tenantId, completedAt: null } }),
      prisma.incident.findFirst({
        where: { tenantId },
        orderBy: { occurredAt: "desc" },
        select: { occurredAt: true },
      }),
      prisma.riskAssessment.findFirst({
        where: { tenantId },
        orderBy: { updatedAt: "desc" },
        select: { updatedAt: true },
      }),
      prisma.routine.findFirst({
        where: { tenantId, status: "ACTIVE" },
        orderBy: { lastReviewedAt: "desc" },
        select: { lastReviewedAt: true },
      }),
    ]);

    const versionData: HandbookVersionData | null = currentVersion
      ? {
          id: currentVersion.id,
          version: currentVersion.version,
          status: currentVersion.status,
          changeNote: currentVersion.changeNote,
          approvedByName: currentVersion.approvedBy?.name ?? null,
          approvedAt: currentVersion.approvedAt,
          publishedAt: currentVersion.publishedAt,
          createdAt: currentVersion.createdAt,
          signatureCount: currentVersion.signatures.length,
          totalEmployees,
          sections: buildSectionTree(currentVersion.sections),
        }
      : null;

    return {
      success: true,
      handbook: {
        id: fullHandbook.id,
        tenantId: fullHandbook.tenantId,
        lastReviewedAt: fullHandbook.lastReviewedAt,
        reviewedByName: fullHandbook.reviewedBy?.name ?? null,
        currentVersion: versionData,
        signatures: fullHandbook.signatures.map((s) => ({
          id: s.id,
          userId: s.userId,
          userName: s.user.name,
          userEmail: s.user.email,
          signedAt: s.signedAt,
          comment: s.comment,
        })),
        createdAt: fullHandbook.createdAt,
        updatedAt: fullHandbook.updatedAt,
      },
      stats: {
        activeRiskAssessments,
        activeRoutines,
        openIncidentsLast30d,
        activeTrainings,
        lastIncidentAt: lastIncident?.occurredAt ?? null,
        lastRiskReviewAt: lastRiskReview?.updatedAt ?? null,
        lastRoutineReviewAt: lastRoutineReview?.lastReviewedAt ?? null,
        annualPlanProgress: await getAnnualPlanProgress(tenantId),
      },
    };
  } catch {
    return { success: false, error: "Kunne ikke laste HMS Håndbok" };
  }
}

async function getAnnualPlanProgress(
  tenantId: string,
): Promise<AnnualPlanProgress | null> {
  try {
    const { ANNUAL_HMS_PLAN_STEPS, getCategoryLabel } = await import(
      "@/lib/annual-hms-plan-steps"
    );
    const currentYear = new Date().getFullYear();

    const completions = await prisma.hmsAnnualPlanCompletion.findMany({
      where: { tenantId, year: currentYear },
      select: { stepKey: true, completedAt: true },
    });

    const completedMap = new Map(
      completions.map((c) => [c.stepKey, c.completedAt]),
    );

    return {
      year: currentYear,
      totalSteps: ANNUAL_HMS_PLAN_STEPS.length,
      completedSteps: completions.length,
      steps: ANNUAL_HMS_PLAN_STEPS.map((step) => ({
        key: step.key,
        title: step.title,
        category: getCategoryLabel(step.category),
        completed: completedMap.has(step.key),
        completedAt: completedMap.get(step.key)?.toISOString() ?? null,
      })),
    };
  } catch {
    return null;
  }
}

// ── Versjonskontroll ────────────────────────────────────────────────────────

const createDraftSchema = z.object({ tenantId: z.string().min(1), changeNote: z.string().optional() });

export async function createNewDraft(
  input: z.infer<typeof createDraftSchema>,
): Promise<{ success: boolean; versionId?: string; error?: string }> {
  try {
    const { tenantId, changeNote } = createDraftSchema.parse(input);
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.tenantId !== tenantId) {
      return { success: false, error: "Ikke autorisert" };
    }
    const permissions = getPermissions(session.user.role as import("@prisma/client").Role);
    if (!permissions.canUpdateSettings) return { success: false, error: "Ingen tilgang" };

    const handbook = await getOrCreateHandbook(tenantId);

    const existingDraft = await prisma.handbookVersion.findFirst({
      where: { handbookId: handbook.id, status: "DRAFT" },
    });
    if (existingDraft) return { success: false, error: "Det finnes allerede et utkast (v" + existingDraft.version + ")" };

    const currentVersion = handbook.currentVersionId
      ? await prisma.handbookVersion.findUnique({
          where: { id: handbook.currentVersionId },
          include: { sections: true },
        })
      : await prisma.handbookVersion.findFirst({
          where: { handbookId: handbook.id },
          orderBy: { createdAt: "desc" },
          include: { sections: true },
        });

    const nextVersion = bumpVersion(currentVersion?.version ?? "0.9");

    const newVersion = await prisma.handbookVersion.create({
      data: {
        handbookId: handbook.id,
        version: nextVersion,
        status: "DRAFT",
        changeNote: changeNote ?? null,
        basedOnVersionId: currentVersion?.id ?? null,
      },
    });

    if (currentVersion?.sections && currentVersion.sections.length > 0) {
      await prisma.handbookSection.createMany({
        data: currentVersion.sections.map((s) => ({
          versionId: newVersion.id,
          parentId: null,
          sectionKey: s.sectionKey,
          sectionNumber: s.sectionNumber,
          title: s.title,
          content: s.content,
          legalRef: s.legalRef,
          sortOrder: s.sortOrder,
          moduleLink: s.moduleLink,
        })),
      });
    }

    revalidatePath("/dashboard/hms-handbok");
    return { success: true, versionId: newVersion.id };
  } catch {
    return { success: false, error: "Kunne ikke opprette utkast" };
  }
}

const updateSectionSchema = z.object({
  sectionId: z.string().min(1),
  title: z.string().min(1).optional(),
  content: z.string().optional(),
  legalRef: z.string().optional(),
});

export async function updateDraftSection(
  input: z.infer<typeof updateSectionSchema>,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { sectionId, ...data } = updateSectionSchema.parse(input);
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return { success: false, error: "Ikke autorisert" };

    const section = await prisma.handbookSection.findUniqueOrThrow({
      where: { id: sectionId },
      include: {
        version: {
          include: { handbook: true },
        },
      },
    });

    if (section.version.handbook.tenantId !== session.user.tenantId) {
      return { success: false, error: "Ikke autorisert" };
    }
    if (section.version.status !== "DRAFT") {
      return { success: false, error: "Kan kun redigere seksjoner i utkast" };
    }

    const permissions = getPermissions(session.user.role as import("@prisma/client").Role);
    if (!permissions.canUpdateSettings) return { success: false, error: "Ingen tilgang" };

    await prisma.handbookSection.update({
      where: { id: sectionId },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.content !== undefined && { content: data.content }),
        ...(data.legalRef !== undefined && { legalRef: data.legalRef || null }),
      },
    });

    revalidatePath("/dashboard/hms-handbok");
    return { success: true };
  } catch {
    return { success: false, error: "Kunne ikke oppdatere seksjon" };
  }
}

const submitForApprovalSchema = z.object({ versionId: z.string().min(1) });

export async function submitForApproval(
  input: z.infer<typeof submitForApprovalSchema>,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { versionId } = submitForApprovalSchema.parse(input);
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return { success: false, error: "Ikke autorisert" };

    const version = await prisma.handbookVersion.findUniqueOrThrow({
      where: { id: versionId },
      include: { handbook: true },
    });

    if (version.handbook.tenantId !== session.user.tenantId) {
      return { success: false, error: "Ikke autorisert" };
    }
    if (version.status !== "DRAFT") {
      return { success: false, error: "Kun utkast kan sendes til godkjenning" };
    }

    await prisma.handbookVersion.update({
      where: { id: versionId },
      data: { status: "PENDING_APPROVAL" },
    });

    notifyUsersByRoles(version.handbook.tenantId, ["ADMIN", "HMS"], {
      type: "HANDBOOK_APPROVAL_REQUESTED",
      title: "HMS Håndbok krever godkjenning",
      message: `Versjon ${version.version} er sendt til godkjenning`,
      link: "/dashboard/hms-handbok",
    }).catch(() => {});

    revalidatePath("/dashboard/hms-handbok");
    return { success: true };
  } catch {
    return { success: false, error: "Kunne ikke sende til godkjenning" };
  }
}

const approveVersionSchema = z.object({ versionId: z.string().min(1) });

export async function approveVersion(
  input: z.infer<typeof approveVersionSchema>,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { versionId } = approveVersionSchema.parse(input);
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return { success: false, error: "Ikke autorisert" };

    const permissions = getPermissions(session.user.role as import("@prisma/client").Role);
    if (!permissions.canUpdateSettings && !permissions.canApproveDocuments) {
      return { success: false, error: "Kun admin/HMS kan godkjenne" };
    }

    const version = await prisma.handbookVersion.findUniqueOrThrow({
      where: { id: versionId },
      include: { handbook: true },
    });

    if (version.handbook.tenantId !== session.user.tenantId) {
      return { success: false, error: "Ikke autorisert" };
    }
    if (version.status !== "PENDING_APPROVAL") {
      return { success: false, error: "Versjonen er ikke til godkjenning" };
    }

    // Arkiver tidligere godkjent versjon
    if (version.handbook.currentVersionId && version.handbook.currentVersionId !== versionId) {
      await prisma.handbookVersion.update({
        where: { id: version.handbook.currentVersionId },
        data: { status: "ARCHIVED" },
      });
    }

    const now = new Date();
    await prisma.handbookVersion.update({
      where: { id: versionId },
      data: {
        status: "APPROVED",
        approvedById: session.user.id,
        approvedAt: now,
        publishedAt: now,
      },
    });

    await prisma.hmsHandbook.update({
      where: { id: version.handbookId },
      data: {
        currentVersionId: versionId,
        lastReviewedAt: now,
        reviewedById: session.user.id,
      },
    });

    notifyUsersByRoles(version.handbook.tenantId, ["EMPLOYEE", "VERNEOMBUD", "HMS", "ADMIN"], {
      type: "HANDBOOK_NEW_VERSION",
      title: "Ny HMS Håndbok-versjon publisert",
      message: `Versjon ${version.version} er godkjent – vennligst les og signer`,
      link: "/dashboard/hms-handbok",
    }).catch(() => {});

    revalidatePath("/dashboard/hms-handbok");
    return { success: true };
  } catch {
    return { success: false, error: "Kunne ikke godkjenne versjonen" };
  }
}

const rejectDraftSchema = z.object({
  versionId: z.string().min(1),
  rejectedNote: z.string().min(1, "Begrunnelse er påkrevd"),
});

export async function rejectDraft(
  input: z.infer<typeof rejectDraftSchema>,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { versionId, rejectedNote } = rejectDraftSchema.parse(input);
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return { success: false, error: "Ikke autorisert" };

    const permissions = getPermissions(session.user.role as import("@prisma/client").Role);
    if (!permissions.canUpdateSettings && !permissions.canApproveDocuments) {
      return { success: false, error: "Kun admin/HMS kan avvise" };
    }

    const version = await prisma.handbookVersion.findUniqueOrThrow({
      where: { id: versionId },
      include: { handbook: true },
    });

    if (version.handbook.tenantId !== session.user.tenantId) {
      return { success: false, error: "Ikke autorisert" };
    }
    if (version.status !== "PENDING_APPROVAL") {
      return { success: false, error: "Versjonen er ikke til godkjenning" };
    }

    await prisma.handbookVersion.update({
      where: { id: versionId },
      data: { status: "DRAFT", rejectedNote },
    });

    revalidatePath("/dashboard/hms-handbok");
    return { success: true };
  } catch {
    return { success: false, error: "Kunne ikke avvise utkastet" };
  }
}

// ── Signering ───────────────────────────────────────────────────────────────

const signHandbookSchema = z.object({
  tenantId: z.string().min(1),
  versionId: z.string().optional(),
  comment: z.string().max(1000).optional(),
});

export async function signHandbook(
  input: z.infer<typeof signHandbookSchema>,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { tenantId, versionId, comment } = signHandbookSchema.parse(input);
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.tenantId !== tenantId) {
      return { success: false, error: "Ikke autorisert" };
    }

    const handbook = await getOrCreateHandbook(tenantId);

    const targetVersionId = versionId ?? handbook.currentVersionId ?? undefined;

    await prisma.handbookSignature.create({
      data: {
        handbookId: handbook.id,
        versionId: targetVersionId ?? null,
        userId: session.user.id,
        comment: comment ?? null,
      },
    });

    revalidatePath("/dashboard/hms-handbok");
    return { success: true };
  } catch {
    return { success: false, error: "Kunne ikke lagre signatur" };
  }
}

// ── Gjennomgang ─────────────────────────────────────────────────────────────

const markReviewedSchema = z.object({ tenantId: z.string().min(1) });

export async function markHandbookReviewed(
  input: z.infer<typeof markReviewedSchema>,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { tenantId } = markReviewedSchema.parse(input);
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.tenantId !== tenantId) {
      return { success: false, error: "Ikke autorisert" };
    }
    const permissions = getPermissions(session.user.role as import("@prisma/client").Role);
    if (!permissions.canReadDocuments) return { success: false, error: "Ingen tilgang" };

    await getOrCreateHandbook(tenantId);
    await prisma.hmsHandbook.update({
      where: { tenantId },
      data: { lastReviewedAt: new Date(), reviewedById: session.user.id },
    });

    revalidatePath("/dashboard/hms-handbok");
    return { success: true };
  } catch {
    return { success: false, error: "Kunne ikke lagre gjennomgang" };
  }
}

// ── Versjonshistorikk og endringslogg ───────────────────────────────────────

export async function getVersionHistory(tenantId: string) {
  const handbook = await prisma.hmsHandbook.findUnique({
    where: { tenantId },
  });
  if (!handbook) return [];

  return prisma.handbookVersion.findMany({
    where: { handbookId: handbook.id },
    orderBy: { createdAt: "desc" },
    include: {
      approvedBy: { select: { name: true } },
      _count: { select: { signatures: true, sections: true } },
    },
  });
}

export async function getDraftVersion(tenantId: string) {
  const handbook = await prisma.hmsHandbook.findUnique({ where: { tenantId } });
  if (!handbook) return null;

  return prisma.handbookVersion.findFirst({
    where: { handbookId: handbook.id, status: { in: ["DRAFT", "PENDING_APPROVAL"] } },
    include: {
      sections: { orderBy: { sortOrder: "asc" } },
      approvedBy: { select: { name: true } },
    },
  });
}

export async function getHandbookSuggestions(tenantId: string) {
  return prisma.improvementSuggestion.findMany({
    where: {
      tenantId,
      targetSectionKey: { not: null },
      status: "PENDING",
    },
    orderBy: { priority: "desc" },
    take: 20,
  });
}

// ── Mal-import (superadmin) ──────────────────────────────────────────────────

const applyTemplateSchema = z.object({
  tenantId: z.string().min(1),
  industryKey: z.string().min(1),
  variables: z.record(z.string()),
});

export async function applyHandbookTemplate(
  input: z.infer<typeof applyTemplateSchema>,
): Promise<{ success: boolean; error?: string; sectionsUpdated?: number }> {
  try {
    const { tenantId, industryKey, variables } = applyTemplateSchema.parse(input);

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return { success: false, error: "Ikke autorisert" };

    const role = session.user.role as import("@prisma/client").Role;
    if (role !== "SUPERADMIN" && role !== "SUPPORT") {
      return { success: false, error: "Kun superadmin/support kan importere maler" };
    }

    const { buildIndustryTemplate, replaceTemplateVariables } = await import(
      "@/lib/handbook-templates"
    );

    const bransjeModules = (await import("@/lib/bransje-modules")).BRANSJE_MODULES;
    const bransjeLabel = bransjeModules[industryKey]?.label ?? industryKey;
    const template = buildIndustryTemplate(industryKey, bransjeLabel);

    const handbook = await getOrCreateHandbook(tenantId);

    let draftVersion = await prisma.handbookVersion.findFirst({
      where: { handbookId: handbook.id, status: "DRAFT" },
      include: { sections: true },
    });

    if (!draftVersion) {
      const currentVersion = handbook.currentVersionId
        ? await prisma.handbookVersion.findUnique({
            where: { id: handbook.currentVersionId },
          })
        : null;

      const newVersionNumber = currentVersion
        ? bumpVersion(currentVersion.version)
        : "1.0";

      draftVersion = await prisma.handbookVersion.create({
        data: {
          handbookId: handbook.id,
          version: newVersionNumber,
          status: "DRAFT",
          changeNote: `Importert bransjemal: ${bransjeLabel}`,
        },
        include: { sections: true },
      });

      if (currentVersion) {
        const existingSections = await prisma.handbookSection.findMany({
          where: { versionId: currentVersion.id },
        });
        if (existingSections.length > 0) {
          await prisma.handbookSection.createMany({
            data: existingSections.map((s) => ({
              versionId: draftVersion!.id,
              sectionKey: s.sectionKey,
              sectionNumber: s.sectionNumber,
              title: s.title,
              content: s.content,
              legalRef: s.legalRef,
              sortOrder: s.sortOrder,
              moduleLink: s.moduleLink,
              parentId: null,
            })),
          });

          draftVersion = await prisma.handbookVersion.findUniqueOrThrow({
            where: { id: draftVersion.id },
            include: { sections: true },
          });
        }
      }
    }

    let updatedCount = 0;
    for (const tplSection of template.sections) {
      const processedContent = replaceTemplateVariables(
        tplSection.content,
        variables,
      );

      const existing = draftVersion.sections.find(
        (s) => s.sectionKey === tplSection.sectionKey,
      );

      if (existing) {
        await prisma.handbookSection.update({
          where: { id: existing.id },
          data: { content: processedContent },
        });
      } else {
        const defaultSection = DEFAULT_SECTIONS.find(
          (ds) => ds.sectionKey === tplSection.sectionKey,
        );
        if (defaultSection) {
          await prisma.handbookSection.create({
            data: {
              versionId: draftVersion.id,
              sectionKey: tplSection.sectionKey,
              sectionNumber: defaultSection.sectionNumber,
              title: defaultSection.title,
              content: processedContent,
              legalRef: defaultSection.legalRef,
              sortOrder: defaultSection.sortOrder,
              moduleLink: defaultSection.moduleLink,
            },
          });
        }
      }
      updatedCount++;
    }

    return { success: true, sectionsUpdated: updatedCount };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ukjent feil";
    return { success: false, error: message };
  }
}

// ── Hjelpefunksjoner ────────────────────────────────────────────────────────

function bumpVersion(current: string): string {
  const parts = current.split(".");
  const major = parseInt(parts[0] ?? "1", 10);
  const minor = parseInt(parts[1] ?? "0", 10);
  return `${major}.${minor + 1}`;
}
