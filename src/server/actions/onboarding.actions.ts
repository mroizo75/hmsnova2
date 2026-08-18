"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPermissions } from "@/lib/permissions";
import { BASE_SIMPLE_MODULES, BRANSJE_MODULES } from "@/lib/bransje-modules";
import { menuPathsToWidgetIds } from "@/lib/menu-widget-sync";
import type { Role } from "@prisma/client";

// ── Tilsynsklar-veiviser typer ──────────────────────────────────────────────

export type SetupGuideStep = {
  key: string;
  title: string;
  description: string;
  href: string;
  completed: boolean;
  icon: string;
};

export type SetupGuideProgress = {
  steps: SetupGuideStep[];
  totalCompleted: number;
  totalSteps: number;
  hidden: boolean;
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

const SETUP_STEPS: Omit<SetupGuideStep, "completed">[] = [
  {
    key: "add_employees",
    title: "Legg til ansatte",
    description: "Inviter ansatte slik at de kan delta i HMS-arbeidet",
    href: "/dashboard/settings/users",
    icon: "Users",
  },
  {
    key: "org_chart",
    title: "Fyll ut organisasjonskart",
    description: "Definer roller, ansvar og myndighet for HMS (IK-HMS § 5 nr. 5)",
    href: "/dashboard/organisasjonskart",
    icon: "Network",
  },
  {
    key: "handbook",
    title: "Sett opp HMS-håndboken",
    description: "Fyll inn HMS-policy, mål og roller i håndboken",
    href: "/dashboard/hms-handbok",
    icon: "BookOpen",
  },
  {
    key: "risk_assessment",
    title: "Gjennomfør første risikovurdering",
    description: "Kartlegg farer og vurder risiko (IK-HMS § 5 nr. 6)",
    href: "/dashboard/risks",
    icon: "ShieldAlert",
  },
  {
    key: "handbook_signatures",
    title: "Få ansatte til å signere HMS-håndboken",
    description: "Dokumenter at ansatte har lest og forstått håndboken",
    href: "/dashboard/hms-handbok",
    icon: "PenLine",
  },
];

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
      },
    });

    if (!tenant || !tenant.startpakkeCompleted) return null;
    if (tenant.setupGuideHidden) return null;
    if (tenant.onboardingStatus === "COMPLETED") return null;

    const [employeeCount, orgNodeCount, riskCount, handbook] =
      await Promise.all([
        prisma.userTenant.count({
          where: { tenantId, role: { not: "ADMIN" } },
        }),
        prisma.orgChartNode.count({ where: { tenantId } }),
        prisma.riskAssessment.count({ where: { tenantId } }),
        prisma.hmsHandbook.findUnique({
          where: { tenantId },
          select: {
            id: true,
            currentVersionId: true,
          },
        }),
      ]);

    let handbookEdited = false;
    let signatureCount = 0;

    if (handbook) {
      const versionId = handbook.currentVersionId;

      if (versionId) {
        const [editedSections, sigCount] = await Promise.all([
          prisma.handbookSection.count({
            where: {
              versionId,
              content: { not: { startsWith: "<p>Beskriv" } },
              NOT: {
                content: {
                  startsWith: "<p>Kartlegging",
                },
              },
            },
          }),
          prisma.handbookSignature.count({
            where: { handbookId: handbook.id },
          }),
        ]);

        handbookEdited = editedSections >= 3;
        signatureCount = sigCount;
      }
    }

    const completionMap: Record<string, boolean> = {
      add_employees: employeeCount >= 1,
      org_chart: orgNodeCount >= 2,
      handbook: handbookEdited,
      risk_assessment: riskCount >= 1,
      handbook_signatures: signatureCount >= 1,
    };

    const steps: SetupGuideStep[] = SETUP_STEPS.map((step) => ({
      ...step,
      completed: completionMap[step.key] ?? false,
    }));

    const totalCompleted = steps.filter((s) => s.completed).length;

    return {
      steps,
      totalCompleted,
      totalSteps: steps.length,
      hidden: tenant.setupGuideHidden,
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
      data: { setupGuideHidden: hidden },
    });

    revalidatePath("/dashboard");
    return { success: true };
  } catch {
    return { success: false, error: "Noe gikk galt" };
  }
}
