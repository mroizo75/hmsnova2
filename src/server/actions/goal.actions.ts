"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import {
  createGoalSchema,
  updateGoalSchema,
  createMeasurementSchema,
  calculateStatus,
} from "@/features/goals/schemas/goal.schema";
import { AuditLog } from "@/lib/audit-log";

async function getSessionContext() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    throw new Error("Unauthorized");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { tenants: true },
  });

  if (!user || user.tenants.length === 0) {
    throw new Error("User not associated with a tenant");
  }

  return { user, tenantId: user.tenants[0].tenantId };
}

// ============================================================================
// GOALS (ISO 9001 - 6.2 Kvalitetsmål)
// ============================================================================

// Hent alle mål
export async function getGoals(tenantId: string) {
  try {
    const { user } = await getSessionContext();

    const goals = await prisma.goal.findMany({
      where: { tenantId },
      include: {
        measurements: {
          orderBy: { measurementDate: "desc" },
          take: 10, // Siste 10 målinger
        },
        actions: {
          where: { goalId: { not: null } },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, data: goals };
  } catch (error: any) {
    console.error("Get goals error:", error);
    return { success: false, error: error.message || "Kunne ikke hente mål" };
  }
}

// Hent et spesifikt mål
export async function getGoal(goalId: string) {
  try {
    const { user, tenantId } = await getSessionContext();

    const goal = await prisma.goal.findUnique({
      where: { id: goalId, tenantId },
      include: {
        measurements: {
          orderBy: { measurementDate: "desc" },
        },
        actions: {
          where: { goalId: { not: null } },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!goal) {
      return { success: false, error: "Mål ikke funnet" };
    }

    return { success: true, data: goal };
  } catch (error: any) {
    console.error("Get goal error:", error);
    return { success: false, error: error.message || "Kunne ikke hente mål" };
  }
}

// Opprett nytt mål (ISO 9001: 6.2)
export async function createGoal(input: any) {
  try {
    const { user, tenantId } = await getSessionContext();
    const validated = createGoalSchema.parse({
      ...input,
      tenantId,
      startDate: input.startDate ? new Date(input.startDate) : undefined,
      deadline: input.deadline ? new Date(input.deadline) : undefined,
    });

    const goal = await prisma.goal.create({
      data: {
        tenantId: validated.tenantId,
        title: validated.title,
        description: validated.description,
        category: validated.category,
        targetValue: validated.targetValue,
        currentValue: validated.currentValue || 0,
        unit: validated.unit,
        baseline: validated.baseline,
        year: validated.year,
        quarter: validated.quarter,
        startDate: validated.startDate,
        deadline: validated.deadline,
        ownerId: validated.ownerId,
        status: validated.status,
      },
    });

    await AuditLog.log(tenantId, user.id, "GOAL_CREATED", "Goal", goal.id, {
      title: goal.title,
      category: goal.category,
    });

    revalidatePath("/dashboard/goals");
    return { success: true, data: goal };
  } catch (error: any) {
    console.error("Create goal error:", error);
    return { success: false, error: error.message || "Kunne ikke opprette mål" };
  }
}

// Oppdater mål
export async function updateGoal(input: any) {
  try {
    const { user, tenantId } = await getSessionContext();
    const validated = updateGoalSchema.parse({
      ...input,
      startDate: input.startDate ? new Date(input.startDate) : undefined,
      deadline: input.deadline ? new Date(input.deadline) : undefined,
    });

    const existingGoal = await prisma.goal.findFirst({
      where: { id: validated.id, tenantId },
    });

    if (!existingGoal) {
      return { success: false, error: "Mål ikke funnet" };
    }

    const goal = await prisma.goal.update({
      where: { id: validated.id },
      data: {
        ...validated,
        updatedAt: new Date(),
      },
    });

    await AuditLog.log(tenantId, user.id, "GOAL_UPDATED", "Goal", goal.id, {
      title: goal.title,
    });

    revalidatePath("/dashboard/goals");
    revalidatePath(`/dashboard/goals/${goal.id}`);
    return { success: true, data: goal };
  } catch (error: any) {
    console.error("Update goal error:", error);
    return { success: false, error: error.message || "Kunne ikke oppdatere mål" };
  }
}

// Slett mål
export async function deleteGoal(goalId: string) {
  try {
    const { user, tenantId } = await getSessionContext();

    const goal = await prisma.goal.findFirst({
      where: { id: goalId, tenantId },
    });

    if (!goal) {
      return { success: false, error: "Mål ikke funnet" };
    }

    await prisma.goal.delete({
      where: { id: goalId },
    });

    await AuditLog.log(tenantId, user.id, "GOAL_DELETED", "Goal", goalId, {
      title: goal.title,
    });

    revalidatePath("/dashboard/goals");
    return { success: true };
  } catch (error: any) {
    console.error("Delete goal error:", error);
    return { success: false, error: error.message || "Kunne ikke slette mål" };
  }
}

// Få statistikk over mål
export async function getGoalStats(tenantId: string) {
  try {
    const { user } = await getSessionContext();

    const goals = await prisma.goal.findMany({
      where: { tenantId },
      include: { measurements: true },
    });

    const stats = {
      total: goals.length,
      active: goals.filter((g) => g.status === "ACTIVE").length,
      achieved: goals.filter((g) => g.status === "ACHIEVED").length,
      atRisk: goals.filter((g) => g.status === "AT_RISK").length,
      failed: goals.filter((g) => g.status === "FAILED").length,
      byCategory: {
        QUALITY: goals.filter((g) => g.category === "QUALITY").length,
        HMS: goals.filter((g) => g.category === "HMS").length,
        ENVIRONMENT: goals.filter((g) => g.category === "ENVIRONMENT").length,
        CUSTOMER: goals.filter((g) => g.category === "CUSTOMER").length,
        EFFICIENCY: goals.filter((g) => g.category === "EFFICIENCY").length,
        FINANCE: goals.filter((g) => g.category === "FINANCE").length,
        COMPETENCE: goals.filter((g) => g.category === "COMPETENCE").length,
        OTHER: goals.filter((g) => g.category === "OTHER").length,
      },
    };

    return { success: true, data: stats };
  } catch (error: any) {
    console.error("Get goal stats error:", error);
    return { success: false, error: error.message || "Kunne ikke hente statistikk" };
  }
}

// ============================================================================
// MEASUREMENTS (ISO 9001 - 9.1 Overvåking og måling)
// ============================================================================

// Registrer måling (ISO 9001: 9.1)
export async function createMeasurement(input: any) {
  try {
    const { user, tenantId } = await getSessionContext();
    const validated = createMeasurementSchema.parse({
      ...input,
      measurementDate: new Date(input.measurementDate),
    });

    // Sjekk at målet finnes
    const goal = await prisma.goal.findFirst({
      where: { id: validated.goalId, tenantId },
    });

    if (!goal) {
      return { success: false, error: "Mål ikke funnet" };
    }

    const measurement = await prisma.kpiMeasurement.create({
      data: {
        goalId: validated.goalId,
        tenantId,
        value: validated.value,
        measurementDate: validated.measurementDate,
        measurementType: validated.measurementType,
        comment: validated.comment,
        measuredById: validated.measuredById,
        source: validated.source,
      },
    });

    // Oppdater currentValue på målet
    await prisma.goal.update({
      where: { id: goal.id },
      data: { currentValue: validated.value },
    });

    // Beregn og oppdater status automatisk
    const newStatus = calculateStatus(
      validated.value,
      goal.targetValue,
      goal.baseline,
      goal.deadline
    );

    if (newStatus !== goal.status) {
      await prisma.goal.update({
        where: { id: goal.id },
        data: { status: newStatus },
      });
    }

    await AuditLog.log(tenantId, user.id, "MEASUREMENT_CREATED", "KpiMeasurement", measurement.id, {
      goalId: goal.id,
      value: measurement.value,
    });

    revalidatePath("/dashboard/goals");
    revalidatePath(`/dashboard/goals/${goal.id}`);
    return { success: true, data: measurement };
  } catch (error: any) {
    console.error("Create measurement error:", error);
    return { success: false, error: error.message || "Kunne ikke registrere måling" };
  }
}

// Slett måling
export async function deleteMeasurement(measurementId: string) {
  try {
    const { user, tenantId } = await getSessionContext();

    const measurement = await prisma.kpiMeasurement.findUnique({
      where: { id: measurementId },
      include: { goal: true },
    });

    if (!measurement || measurement.tenantId !== tenantId) {
      return { success: false, error: "Måling ikke funnet" };
    }

    await prisma.kpiMeasurement.delete({
      where: { id: measurementId },
    });

    // Oppdater currentValue til siste måling
    const latestMeasurement = await prisma.kpiMeasurement.findFirst({
      where: { goalId: measurement.goalId },
      orderBy: { measurementDate: "desc" },
    });

    if (latestMeasurement) {
      await prisma.goal.update({
        where: { id: measurement.goalId },
        data: { currentValue: latestMeasurement.value },
      });
    } else {
      await prisma.goal.update({
        where: { id: measurement.goalId },
        data: { currentValue: 0 },
      });
    }

    await AuditLog.log(tenantId, user.id, "MEASUREMENT_DELETED", "KpiMeasurement", measurementId, {
      goalId: measurement.goalId,
    });

    revalidatePath("/dashboard/goals");
    revalidatePath(`/dashboard/goals/${measurement.goalId}`);
    return { success: true };
  } catch (error: any) {
    console.error("Delete measurement error:", error);
    return { success: false, error: error.message || "Kunne ikke slette måling" };
  }
}

// ============================================================================
// AUTOMATIC KPI CALCULATIONS
// ============================================================================

// Beregn og oppdater automatiske KPIer
export async function calculateAutomaticKPIs(tenantId: string) {
  try {
    const { user } = await getSessionContext();

    // Eksempel: Tell antall hendelser
    const incidentCount = await prisma.incident.count({
      where: { tenantId },
    });

    // Eksempel: Tell antall fullførte opplæringer
    const completedTrainings = await prisma.training.count({
      where: { tenantId, completedAt: { not: null } },
    });

    // Eksempel: Tell antall åpne funn fra revisjoner
    const openFindings = await prisma.auditFinding.count({
      where: {
        audit: { tenantId },
        status: { not: "VERIFIED" },
      },
    });

    // Du kan legge til flere automatiske beregninger her

    return {
      success: true,
      data: {
        incidentCount,
        completedTrainings,
        openFindings,
      },
    };
  } catch (error: any) {
    console.error("Calculate KPIs error:", error);
    return { success: false, error: error.message || "Kunne ikke beregne KPIer" };
  }
}

