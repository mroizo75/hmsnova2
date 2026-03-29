"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getRequiredTenantContext } from "@/lib/tenant-context";
import { createMeasureSchema, updateMeasureSchema, completeMeasureSchema } from "@/features/measures/schemas/measure.schema";
import { IncidentStage } from "@prisma/client";

async function getSessionContext() {
  const tenantContext = await getRequiredTenantContext();

  const user = await prisma.user.findUnique({
    where: { id: tenantContext.userId },
    include: { tenants: true },
  });
  
  if (!user || user.tenants.length === 0) {
    throw new Error("User not associated with a tenant");
  }
  
  return { user, tenantId: tenantContext.tenantId };
}

const parseOptionalNumber = (value: any) => {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

// Hent alle tiltak for en tenant
export async function getMeasures(_tenantId: string) {
  try {
    const { tenantId } = await getSessionContext();
    
    const measures = await prisma.measure.findMany({
      where: { tenantId },
      include: {
        risk: { select: { id: true, title: true } },
        incident: { select: { id: true, title: true } },
        audit: { select: { id: true, title: true } },
        goal: { select: { id: true, title: true } },
      },
      orderBy: [
        { status: "asc" },
        { dueAt: "asc" },
      ],
    });
    
    // Sjekk om tiltak er forfalte
    const updatedMeasures = measures.map(measure => {
      if (measure.status !== "DONE" && new Date() > new Date(measure.dueAt)) {
        return { ...measure, status: "OVERDUE" as const };
      }
      return measure;
    });
    
    return { success: true, data: updatedMeasures };
  } catch (error: any) {
    console.error("Get measures error:", error);
    return { success: false, error: error.message || "Kunne ikke hente tiltak" };
  }
}

// Hent ett tiltak
export async function getMeasure(id: string) {
  try {
    const { tenantId } = await getSessionContext();

    const measure = await prisma.measure.findUnique({
      where: { id, tenantId },
      include: {
        risk: { select: { id: true, title: true } },
        incident: { select: { id: true, title: true } },
        audit: { select: { id: true, title: true } },
        goal: { select: { id: true, title: true } },
        responsible: { select: { id: true, name: true, email: true } },
      },
    });

    if (!measure) {
      return { success: false, error: "Tiltak ikke funnet", data: null };
    }

    return { success: true, data: measure };
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Get measure error:", err);
    return { success: false, error: err.message || "Kunne ikke hente tiltak", data: null };
  }
}

// Hent tiltak for en spesifikk risiko
export async function getMeasuresByRisk(riskId: string) {
  try {
    const { user, tenantId } = await getSessionContext();
    
    const measures = await prisma.measure.findMany({
      where: { riskId, tenantId },
      orderBy: { createdAt: "desc" },
    });
    
    return { success: true, data: measures };
  } catch (error: any) {
    console.error("Get measures by risk error:", error);
    return { success: false, error: error.message || "Kunne ikke hente tiltak" };
  }
}

// Opprett nytt tiltak
export async function createMeasure(input: any) {
  try {
    const { user, tenantId } = await getSessionContext();
    const normalizedInput = {
      ...input,
      tenantId,
      dueAt: new Date(input.dueAt),
      costEstimate: parseOptionalNumber(input.costEstimate),
      benefitEstimate: parseOptionalNumber(input.benefitEstimate),
    };
    const validated = createMeasureSchema.parse(normalizedInput);
    if (validated.projectId) {
      const project = await prisma.project.findFirst({
        where: {
          id: validated.projectId,
          tenantId,
        },
        select: { id: true },
      });
      if (!project) {
        return { success: false, error: "Prosjekt ikke funnet for valgt tenant" };
      }
    }
    
    const measure = await prisma.measure.create({
      data: {
        tenantId: validated.tenantId,
        projectId: validated.projectId,
        riskId: validated.riskId,
        incidentId: validated.incidentId,
        auditId: validated.auditId,
        goalId: validated.goalId,
        title: validated.title,
        description: validated.description,
        dueAt: validated.dueAt,
        responsibleId: validated.responsibleId,
        status: validated.status,
        category: validated.category,
        followUpFrequency: validated.followUpFrequency,
        costEstimate: validated.costEstimate,
        benefitEstimate: validated.benefitEstimate,
      },
    });
    
    // Oppdater risikostatus hvis tiltaket er knyttet til en risiko
    if (validated.riskId) {
      await prisma.risk.update({
        where: { id: validated.riskId },
        data: { status: "MITIGATING" },
      });
    }

    if (validated.incidentId) {
      await prisma.incident.update({
        where: { id: validated.incidentId, tenantId },
        data: {
          stage: IncidentStage.ACTIONS_DEFINED,
          status: "ACTION_TAKEN",
        },
      });
    }
    
    // Audit log
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: user.id,
        action: "MEASURE_CREATED",
        resource: `Measure:${measure.id}`,
        metadata: JSON.stringify({
          title: measure.title,
          riskId: validated.riskId,
          responsibleId: validated.responsibleId,
        }),
      },
    });
    
    revalidatePath("/dashboard/risks");
    revalidatePath("/dashboard/actions");
    if (validated.projectId) {
      revalidatePath(`/dashboard/projects/${validated.projectId}`);
    }
    if (validated.riskId) {
      revalidatePath(`/dashboard/risks/${validated.riskId}`);
    }
    
    return { success: true, data: measure };
  } catch (error: any) {
    console.error("Create measure error:", error);
    return { success: false, error: error.message || "Kunne ikke opprette tiltak" };
  }
}

