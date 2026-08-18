"use server";

import { revalidatePath } from "next/cache";
import { NotificationType, Role, RoutineStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { matchesIndustryScope, toIndustryScopeJson } from "@/lib/industry-scope";
import { requirePermission } from "@/lib/server-authorization";
import { createNotification } from "@/server/actions/notification.actions";
import { ensureGlobalRoutineTemplateLibrarySeeded } from "@/server/actions/routine-library.actions";
import { onRoutineUpdated } from "@/features/hms-ai/lib/event-handler";

type RoutineTemplateListInput = {
  query?: string;
  category?: string;
  includeInactive?: boolean;
};

type RoutineUpdateInput = {
  id: string;
  title?: string;
  description?: string | null;
  category?: string | null;
  content?: unknown;
  legalReference?: string | null;
  status?: RoutineStatus;
  reviewIntervalMonths?: number;
  nextReviewAt?: Date | null;
  lastReviewedAt?: Date | null;
};

async function getTenantIndustry(tenantId: string): Promise<string | null> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { industry: true },
  });

  return tenant?.industry?.trim().toLowerCase() ?? null;
}

function normalizeQuery(query?: string): string | undefined {
  const value = query?.trim();
  return value && value.length > 0 ? value : undefined;
}

async function notifyLeadersAndHms(
  tenantId: string,
  title: string,
  message: string,
  link: string
) {
  const recipients = await prisma.userTenant.findMany({
    where: {
      tenantId,
      role: {
        in: [Role.ADMIN, Role.HMS, Role.LEDER],
      },
    },
    select: { userId: true },
    distinct: ["userId"],
  });

  await Promise.all(
    recipients.map((recipient) =>
      createNotification({
        tenantId,
        userId: recipient.userId,
        type: NotificationType.ROUTINE_REVIEW_DUE,
        title,
        message,
        link,
      })
    )
  );
}

export async function listRecommendedRoutineTemplates(input: RoutineTemplateListInput = {}) {
  try {
    await ensureGlobalRoutineTemplateLibrarySeeded();
    const context = await requirePermission("canReadDocuments");
    const query = normalizeQuery(input.query);
    const tenantIndustry = await getTenantIndustry(context.tenantId);

    const templates = await prisma.routineTemplate.findMany({
      where: {
        OR: [{ tenantId: context.tenantId }, { isGlobal: true }],
        isActive: input.includeInactive ? undefined : true,
        category: input.category || undefined,
        title: query ? { contains: query } : undefined,
      },
      orderBy: [{ isGlobal: "desc" }, { createdAt: "desc" }],
    });

    const filteredTemplates = templates.filter((template) =>
      matchesIndustryScope(template.industryScope, tenantIndustry)
    );

    return { success: true, data: filteredTemplates };
  } catch (error: any) {
    console.error("listRecommendedRoutineTemplates error:", error);
    return { success: false, error: error.message || "Kunne ikke hente anbefalte rutinemaler" };
  }
}

export async function listAllRoutineTemplates(input: RoutineTemplateListInput = {}) {
  try {
    await ensureGlobalRoutineTemplateLibrarySeeded();
    const context = await requirePermission("canReadDocuments");
    const query = normalizeQuery(input.query);

    const templates = await prisma.routineTemplate.findMany({
      where: {
        OR: [{ tenantId: context.tenantId }, { isGlobal: true }],
        isActive: input.includeInactive ? undefined : true,
        category: input.category || undefined,
        title: query ? { contains: query } : undefined,
      },
      orderBy: [{ isGlobal: "desc" }, { createdAt: "desc" }],
    });

    return { success: true, data: templates };
  } catch (error: any) {
    console.error("listAllRoutineTemplates error:", error);
    return { success: false, error: error.message || "Kunne ikke hente rutinemaler" };
  }
}

const employeeVisibleRoutineStatuses: RoutineStatus[] = [RoutineStatus.ACTIVE, RoutineStatus.NEEDS_REVIEW];

