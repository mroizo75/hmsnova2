"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPermissions } from "@/lib/permissions";
import { Resend } from "resend";
import { AuditLog } from "@/lib/audit-log";
import { createOnboardingInvoice } from "@/server/actions/invoice.actions";
import { getBindingPrice } from "@/lib/subscription";
import { provisionIndustryPackage } from "@/server/actions/industry-provision.actions";
import { BASE_SIMPLE_MODULES, BRANSJE_MODULES } from "@/lib/bransje-modules";
import { menuPathsToWidgetIds } from "@/lib/menu-widget-sync";
import type { Role } from "@prisma/client";

const resend = new Resend(process.env.RESEND_API_KEY);

// ── Tilsynsklar-veiviser typer ──────────────────────────────────────────────

export type SetupGuideStep = {
  key: string;
  title: string;
  description: string;
  href: string;
  completed: boolean;
  icon: string;
  mandatory: boolean;
};

export type SetupGuidePhase = "quick" | "full";

export type SetupGuideGroup = {
  key: string;
  title: string;
  legalRef: string;
  phase: SetupGuidePhase;
  steps: SetupGuideStep[];
  completedCount: number;
  totalCount: number;
  percentage: number;
};

export type SetupGuideProgress = {
  steps: SetupGuideStep[];
  groups: SetupGuideGroup[];
  totalCompleted: number;
  totalSteps: number;
  hidden: boolean;
  completedCount: number;
  totalCount: number;
  compliancePercentage: number;
  quickCompletedCount: number;
  quickTotalCount: number;
  quickPercentage: number;
  fullCompletedCount: number;
  fullTotalCount: number;
  fullPercentage: number;
  nextRecommendedAction: SetupGuideStep | null;
  serviceOfferDismissed: boolean;
};

// ── Schemas ──────────────────────────────────────────────────────────────────

const completeStartpakkeSchema = z.object({
  tenantId: z.string().min(1),
  bransje: z.string().min(1),
});

// ── Actions ──────────────────────────────────────────────────────────────────

/**
 * Fullfør startpakke-wizard.
 * Setter simpleMenuItems basert på bransjevalg, markerer startpakkeCompleted = true.
 * Fyller IKKE inn innhold – bedriften gjør det selv.
 */
export async function completeStartpakkeSetup(
  input: z.infer<typeof completeStartpakkeSchema>
): Promise<{ success: boolean; error?: string }> {
  try {
    const { tenantId, bransje } = completeStartpakkeSchema.parse(input);

    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.tenantId !== tenantId) {
      return { success: false, error: "Ikke autorisert" };
    }

    const permissions = getPermissions(session.user.role as Role);
    if (!permissions.canUpdateSettings) {
      return { success: false, error: "Kun admin kan fullføre startpakke" };
    }

    const bransjeConfig = BRANSJE_MODULES[bransje];
    if (!bransjeConfig) {
      return { success: false, error: "Ukjent bransje" };
    }

    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        simpleMenuItems: bransjeConfig.modules,
        startpakkeCompleted: true,
        industry: bransje,
        onboardingStatus: "IN_PROGRESS",
        setupGuideHidden: false,
      },
    });

    // Opprett DashboardConfig for admin-brukeren basert på bransje.
    // Flisene speiler enkel meny ved oppstart.
    const widgetIds = menuPathsToWidgetIds(bransjeConfig.modules);
    await prisma.dashboardConfig.upsert({
      where: {
        userId_tenantId: { userId: session.user.id, tenantId },
      },
      create: {
        userId: session.user.id,
        tenantId,
        widgets: widgetIds.map((id, order) => ({ id, order, type: "builtin" })),
      },
      update: {
        widgets: widgetIds.map((id, order) => ({ id, order, type: "builtin" })),
      },
    });

    revalidatePath("/dashboard");
    return { success: true };
  } catch {
    return { success: false, error: "Noe gikk galt under oppsett" };
  }
}

/**
 * Sjekk om startpakke-wizard skal vises for denne brukeren.
 * Vises kun til ADMIN-brukere og kun hvis startpakke ikke er fullført.
 */
