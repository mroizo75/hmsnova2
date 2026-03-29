"use server";

import { prisma } from "@/lib/db";
import { getRequiredTenantContext } from "@/lib/tenant-context";
import { revalidatePath } from "next/cache";
import { AuditLog } from "@/lib/audit-log";

async function getSessionContext() {
  const tenantContext = await getRequiredTenantContext();

  const user = await prisma.user.findUnique({
    where: { id: tenantContext.userId },
    include: { tenants: true },
  });

  if (!user || user.tenants.length === 0) {
    throw new Error("User not associated with a tenant");
  }

  return { user, tenantId: tenantContext.tenantId, userId: user.id };
}

// ============================================================================
// Link Training Requirement to Risk
// ============================================================================

export async function addTrainingRequirementToRisk(data: {
  riskId: string;
  courseKey: string;
  isMandatory: boolean;
  reason?: string;
}) {
  try {
    const { tenantId, userId } = await getSessionContext();

    // Verifiser at risk tilhører tenanten
    const risk = await prisma.risk.findUnique({
      where: { id: data.riskId },
    });

    if (!risk || risk.tenantId !== tenantId) {
      return { success: false, error: "Risiko ikke funnet" };
    }

    // Sjekk om kurs eksisterer
    const courseTemplate = await prisma.courseTemplate.findFirst({
      where: {
        OR: [
          { tenantId, courseKey: data.courseKey },
          { isGlobal: true, courseKey: data.courseKey },
        ],
      },
    });

    if (!courseTemplate) {
      return { success: false, error: "Kurs ikke funnet" };
    }

    // Opprett kobling
    const requirement = await prisma.riskTrainingRequirement.create({
      data: {
        tenantId,
        riskId: data.riskId,
        courseKey: data.courseKey,
        isMandatory: data.isMandatory,
        reason: data.reason,
      },
    });

    await AuditLog.log(
      tenantId,
      userId,
      "RISK_TRAINING_REQUIRED",
      "Risk",
      risk.id,
      {
        courseKey: data.courseKey,
        courseTitle: courseTemplate.title,
        isMandatory: data.isMandatory,
      }
    );

    revalidatePath(`/dashboard/risks/${data.riskId}`);

    return { success: true, data: requirement };
  } catch (error: any) {
    console.error("Add training requirement error:", error);
    
    if (error.code === "P2002") {
      return { success: false, error: "Dette kurset er allerede påkrevd for denne risikoen" };
    }
    
    return { success: false, error: error.message || "Kunne ikke legge til opplæringskrav" };
  }
}

export async function removeTrainingRequirement(requirementId: string) {
  try {
    const { tenantId, userId } = await getSessionContext();

    const requirement = await prisma.riskTrainingRequirement.findUnique({
      where: { id: requirementId },
    });

    if (!requirement || requirement.tenantId !== tenantId) {
      return { success: false, error: "Krav ikke funnet" };
    }

    await prisma.riskTrainingRequirement.delete({
      where: { id: requirementId },
    });

    await AuditLog.log(
      tenantId,
      userId,
      "RISK_TRAINING_REMOVED",
      "Risk",
      requirement.riskId,
      {
        courseKey: requirement.courseKey,
      }
    );

    revalidatePath(`/dashboard/risks/${requirement.riskId}`);

    return { success: true };
  } catch (error: any) {
    console.error("Remove training requirement error:", error);
    return { success: false, error: error.message || "Kunne ikke fjerne opplæringskrav" };
  }
}