// Oppdater tiltak
export async function updateMeasure(input: any) {
  try {
    const { user, tenantId } = await getSessionContext();
    const normalizedInput = {
      ...input,
      dueAt: input.dueAt ? new Date(input.dueAt) : undefined,
      costEstimate: parseOptionalNumber(input.costEstimate),
      benefitEstimate: parseOptionalNumber(input.benefitEstimate),
      completedAt: input.completedAt ? new Date(input.completedAt) : undefined,
    };
    const validated = updateMeasureSchema.parse(normalizedInput);

    const existingMeasure = await prisma.measure.findUnique({
      where: { id: validated.id, tenantId },
    });

    if (!existingMeasure) {
      return { success: false, error: "Tiltak ikke funnet" };
    }

    const data: Record<string, unknown> = {
      ...validated,
      costEstimate: validated.costEstimate,
      benefitEstimate: validated.benefitEstimate,
      effectiveness: validated.effectiveness,
      effectivenessNote: validated.effectivenessNote,
      updatedAt: new Date(),
    };

    if (validated.status === "DONE") {
      data.completedAt = validated.completedAt ?? new Date();
    } else if (validated.status) {
      data.completedAt = null;
      data.effectiveness = "NOT_EVALUATED";
      data.effectivenessNote = null;
    }

    const measure = await prisma.measure.update({
      where: { id: validated.id, tenantId },
      data: Object.fromEntries(
        Object.entries(data).filter(([k, v]) => v !== undefined && k !== "id")
      ) as any,
    });
    
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: user.id,
        action: "MEASURE_UPDATED",
        resource: `Measure:${measure.id}`,
        metadata: JSON.stringify({ title: measure.title }),
      },
    });

    revalidatePath("/dashboard/risks");
    revalidatePath("/dashboard/actions");
    revalidatePath(`/dashboard/measures/${measure.id}`);
    if (measure.riskId) {
      revalidatePath(`/dashboard/risks/${measure.riskId}`);
    }

    return { success: true, data: measure };
  } catch (error: any) {
    console.error("Update measure error:", error);
    return { success: false, error: error.message || "Kunne ikke oppdatere tiltak" };
  }
}