export async function shouldShowStartpakke(tenantId: string): Promise<boolean> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role) return false;

    const permissions = getPermissions(session.user.role as Role);
    if (!permissions.canUpdateSettings) return false;

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { startpakkeCompleted: true },
    });

    return !(tenant?.startpakkeCompleted ?? false);
  } catch {
    return false;
  }
}

/**
 * Hopp over startpakke-wizard uten å velge bransje.
 * Markerer startpakkeCompleted slik at wizard ikke vises igjen.
 */
export async function skipStartpakke(tenantId: string): Promise<{ success: boolean }> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.tenantId !== tenantId) {
      return { success: false };
    }

    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        startpakkeCompleted: true,
        simpleMenuItems: BASE_SIMPLE_MODULES,
      },
    });

    revalidatePath("/dashboard");
    return { success: true };
  } catch {
    return { success: false };
  }
}

// ── Tilsynsklar-veiviser ────────────────────────────────────────────────────

type StepDef = Omit<SetupGuideStep, "completed">;

type StepGroupDef = {
  key: string;
  title: string;
  legalRef: string;
  phase: SetupGuidePhase;
  steps: StepDef[];
};

const SETUP_STEP_GROUPS: StepGroupDef[] = [
  {
    key: "grunnleggende",
    title: "Grunnleggende",
    legalRef: "IK-HMS § 5",
    phase: "quick",
    steps: [
      {
        key: "employees",
        title: "Ansatte lagt til",
        description: "Legg til minst én ansatt slik at de kan delta i HMS-arbeidet",
        href: "/dashboard/brukere",
        icon: "Users",
        mandatory: true,
      },
      {
        key: "orgChart",
        title: "Organisasjonskart",
        description: "Definer roller, ansvar og myndighet for HMS (IK-HMS § 5 nr. 5)",
        href: "/dashboard/organisasjonskart",
        icon: "Network",
        mandatory: true,
      },
      {
        key: "handbook",
        title: "HMS-håndbok",
        description: "Fyll inn minst 3 seksjoner i HMS-håndboken",
        href: "/dashboard/hms-handbok",
        icon: "BookOpen",
        mandatory: true,
      },
      {
        key: "signatures",
        title: "Håndbok signert",
        description: "Dokumenter at ansatte har lest og forstått håndboken",
        href: "/dashboard/hms-handbok",
        icon: "PenLine",
        mandatory: true,
      },
    ],
  },
  {
    key: "risikovurdering",
    title: "Risikovurdering",
    legalRef: "IK-HMS § 5 nr. 6",
    phase: "quick",
    steps: [
      {
        key: "riskAssessment",
        title: "Risikovurdering gjennomført",
        description: "Kartlegg farer og vurder risiko (IK-HMS § 5 nr. 6)",
        href: "/dashboard/risks",
        icon: "ShieldAlert",
        mandatory: true,
      },
      {
        key: "riskMeasures",
        title: "Tiltak definert på risikoer",
        description: "Definer minst ett tiltak på en identifisert risiko",
        href: "/dashboard/risks",
        icon: "ClipboardCheck",
        mandatory: true,
      },
    ],
  },
  {
    key: "rutiner",
    title: "Rutiner",
    legalRef: "IK-HMS § 5 nr. 7",
    phase: "quick",
    steps: [
      {
        key: "routinesActive",
        title: "Minst 3 aktive rutiner",
        description: "Opprett og aktiver rutiner for virksomheten",
        href: "/dashboard/rutiner",
        icon: "FileCheck",
        mandatory: true,
      },
      {
        key: "routineAvvik",
        title: "Avviksrutine finnes",
        description: "Opprett en aktiv rutine med kategori AVVIK",
        href: "/dashboard/rutiner",
        icon: "AlertTriangle",
        mandatory: true,
      },
      {
        key: "routineVarsling",
        title: "Varslingsrutine finnes",
        description: "Opprett en aktiv rutine med kategori VARSLING (Varslerloven § 2–4)",
        href: "/dashboard/rutiner",
        icon: "Bell",
        mandatory: true,
      },
    ],
  },
  {
    key: "brannvern",
    title: "Brannvern",
    legalRef: "Brann- og eksplosjonsvernloven § 6, § 13",
    phase: "full",
    steps: [
      {
        key: "fireRoutine",
        title: "Brannvernrutine / rømningsplan",
        description: "Opprett rutine for varsling, evakuering og slokking (Forskrift om brannforebygging § 11-12)",
        href: "/dashboard/rutiner",
        icon: "Flame",
        mandatory: true,
      },
      {
        key: "fireDrill",
        title: "Brannøvelse gjennomført",
        description: "Vurder behov via risikovurdering — anbefalt for virksomheter med overnatting/mange besøkende",
        href: "/dashboard/fire-drills",
        icon: "Siren",
        mandatory: false,
      },
    ],
  },
];