export async function updateTrainingRequirement(requirementId: string, data: {
  isMandatory?: boolean;
  reason?: string;
}) {
  try {
    const { tenantId, userId } = await getSessionContext();

    const requirement = await prisma.riskTrainingRequirement.findUnique({
      where: { id: requirementId },
    });

    if (!requirement || requirement.tenantId !== tenantId) {
      return { success: false, error: "Krav ikke funnet" };
    }

    const updated = await prisma.riskTrainingRequirement.update({
      where: { id: requirementId },
      data: {
        isMandatory: data.isMandatory,
        reason: data.reason,
      },
    });

    await AuditLog.log(
      tenantId,
      userId,
      "RISK_TRAINING_UPDATED",
      "Risk",
      requirement.riskId,
      {
        courseKey: requirement.courseKey,
        changes: data,
      }
    );

    revalidatePath(`/dashboard/risks/${requirement.riskId}`);

    return { success: true, data: updated };
  } catch (error: any) {
    console.error("Update training requirement error:", error);
    return { success: false, error: error.message || "Kunne ikke oppdatere opplæringskrav" };
  }
}

export async function getTrainingRequirementsForRisk(riskId: string) {
  try {
    const { tenantId } = await getSessionContext();

    const requirements = await prisma.riskTrainingRequirement.findMany({
      where: {
        riskId,
        tenantId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Hent kurs-detaljer
    const courseKeys = requirements.map((r) => r.courseKey);
    const courses = await prisma.courseTemplate.findMany({
      where: {
        OR: [
          { tenantId, courseKey: { in: courseKeys } },
          { isGlobal: true, courseKey: { in: courseKeys } },
        ],
      },
    });

    const enrichedRequirements = requirements.map((req) => ({
      ...req,
      course: courses.find((c) => c.courseKey === req.courseKey),
    }));

    return { success: true, data: enrichedRequirements };
  } catch (error: any) {
    console.error("Get training requirements error:", error);
    return { success: false, error: error.message || "Kunne ikke hente opplæringskrav" };
  }
}

export async function getRisksRequiringTraining(courseKey: string) {
  try {
    const { tenantId } = await getSessionContext();

    const requirements = await prisma.riskTrainingRequirement.findMany({
      where: {
        courseKey,
        tenantId,
      },
      include: {
        risk: {
          include: {
            owner: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return { success: true, data: requirements };
  } catch (error: any) {
    console.error("Get risks requiring training error:", error);
    return { success: false, error: error.message || "Kunne ikke hente risikoer" };
  }
}

// ============================================================================
// Check Training Compliance for Risk
// ============================================================================

export async function checkTrainingComplianceForRisk(riskId: string) {
  try {
    const { tenantId } = await getSessionContext();

    // Hent påkrevde kurs for risikoen
    const requirements = await prisma.riskTrainingRequirement.findMany({
      where: {
        riskId,
        tenantId,
        isMandatory: true,
      },
    });

    if (requirements.length === 0) {
      return { success: true, data: { compliant: true, missingTraining: [] } };
    }

    // Hent ansatte som er eksponert (simplificering - kan forbedres)
    const risk = await prisma.risk.findUnique({
      where: { id: riskId },
    });

    if (!risk) {
      return { success: false, error: "Risiko ikke funnet" };
    }

    // Hent alle ansatte i tenanten
    const employees = await prisma.userTenant.findMany({
      where: { tenantId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    const missingTraining: any[] = [];

    for (const req of requirements) {
      // Hent kursholdere
      const trainings = await prisma.training.findMany({
        where: {
          tenantId,
          courseKey: req.courseKey,
          completedAt: { not: null },
          OR: [
            { validUntil: null },
            { validUntil: { gte: new Date() } },
          ],
        },
      });

      const trainedUserIds = new Set(trainings.map((t) => t.userId));

      // Finn ansatte som mangler opplæring
      const untrained = employees.filter(
        (emp) => !trainedUserIds.has(emp.user.id)
      );

      if (untrained.length > 0) {
        missingTraining.push({
          courseKey: req.courseKey,
          reason: req.reason,
          untrainedCount: untrained.length,
          untrainedUsers: untrained.map((u) => ({
            id: u.user.id,
            name: u.user.name,
            email: u.user.email,
          })),
        });
      }
    }

    return {
      success: true,
      data: {
        compliant: missingTraining.length === 0,
        missingTraining,
      },
    };
  } catch (error: any) {
    console.error("Check training compliance error:", error);
    return { success: false, error: error.message || "Kunne ikke sjekke opplæringsstatus" };
  }
}