// Fullfør tiltak (ISO 9001: Evaluering av tiltak)
export async function completeMeasure(input: any) {
  try {
    const { user, tenantId } = await getSessionContext();
    const normalizedInput = {
      ...input,
      completedAt: new Date(input.completedAt),
    };
    const validated = completeMeasureSchema.parse(normalizedInput);
    
    const measure = await prisma.measure.update({
      where: { id: validated.id, tenantId },
      data: {
        status: "DONE",
        completedAt: validated.completedAt,
        effectiveness: validated.effectiveness,
        effectivenessNote: validated.completionNote,
        updatedAt: new Date(),
      },
    });
    
    // Sjekk om alle tiltak for risikoen er fullført
    if (measure.riskId) {
      const allMeasures = await prisma.measure.findMany({
        where: { riskId: measure.riskId, tenantId },
      });
      
      const allCompleted = allMeasures.every(m => m.status === "DONE");
      
      if (allCompleted) {
        await prisma.risk.update({
          where: { id: measure.riskId },
          data: { status: "CLOSED" },
        });
      }
    }

    if (measure.incidentId) {
      const incidentMeasures = await prisma.measure.findMany({
        where: { incidentId: measure.incidentId, tenantId },
      });
      
      const incidentAllCompleted = incidentMeasures.every(m => m.status === "DONE");
      
      await prisma.incident.update({
        where: { id: measure.incidentId, tenantId },
        data: {
          stage: incidentAllCompleted ? IncidentStage.ACTIONS_COMPLETE : IncidentStage.ACTIONS_DEFINED,
        },
      });
    }
    
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: user.id,
        action: "MEASURE_COMPLETED",
        resource: `Measure:${measure.id}`,
        metadata: JSON.stringify({
          title: measure.title,
          completionNote: validated.completionNote,
        }),
      },
    });
    
    revalidatePath("/dashboard/risks");
    revalidatePath("/dashboard/actions");
    if (measure.riskId) {
      revalidatePath(`/dashboard/risks/${measure.riskId}`);
    }
    
    return { success: true, data: measure };
  } catch (error: any) {
    console.error("Complete measure error:", error);
    return { success: false, error: error.message || "Kunne ikke fullføre tiltak" };
  }
}

// Slett tiltak
export async function deleteMeasure(id: string) {
  try {
    const { user, tenantId } = await getSessionContext();
    
    const measure = await prisma.measure.findUnique({
      where: { id, tenantId },
    });
    
    if (!measure) {
      return { success: false, error: "Tiltak ikke funnet" };
    }
    
    await prisma.measure.delete({
      where: { id, tenantId },
    });
    
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: user.id,
        action: "MEASURE_DELETED",
        resource: `Measure:${id}`,
        metadata: JSON.stringify({ title: measure.title }),
      },
    });
    
    revalidatePath("/dashboard/risks");
    revalidatePath("/dashboard/actions");
    if (measure.riskId) {
      revalidatePath(`/dashboard/risks/${measure.riskId}`);
    }
    
    return { success: true };
  } catch (error: any) {
    console.error("Delete measure error:", error);
    return { success: false, error: error.message || "Kunne ikke slette tiltak" };
  }
}

// Få statistikk over tiltak
export async function getMeasureStats(_tenantId: string) {
  try {
    const { tenantId } = await getSessionContext();
    
    const measures = await prisma.measure.findMany({
      where: { tenantId },
    });
    
    const now = new Date();
    const overdue = measures.filter(m => m.status !== "DONE" && new Date(m.dueAt) < now).length;
    
    const stats = {
      total: measures.length,
      pending: measures.filter(m => m.status === "PENDING").length,
      inProgress: measures.filter(m => m.status === "IN_PROGRESS").length,
      done: measures.filter(m => m.status === "DONE").length,
      overdue,
    };
    
    return { success: true, data: stats };
  } catch (error: any) {
    console.error("Get measure stats error:", error);
    return { success: false, error: error.message || "Kunne ikke hente statistikk" };
  }
}