const ALL_STEP_DEFS: StepDef[] = SETUP_STEP_GROUPS.flatMap((g) => g.steps);

function computeWeightedCompliance(steps: SetupGuideStep[]): number {
  let totalWeight = 0;
  let completedWeight = 0;
  for (const step of steps) {
    const w = step.mandatory ? 2 : 1;
    totalWeight += w;
    if (step.completed) completedWeight += w;
  }
  return totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;
}

export async function getSetupGuideProgress(
  tenantId: string,
): Promise<SetupGuideProgress | null> {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        startpakkeCompleted: true,
        setupGuideHidden: true,
        onboardingStatus: true,
        serviceOfferDismissed: true,
      },
    });

    if (!tenant) return null;
    if (tenant.setupGuideHidden) return null;

    const [
      employeeCount,
      orgNodeCount,
      riskCount,
      riskMeasureCount,
      activeRoutineCount,
      avvikRoutineCount,
      varslingRoutineCount,
      brannRoutineCount,
      fireDrillCount,
      handbook,
    ] = await Promise.all([
      prisma.userTenant.count({
        where: { tenantId, role: { not: "ADMIN" } },
      }),
      prisma.orgChartNode.count({ where: { tenantId } }),
      prisma.riskAssessment.count({ where: { tenantId } }),
      prisma.measure.count({
        where: { tenantId, riskId: { not: null } },
      }),
      prisma.routine.count({
        where: { tenantId, status: "ACTIVE" },
      }),
      prisma.routine.count({
        where: { tenantId, category: "AVVIK", status: "ACTIVE" },
      }),
      prisma.routine.count({
        where: { tenantId, category: "VARSLING", status: "ACTIVE" },
      }),
      prisma.routine.count({
        where: {
          tenantId,
          status: "ACTIVE",
          OR: [
            { category: "BRANN" },
            { title: { contains: "brann" } },
            { title: { contains: "Brann" } },
          ],
        },
      }),
      prisma.fireDrill.count({ where: { tenantId } }),
      prisma.hmsHandbook.findUnique({
        where: { tenantId },
        select: { id: true, currentVersionId: true },
      }),
    ]);

    let handbookEdited = false;
    let signatureCount = 0;

    if (handbook?.currentVersionId) {
      const [editedSections, sigCount] = await Promise.all([
        prisma.handbookSection.count({
          where: {
            versionId: handbook.currentVersionId,
            content: { not: { startsWith: "<p>Beskriv" } },
            NOT: { content: { startsWith: "<p>Kartlegging" } },
          },
        }),
        prisma.handbookSignature.count({
          where: { handbookId: handbook.id },
        }),
      ]);
      handbookEdited = editedSections >= 3;
      signatureCount = sigCount;
    }

    const completionMap: Record<string, boolean> = {
      employees: employeeCount >= 1,
      orgChart: orgNodeCount >= 2,
      handbook: handbookEdited,
      signatures: signatureCount >= 1,
      riskAssessment: riskCount >= 1,
      riskMeasures: riskMeasureCount >= 1,
      routinesActive: activeRoutineCount >= 3,
      routineAvvik: avvikRoutineCount >= 1,
      routineVarsling: varslingRoutineCount >= 1,
      fireRoutine: brannRoutineCount >= 1,
      fireDrill: fireDrillCount >= 1,
    };

    const steps: SetupGuideStep[] = ALL_STEP_DEFS.map((step) => ({
      ...step,
      completed: completionMap[step.key] ?? false,
    }));

    const groups: SetupGuideGroup[] = SETUP_STEP_GROUPS.map((groupDef) => {
      const groupSteps = steps.filter((s) =>
        groupDef.steps.some((gs) => gs.key === s.key),
      );
      const done = groupSteps.filter((s) => s.completed).length;
      return {
        key: groupDef.key,
        title: groupDef.title,
        legalRef: groupDef.legalRef,
        phase: groupDef.phase,
        steps: groupSteps,
        completedCount: done,
        totalCount: groupSteps.length,
        percentage: groupSteps.length > 0 ? Math.round((done / groupSteps.length) * 100) : 0,
      };
    });

    const totalCompleted = steps.filter((s) => s.completed).length;

    const quickGroups = groups.filter((g) => g.phase === "quick");
    const fullGroups = groups.filter((g) => g.phase === "full");
    const quickCompleted = quickGroups.reduce((sum, g) => sum + g.completedCount, 0);
    const quickTotal = quickGroups.reduce((sum, g) => sum + g.totalCount, 0);
    const fullCompleted = fullGroups.reduce((sum, g) => sum + g.completedCount, 0);
    const fullTotal = fullGroups.reduce((sum, g) => sum + g.totalCount, 0);

    const nextRecommendedAction =
      steps.filter((s) => !s.completed && s.mandatory)[0] ??
      steps.filter((s) => !s.completed)[0] ??
      null;

    return {
      steps,
      groups,
      totalCompleted,
      totalSteps: steps.length,
      completedCount: totalCompleted,
      totalCount: steps.length,
      compliancePercentage: computeWeightedCompliance(steps),
      quickCompletedCount: quickCompleted,
      quickTotalCount: quickTotal,
      quickPercentage: quickTotal > 0 ? Math.round((quickCompleted / quickTotal) * 100) : 0,
      fullCompletedCount: fullCompleted,
      fullTotalCount: fullTotal,
      fullPercentage: fullTotal > 0 ? Math.round((fullCompleted / fullTotal) * 100) : 0,
      hidden: tenant.setupGuideHidden,
      nextRecommendedAction,
      serviceOfferDismissed: tenant.serviceOfferDismissed,
    };
  } catch {
    return null;
  }
}