export async function listTenantRoutines(
  query?: string,
  options?: { forEmployee?: boolean }
) {
  try {
    const context = await requirePermission("canReadDocuments");
    const normalizedQuery = normalizeQuery(query);

    const routines = await prisma.routine.findMany({
      where: {
        tenantId: context.tenantId,
        ...(options?.forEmployee
          ? { status: { in: employeeVisibleRoutineStatuses } }
          : {}),
        title: normalizedQuery ? { contains: normalizedQuery } : undefined,
      },
      include: {
        responsibleUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        template: {
          select: {
            id: true,
            title: true,
            isGlobal: true,
            industryScope: true,
          },
        },
      },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    });

    return { success: true, data: routines };
  } catch (error: any) {
    console.error("listTenantRoutines error:", error);
    return { success: false, error: error.message || "Kunne ikke hente rutiner" };
  }
}

export async function getRoutineById(
  routineId: string,
  options?: { forEmployee?: boolean }
) {
  try {
    const context = await requirePermission("canReadDocuments");

    const routine = await prisma.routine.findFirst({
      where: {
        id: routineId,
        tenantId: context.tenantId,
        ...(options?.forEmployee
          ? { status: { in: employeeVisibleRoutineStatuses } }
          : {}),
      },
      include: {
        responsibleUser: {
          select: { id: true, name: true, email: true },
        },
        template: true,
      },
    });

    if (!routine) {
      return { success: false, error: "Rutine ikke funnet" };
    }

    return { success: true, data: routine };
  } catch (error: any) {
    console.error("getRoutineById error:", error);
    return { success: false, error: error.message || "Kunne ikke hente rutine" };
  }
}

export async function createRoutineFromTemplate(templateId: string) {
  try {
    const context = await requirePermission("canCreateDocuments");

    const template = await prisma.routineTemplate.findFirst({
      where: {
        id: templateId,
        OR: [{ tenantId: context.tenantId }, { isGlobal: true }],
        isActive: true,
      },
    });

    if (!template) {
      return { success: false, error: "Rutinemal ikke funnet" };
    }

    const existingCount = await prisma.routine.count({
      where: {
        tenantId: context.tenantId,
        title: {
          contains: template.title,
        },
      },
    });

    const title = existingCount === 0 ? template.title : `${template.title} (${existingCount + 1})`;

    const routine = await prisma.routine.create({
      data: {
        tenantId: context.tenantId,
        templateId: template.id,
        title,
        description: template.description,
        category: template.category,
        content: template.content,
        legalReference: template.legalReference,
        createdBy: context.userId,
      },
    });

    revalidatePath("/dashboard/rutiner");
    revalidatePath("/dashboard/rutiner/maler");
    return { success: true, data: routine };
  } catch (error: any) {
    console.error("createRoutineFromTemplate error:", error);
    return { success: false, error: error.message || "Kunne ikke opprette rutine fra mal" };
  }
}

export async function updateRoutine(input: RoutineUpdateInput) {
  try {
    const context = await requirePermission("canCreateDocuments");

    const existing = await prisma.routine.findFirst({
      where: {
        id: input.id,
        tenantId: context.tenantId,
      },
      select: { id: true },
    });

    if (!existing) {
      return { success: false, error: "Rutine ikke funnet" };
    }

    const routine = await prisma.routine.update({
      where: { id: input.id },
      data: {
        title: input.title,
        description: input.description,
        category: input.category,
        content: input.content as any,
        legalReference: input.legalReference,
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.reviewIntervalMonths !== undefined
          ? { reviewIntervalMonths: input.reviewIntervalMonths }
          : {}),
        ...(input.nextReviewAt !== undefined ? { nextReviewAt: input.nextReviewAt } : {}),
        ...(input.lastReviewedAt !== undefined ? { lastReviewedAt: input.lastReviewedAt } : {}),
        updatedBy: context.userId,
      },
    });

    revalidatePath("/dashboard/rutiner");
    revalidatePath(`/dashboard/rutiner/${routine.id}`);

    // HMS Intelligens-motor: oppdater score etter rutineendring
    onRoutineUpdated(context.tenantId, routine.id).catch(() => {});

    return { success: true, data: routine };
  } catch (error: any) {
    console.error("updateRoutine error:", error);
    return { success: false, error: error.message || "Kunne ikke oppdatere rutine" };
  }
}

