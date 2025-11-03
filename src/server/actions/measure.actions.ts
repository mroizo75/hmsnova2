"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { createMeasureSchema, updateMeasureSchema, completeMeasureSchema } from "@/features/measures/schemas/measure.schema";

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

// Hent alle tiltak for en tenant
export async function getMeasures(tenantId: string) {
  try {
    const { user } = await getSessionContext();
    
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
    const validated = createMeasureSchema.parse({
      ...input,
      tenantId,
      dueAt: new Date(input.dueAt),
    });
    
    const measure = await prisma.measure.create({
      data: {
        tenantId: validated.tenantId,
        riskId: validated.riskId,
        incidentId: validated.incidentId,
        auditId: validated.auditId,
        goalId: validated.goalId,
        title: validated.title,
        description: validated.description,
        dueAt: validated.dueAt,
        responsibleId: validated.responsibleId,
        status: validated.status,
      },
    });
    
    // Oppdater risikostatus hvis tiltaket er knyttet til en risiko
    if (validated.riskId) {
      await prisma.risk.update({
        where: { id: validated.riskId },
        data: { status: "MITIGATING" },
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
    const validated = updateMeasureSchema.parse({
      ...input,
      dueAt: input.dueAt ? new Date(input.dueAt) : undefined,
    });
    
    const existingMeasure = await prisma.measure.findUnique({
      where: { id: validated.id, tenantId },
    });
    
    if (!existingMeasure) {
      return { success: false, error: "Tiltak ikke funnet" };
    }
    
    const measure = await prisma.measure.update({
      where: { id: validated.id, tenantId },
      data: {
        ...validated,
        updatedAt: new Date(),
      },
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
    const validated = completeMeasureSchema.parse({
      ...input,
      completedAt: new Date(input.completedAt),
    });
    
    const measure = await prisma.measure.update({
      where: { id: validated.id, tenantId },
      data: {
        status: "DONE",
        completedAt: validated.completedAt,
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
export async function getMeasureStats(tenantId: string) {
  try {
    const { user } = await getSessionContext();
    
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