const toggleGuideSchema = z.object({
  tenantId: z.string().min(1),
  hidden: z.boolean(),
});

export async function toggleSetupGuideVisibility(
  input: z.infer<typeof toggleGuideSchema>,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { tenantId, hidden } = toggleGuideSchema.parse(input);

    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.tenantId !== tenantId) {
      return { success: false, error: "Ikke autorisert" };
    }

    const permissions = getPermissions(session.user.role as Role);
    if (!permissions.canUpdateSettings) {
      return { success: false, error: "Kun admin kan endre veiviser-visning" };
    }

    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        setupGuideHidden: hidden,
        ...(!hidden ? { startpakkeCompleted: true } : {}),
      },
    });

    revalidatePath("/dashboard");
    return { success: true };
  } catch {
    return { success: false, error: "Noe gikk galt" };
  }
}

export async function dismissTavleBanner(): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.tenantId) {
      return { success: false, error: "Ikke autorisert" };
    }

    const permissions = getPermissions(session.user.role as Role);
    if (!permissions.canUpdateSettings) {
      return { success: false, error: "Kun admin kan skjule banneret" };
    }

    await prisma.tenant.update({
      where: { id: session.user.tenantId },
      data: { tavleBannerDismissed: true },
    });

    revalidatePath("/dashboard");
    return { success: true };
  } catch {
    return { success: false, error: "Noe gikk galt" };
  }
}

// ── Superadmin: Registreringer og aktivering ──────────────────────────────────

const activateTenantSchema = z.object({
  tenantId: z.string().cuid(),
  adminEmail: z.string().email(),
  adminName: z.string().min(2),
  adminPassword: z.string().min(8),
  notes: z.string().optional(),
});