export async function assignRoutineResponsible(routineId: string, responsibleUserId: string) {
  try {
    const context = await requirePermission("canCreateDocuments");

    const [routine, member] = await Promise.all([
      prisma.routine.findFirst({
        where: {
          id: routineId,
          tenantId: context.tenantId,
        },
      }),
      prisma.userTenant.findUnique({
        where: {
          userId_tenantId: {
            userId: responsibleUserId,
            tenantId: context.tenantId,
          },
        },
      }),
    ]);

    if (!routine) {
      return { success: false, error: "Rutine ikke funnet" };
    }
    if (!member) {
      return { success: false, error: "Ansvarlig bruker er ikke medlem i virksomheten" };
    }

    const updated = await prisma.routine.update({
      where: { id: routineId },
      data: {
        responsibleId: responsibleUserId,
        updatedBy: context.userId,
      },
    });

    await createNotification({
      tenantId: context.tenantId,
      userId: responsibleUserId,
      type: NotificationType.ROUTINE_ASSIGNED,
      title: "Ny rutine tildelt",
      message: `Du er satt som ansvarlig for rutinen "${updated.title}".`,
      link: `/dashboard/rutiner/${updated.id}`,
    });

    revalidatePath(`/dashboard/rutiner/${updated.id}`);
    return { success: true, data: updated };
  } catch (error: any) {
    console.error("assignRoutineResponsible error:", error);
    return { success: false, error: error.message || "Kunne ikke tildele ansvarlig" };
  }
}

export async function scheduleRoutineFollowUp(
  routineId: string,
  nextReviewAt: Date,
  reviewIntervalMonths?: number
) {
  try {
    const context = await requirePermission("canCreateDocuments");

    const routine = await prisma.routine.findFirst({
      where: {
        id: routineId,
        tenantId: context.tenantId,
      },
    });

    if (!routine) {
      return { success: false, error: "Rutine ikke funnet" };
    }

    const updated = await prisma.routine.update({
      where: { id: routineId },
      data: {
        nextReviewAt,
        reviewIntervalMonths: reviewIntervalMonths ?? routine.reviewIntervalMonths,
        status: RoutineStatus.ACTIVE,
        updatedBy: context.userId,
      },
    });

    await notifyLeadersAndHms(
      context.tenantId,
      "Revisjonsfrist oppdatert",
      `Rutinen "${updated.title}" har fått ny dato for neste revisjon.`,
      `/dashboard/rutiner/${updated.id}`
    );

    revalidatePath("/dashboard/rutiner");
    revalidatePath(`/dashboard/rutiner/${updated.id}`);
    return { success: true, data: updated };
  } catch (error: any) {
    console.error("scheduleRoutineFollowUp error:", error);
    return { success: false, error: error.message || "Kunne ikke planlegge oppfolging" };
  }
}

export async function createRoutineTemplate(input: {
  title: string;
  description?: string;
  category?: string;
  content?: unknown;
  legalReference?: string;
  isGlobal?: boolean;
  industryScope?: string[];
}) {
  try {
    const context = await requirePermission("canCreateDocuments");

    const template = await prisma.routineTemplate.create({
      data: {
        tenantId: input.isGlobal ? null : context.tenantId,
        title: input.title,
        description: input.description,
        category: input.category,
        content: input.content as any,
        legalReference: input.legalReference,
        isGlobal: !!input.isGlobal,
        industryScope: toIndustryScopeJson(input.industryScope),
        createdBy: context.userId,
      },
    });

    revalidatePath("/dashboard/rutiner/maler");
    return { success: true, data: template };
  } catch (error: any) {
    console.error("createRoutineTemplate error:", error);
    return { success: false, error: error.message || "Kunne ikke opprette rutinemal" };
  }
}
