"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import {
  createTrainingSchema,
  updateTrainingSchema,
  evaluateTrainingSchema,
} from "@/features/training/schemas/training.schema";

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

// Hent all opplæring for en tenant
export async function getTrainings(tenantId: string) {
  try {
    const { user } = await getSessionContext();
    
    const trainings = await prisma.training.findMany({
      where: { tenantId },
      orderBy: [
        { completedAt: "desc" },
        { createdAt: "desc" },
      ],
    });
    
    return { success: true, data: trainings };
  } catch (error: any) {
    console.error("Get trainings error:", error);
    return { success: false, error: error.message || "Kunne ikke hente opplæring" };
  }
}

// Hent opplæring for en spesifikk bruker
export async function getUserTrainings(userId: string) {
  try {
    const { user, tenantId } = await getSessionContext();
    
    const trainings = await prisma.training.findMany({
      where: { userId, tenantId },
      orderBy: { completedAt: "desc" },
    });
    
    return { success: true, data: trainings };
  } catch (error: any) {
    console.error("Get user trainings error:", error);
    return { success: false, error: error.message || "Kunne ikke hente opplæring" };
  }
}

// Opprett ny opplæring (ISO 9001: Dokumentere kompetanse)
export async function createTraining(input: any) {
  try {
    const { user, tenantId } = await getSessionContext();
    const validated = createTrainingSchema.parse({
      ...input,
      tenantId,
      completedAt: input.completedAt ? new Date(input.completedAt) : undefined,
      validUntil: input.validUntil ? new Date(input.validUntil) : undefined,
    });
    
    const training = await prisma.training.create({
      data: {
        tenantId: validated.tenantId,
        userId: validated.userId,
        courseKey: validated.courseKey,
        title: validated.title,
        provider: validated.provider,
        completedAt: validated.completedAt,
        validUntil: validated.validUntil,
        proofDocKey: validated.proofDocKey,
        isRequired: validated.isRequired,
      },
    });
    
    // Audit log
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: user.id,
        action: "TRAINING_CREATED",
        resource: `Training:${training.id}`,
        metadata: JSON.stringify({
          title: training.title,
          userId: training.userId,
          courseKey: training.courseKey,
        }),
      },
    });
    
    revalidatePath("/dashboard/training");
    return { success: true, data: training };
  } catch (error: any) {
    console.error("Create training error:", error);
    return { success: false, error: error.message || "Kunne ikke registrere opplæring" };
  }
}

// Oppdater opplæring
export async function updateTraining(input: any) {
  try {
    const { user, tenantId } = await getSessionContext();
    const validated = updateTrainingSchema.parse({
      ...input,
      completedAt: input.completedAt ? new Date(input.completedAt) : undefined,
      validUntil: input.validUntil ? new Date(input.validUntil) : undefined,
    });
    
    const existingTraining = await prisma.training.findFirst({
      where: { id: validated.id, tenantId },
    });
    
    if (!existingTraining) {
      return { success: false, error: "Opplæring ikke funnet" };
    }
    
    const training = await prisma.training.update({
      where: { id: validated.id },
      data: {
        ...validated,
        updatedAt: new Date(),
      },
    });
    
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: user.id,
        action: "TRAINING_UPDATED",
        resource: `Training:${training.id}`,
        metadata: JSON.stringify({ title: training.title }),
      },
    });
    
    revalidatePath("/dashboard/training");
    return { success: true, data: training };
  } catch (error: any) {
    console.error("Update training error:", error);
    return { success: false, error: error.message || "Kunne ikke oppdatere opplæring" };
  }
}

// Evaluer effektivitet av opplæring (ISO 9001: c)
export async function evaluateTraining(input: any) {
  try {
    const { user, tenantId } = await getSessionContext();
    const validated = evaluateTrainingSchema.parse(input);
    
    const training = await prisma.training.update({
      where: { id: validated.id },
      data: {
        effectiveness: validated.effectiveness,
        evaluatedBy: validated.evaluatedBy,
        evaluatedAt: new Date(),
        updatedAt: new Date(),
      },
    });
    
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: user.id,
        action: "TRAINING_EVALUATED",
        resource: `Training:${training.id}`,
        metadata: JSON.stringify({
          title: training.title,
          effectiveness: validated.effectiveness,
        }),
      },
    });
    
    revalidatePath("/dashboard/training");
    return { success: true, data: training };
  } catch (error: any) {
    console.error("Evaluate training error:", error);
    return { success: false, error: error.message || "Kunne ikke evaluere opplæring" };
  }
}

// Slett opplæring
export async function deleteTraining(id: string) {
  try {
    const { user, tenantId } = await getSessionContext();
    
    const training = await prisma.training.findFirst({
      where: { id, tenantId },
    });
    
    if (!training) {
      return { success: false, error: "Opplæring ikke funnet" };
    }
    
    // Slett dokumentert bevis fra storage hvis det finnes
    if (training.proofDocKey) {
      const storage = await import("@/lib/storage").then(m => m.getStorage());
      await storage.delete(training.proofDocKey);
    }
    
    await prisma.training.delete({
      where: { id },
    });
    
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: user.id,
        action: "TRAINING_DELETED",
        resource: `Training:${id}`,
        metadata: JSON.stringify({ title: training.title }),
      },
    });
    
    revalidatePath("/dashboard/training");
    return { success: true };
  } catch (error: any) {
    console.error("Delete training error:", error);
    return { success: false, error: error.message || "Kunne ikke slette opplæring" };
  }
}

// Få statistikk over opplæring
export async function getTrainingStats(tenantId: string) {
  try {
    const { user } = await getSessionContext();
    
    const trainings = await prisma.training.findMany({
      where: { tenantId },
    });
    
    const now = new Date();
    const expiringSoon = trainings.filter(t => {
      if (!t.validUntil) return false;
      const daysUntilExpiry = Math.ceil((new Date(t.validUntil).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
    }).length;
    
    const expired = trainings.filter(t => {
      if (!t.validUntil) return false;
      return new Date(t.validUntil) < now;
    }).length;
    
    const stats = {
      total: trainings.length,
      completed: trainings.filter(t => t.completedAt).length,
      notStarted: trainings.filter(t => !t.completedAt).length,
      expiringSoon,
      expired,
      evaluated: trainings.filter(t => t.effectiveness).length,
    };
    
    return { success: true, data: stats };
  } catch (error: any) {
    console.error("Get training stats error:", error);
    return { success: false, error: error.message || "Kunne ikke hente statistikk" };
  }
}

// Få kompetansematrise (hvem har hvilken kompetanse)
export async function getCompetenceMatrix(tenantId: string) {
  try {
    const { user } = await getSessionContext();
    
    const users = await prisma.user.findMany({
      where: {
        tenants: {
          some: { tenantId },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });
    
    const trainings = await prisma.training.findMany({
      where: { tenantId },
      orderBy: { courseKey: "asc" },
    });
    
    // Grupper opplæring per bruker
    const matrix = users.map(u => ({
      user: u,
      trainings: trainings.filter(t => t.userId === u.id),
    }));
    
    return { success: true, data: matrix };
  } catch (error: any) {
    console.error("Get competence matrix error:", error);
    return { success: false, error: error.message || "Kunne ikke hente kompetansematrise" };
  }
}