export async function getPendingRegistrations() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return { success: false, error: "Ikke autentisert" };
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user?.isSuperAdmin && !user?.isSupport) {
      return { success: false, error: "Ingen tilgang" };
    }

    const registrations = await prisma.tenant.findMany({
      where: {
        onboardingStatus: {
          in: ["NOT_STARTED", "IN_PROGRESS"],
        },
      },
      include: {
        users: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
        subscription: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return { success: true, data: registrations };
  } catch (error: any) {
    return { success: false, error: error.message || "Kunne ikke hente registreringer" };
  }
}

export async function getRegistrationDetails(tenantId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return { success: false, error: "Ikke autentisert" };
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user?.isSuperAdmin && !user?.isSupport) {
      return { success: false, error: "Ingen tilgang" };
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        users: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                createdAt: true,
              },
            },
          },
        },
        subscription: true,
      },
    });

    if (!tenant) {
      return { success: false, error: "Registrering ikke funnet" };
    }

    return { success: true, data: tenant };
  } catch (error: any) {
    return { success: false, error: error.message || "Kunne ikke hente detaljer" };
  }
}

export async function activateTenant(input: z.infer<typeof activateTenantSchema>) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return { success: false, error: "Ikke autentisert" };
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!currentUser?.isSuperAdmin && !currentUser?.isSupport) {
      return { success: false, error: "Ingen tilgang" };
    }

    const validated = activateTenantSchema.parse(input);
    const normalizedEmail = validated.adminEmail.toLowerCase().trim();

    const tenant = await prisma.tenant.findUnique({
      where: { id: validated.tenantId },
      include: {
        subscription: true,
      },
    });

    if (!tenant) {
      return { success: false, error: "Tenant ikke funnet" };
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        tenants: {
          where: { tenantId: validated.tenantId },
        },
      },
    });

    const hashedPassword = await bcrypt.hash(validated.adminPassword, 10);

    const result = await prisma.$transaction(async (tx) => {
      let adminUser;

      if (existingUser) {
        if (existingUser.tenants.length > 0) {
          throw new Error("Denne bedriften er allerede aktivert med denne admin-brukeren");
        }

        await tx.userTenant.create({
          data: {
            userId: existingUser.id,
            tenantId: validated.tenantId,
            role: "ADMIN",
          },
        });

        adminUser = await tx.user.update({
          where: { id: existingUser.id },
          data: {
            password: hashedPassword,
            name: validated.adminName,
          },
        });
      } else {
        adminUser = await tx.user.create({
          data: {
            email: normalizedEmail,
            name: validated.adminName,
            password: hashedPassword,
            emailVerified: new Date(),
            tenants: {
              create: {
                tenantId: validated.tenantId,
                role: "ADMIN",
              },
            },
          },
        });
      }

      const monthlyPrice = getBindingPrice("1year").monthlyPrice;
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);

      const subscriptionData = {
        plan: "STARTER" as const,
        price: monthlyPrice,
        billingInterval: "MONTHLY" as const,
        status: "ACTIVE" as const,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      };

      let subscription;
      if (tenant.subscription) {
        subscription = await tx.subscription.update({
          where: { tenantId: validated.tenantId },
          data: subscriptionData,
        });
      } else {
        subscription = await tx.subscription.create({
          data: { tenantId: validated.tenantId, ...subscriptionData },
        });
      }

      const updatedTenant = await tx.tenant.update({
        where: { id: validated.tenantId },
        data: {
          status: "ACTIVE",
          trialEndsAt: null,
          onboardingStatus: "ADMIN_CREATED",
          onboardingCompletedAt: new Date(),
          salesRep: currentUser.name || currentUser.email,
          notes: validated.notes
            ? `${tenant.notes ? tenant.notes + "\n\n" : ""}Aktivert av ${currentUser.email}: ${validated.notes}`
            : tenant.notes,
        },
        include: {
          subscription: true,
        },
      });

      return { adminUser, tenant: updatedTenant, subscription };
    });

    if (process.env.RESEND_API_KEY) {
      try {
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL ?? "HMS Nova <noreply@hmsnova.no>",
          to: validated.adminEmail,
          subject: "Velkommen til HMS Nova - Din konto er klar!",
          html: getActivationEmail({
            adminName: validated.adminName,
            companyName: tenant.name,
            email: validated.adminEmail,
            password: validated.adminPassword,
            loginUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/login`,
            dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard`,
          }),
        });
      } catch (emailError) {
        // Don't fail the activation if email fails
      }
    }

    await AuditLog.log(
      tenant.id,
      currentUser.id,
      "TENANT_ACTIVATED",
      "Tenant",
      tenant.id,
      {
        tenantName: tenant.name,
        adminEmail: validated.adminEmail,
        activatedBy: currentUser.email,
      }
    );

    createOnboardingInvoice(tenant.id).catch(() => {});
    await provisionIndustryPackage(tenant.id);

    return {
      success: true,
      data: {
        tenant: result.tenant,
        adminUser: {
          id: result.adminUser.id,
          email: result.adminUser.email,
          name: result.adminUser.name,
        },
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Kunne ikke aktivere tenant" };
  }
}

export async function rejectRegistration(tenantId: string, reason: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return { success: false, error: "Ikke autentisert" };
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!currentUser?.isSuperAdmin && !currentUser?.isSupport) {
      return { success: false, error: "Ingen tilgang" };
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      return { success: false, error: "Tenant ikke funnet" };
    }

    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        status: "CANCELLED",
        notes: `${tenant.notes ? tenant.notes + "\n\n" : ""}AVVIST av ${currentUser.email}: ${reason}`,
      },
    });

    if (process.env.RESEND_API_KEY && tenant.contactEmail) {
      try {
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL ?? "HMS Nova <noreply@hmsnova.no>",
          to: tenant.contactEmail,
          subject: "Angående din registrering hos HMS Nova",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #2d9c92;">Takk for din interesse</h1>
              <p>Hei ${tenant.contactPerson || ""},</p>
              <p>Vi har mottatt din registrering for ${tenant.name}, men vi må dessverre informere deg om følgende:</p>
              <p style="padding: 15px; background: #f5f5f5; border-left: 4px solid #2d9c92;">${reason}</p>
              <p>Ta gjerne kontakt med oss på <a href="mailto:support@hmsnova.com">support@hmsnova.com</a> eller ring oss på <a href="tel:+4799112916">+47 99 11 29 16</a> hvis du har spørsmål.</p>
              <p>Med vennlig hilsen,<br/>HMS Nova Team</p>
            </div>
          `,
        });
      } catch (emailError) {
        // Don't fail rejection if email fails
      }
    }

    await AuditLog.log(
      tenant.id,
      currentUser.id,
      "REGISTRATION_REJECTED",
      "Tenant",
      tenant.id,
      {
        tenantName: tenant.name,
        reason,
        rejectedBy: currentUser.email,
      }
    );

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Kunne ikke avvise registrering" };
  }
}

export async function resendWelcomeEmail(input: {
  tenantId: string;
  userEmail: string;
  newPassword?: string;
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return { success: false, error: "Ikke autentisert" };
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!currentUser?.isSuperAdmin && !currentUser?.isSupport) {
      return { success: false, error: "Ingen tilgang" };
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: input.tenantId },
    });

    if (!tenant) {
      return { success: false, error: "Tenant ikke funnet" };
    }

    const user = await prisma.user.findUnique({
      where: { email: input.userEmail },
    });

    if (!user) {
      return { success: false, error: "Bruker ikke funnet" };
    }

    let passwordToSend = input.newPassword;
    if (passwordToSend) {
      const hashedPassword = await bcrypt.hash(passwordToSend, 10);
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      });
    } else {
      passwordToSend = generateSecurePassword();
      const hashedPassword = await bcrypt.hash(passwordToSend, 10);
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      });
    }

    if (process.env.RESEND_API_KEY) {
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL ?? "HMS Nova <noreply@hmsnova.no>",
        to: input.userEmail,
        subject: "HMS Nova - Nytt passord",
        html: getActivationEmail({
          adminName: user.name || "Bruker",
          companyName: tenant.name,
          email: input.userEmail,
          password: passwordToSend,
          loginUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/login`,
          dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard`,
        }),
      });
    } else {
      return { success: false, error: "E-post er ikke konfigurert (mangler RESEND_API_KEY)" };
    }

    await AuditLog.log(
      tenant.id,
      currentUser.id,
      "WELCOME_EMAIL_RESENT",
      "User",
      user.id,
      {
        userEmail: input.userEmail,
        sentBy: currentUser.email,
      }
    );

    return { success: true, message: "E-post sendt!" };
  } catch (error: any) {
    return { success: false, error: error.message || "Kunne ikke sende e-post" };
  }
}

function generateSecurePassword(): string {
  const length = 12;
  const uppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lowercase = "abcdefghjkmnpqrstuvwxyz";
  const numbers = "23456789";
  const special = "!@#$%&*";
  const all = uppercase + lowercase + numbers + special;

  let password = "";
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];

  for (let i = password.length; i < length; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }

  return password.split("").sort(() => Math.random() - 0.5).join("");
}

function getActivationEmail(data: {
  adminName: string;
  companyName: string;
  email: string;
  password: string;
  loginUrl: string;
  dashboardUrl: string;
}) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f5f5f5; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <tr>
                  <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #2d9c92 0%, #42c6b8 100%); border-radius: 12px 12px 0 0;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700;">Velkommen til HMS Nova!</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px;">
                    <p style="color: #1a1a1a; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                      Hei <strong>${data.adminName}</strong>,
                    </p>
                    <p style="color: #1a1a1a; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                      Din HMS Nova-konto for <strong>${data.companyName}</strong> er nå klar til bruk!
                    </p>
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background: linear-gradient(135deg, #f0f9f8 0%, #e8f6f4 100%); border-radius: 8px; border: 2px solid #2d9c92; margin: 30px 0;">
                      <tr>
                        <td style="padding: 30px;">
                          <h2 style="margin: 0 0 20px; color: #2d9c92; font-size: 20px;">Dine påloggingsopplysninger</h2>
                          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                            <tr>
                              <td style="padding: 12px 0; border-bottom: 1px solid #d4ebe8;">
                                <strong style="color: #1a1a1a; font-size: 14px;">E-post:</strong>
                              </td>
                              <td style="padding: 12px 0; border-bottom: 1px solid #d4ebe8; text-align: right;">
                                <span style="color: #2d9c92; font-size: 14px; font-weight: 600;">${data.email}</span>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 12px 0;">
                                <strong style="color: #1a1a1a; font-size: 14px;">Passord:</strong>
                              </td>
                              <td style="padding: 12px 0; text-align: right;">
                                <code style="background: #ffffff; padding: 8px 12px; border-radius: 4px; color: #1a1a1a; font-family: 'Courier New', monospace; font-size: 14px; border: 1px solid #2d9c92;">${data.password}</code>
                              </td>
                            </tr>
                          </table>
                          <p style="color: #666; font-size: 12px; margin: 15px 0 0; font-style: italic;">
                            Vennligst endre passordet ditt ved første innlogging
                          </p>
                        </td>
                      </tr>
                    </table>
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 30px 0;">
                      <tr>
                        <td align="center">
                          <a href="${data.loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #2d9c92 0%, #42c6b8 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(45, 156, 146, 0.3);">
                            Logg inn nå
                          </a>
                        </td>
                      </tr>
                    </table>
                    <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 30px 0 0;">
                      Har du spørsmål? Vi er her for å hjelpe!<br/>
                      <a href="mailto:support@hmsnova.com" style="color: #2d9c92; text-decoration: none;">support@hmsnova.com</a><br/>
                      <a href="tel:+4799112916" style="color: #2d9c92; text-decoration: none;">+47 99 11 29 16</a>
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 30px 40px; background: #f9f9f9; border-radius: 0 0 12px 12px; text-align: center;">
                    <p style="margin: 0; color: #999; font-size: 12px;">
                      &copy; ${new Date().getFullYear()} HMS Nova. Alle rettigheter reservert.
                    </p>
                    <p style="margin: 10px 0 0; color: #999; font-size: 12px;">
                      <a href="${data.dashboardUrl}" style="color: #2d9c92; text-decoration: none;">Dashboard</a> |
                      <a href="https://hmsnova.com" style="color: #2d9c92; text-decoration: none;">Hjemmeside</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}
