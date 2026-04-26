"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getRequiredTenantContext } from "@/lib/tenant-context";
import {
  createTrainingSchema,
  updateTrainingSchema,
  evaluateTrainingSchema,
} from "@/features/training/schemas/training.schema";
import { hasTenantFeature } from "@/lib/tenant-features";
import { runHealthcareTrainingExpiryAlerts } from "@/lib/healthcare-training-alerts";

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

// Hent all opplæring for en tenant
export async function getTrainings(_tenantId: string) {
  try {
    const { tenantId } = await getSessionContext();
    
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

    const duplicate = await prisma.training.findFirst({
      where: {
        tenantId,
        userId: validated.userId,
        courseKey: validated.courseKey,
        completedAt: validated.completedAt ?? undefined,
      },
    });
    if (duplicate) {
      return {
        success: false,
        error: `Denne ansatte har allerede kurset "${validated.title}" registrert med samme gjennomføringsdato.`,
      };
    }
    
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
export async function getTrainingStats(_tenantId: string) {
  try {
    const { tenantId } = await getSessionContext();
    
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

// Registrer flere kurs for én ansatt i én operasjon
export async function createEmployeeTrainings(input: {
  tenantId: string;
  userId: string;
  courses: Array<{
    courseKey: string;
    title: string;
    provider: string;
    completedAt?: string;
    validUntil?: string;
    proofDocKey?: string;
    isRequired?: boolean;
  }>;
}) {
  try {
    const { user, tenantId } = await getSessionContext();

    if (!input.courses || input.courses.length === 0) {
      return { success: false, error: "Ingen kurs lagt til" };
    }

    const created = await prisma.$transaction(
      input.courses.map((c) =>
        prisma.training.create({
          data: {
            tenantId,
            userId: input.userId,
            courseKey: c.courseKey,
            title: c.title,
            provider: c.provider,
            completedAt: c.completedAt ? new Date(c.completedAt) : undefined,
            validUntil: c.validUntil ? new Date(c.validUntil) : undefined,
            proofDocKey: c.proofDocKey ?? null,
            isRequired: c.isRequired ?? false,
          },
        })
      )
    );

    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: user.id,
        action: "TRAINING_EMPLOYEE_BULK_CREATED",
        resource: `Training:employee:${input.userId}`,
        metadata: JSON.stringify({
          userId: input.userId,
          count: created.length,
          courses: input.courses.map((c) => c.title),
        }),
      },
    });

    revalidatePath("/dashboard/training");
    return { success: true, data: created };
  } catch (error: any) {
    console.error("Create employee trainings error:", error);
    return { success: false, error: error.message || "Kunne ikke registrere kursene" };
  }
}

// Masseregistrer opplæring for flere ansatte i én operasjon
export async function createBulkTrainings(input: {
  tenantId: string;
  courseKey: string;
  title: string;
  provider: string;
  completedAt?: string;
  validUntil?: string;
  isRequired: boolean;
  participants: Array<{ userId: string; proofDocKey?: string }>;
}) {
  try {
    const { user, tenantId } = await getSessionContext();

    if (!input.participants || input.participants.length === 0) {
      return { success: false, error: "Ingen deltakere valgt" };
    }

    const completedAt = input.completedAt ? new Date(input.completedAt) : undefined;
    const validUntil = input.validUntil ? new Date(input.validUntil) : undefined;

    const created = await prisma.$transaction(
      input.participants.map((p) =>
        prisma.training.create({
          data: {
            tenantId,
            userId: p.userId,
            courseKey: input.courseKey,
            title: input.title,
            provider: input.provider,
            completedAt,
            validUntil,
            proofDocKey: p.proofDocKey ?? null,
            isRequired: input.isRequired,
          },
        })
      )
    );

    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: user.id,
        action: "TRAINING_BULK_CREATED",
        resource: `Training:bulk`,
        metadata: JSON.stringify({
          title: input.title,
          courseKey: input.courseKey,
          count: created.length,
          userIds: input.participants.map((p) => p.userId),
        }),
      },
    });

    revalidatePath("/dashboard/training");
    return { success: true, data: created };
  } catch (error: any) {
    console.error("Create bulk trainings error:", error);
    return { success: false, error: error.message || "Kunne ikke registrere opplæringene" };
  }
}

// Få kompetansematrise (hvem har hvilken kompetanse)
export async function getCompetenceMatrix(_tenantId: string) {
  try {
    const { tenantId } = await getSessionContext();
    
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

export async function sendHealthcareTrainingExpiryAlerts() {
  try {
    const { user, tenantId } = await getSessionContext();
    const userTenant = user.tenants.find((ut) => ut.tenantId === tenantId);
    const isAllowedRole =
      userTenant?.role === "ADMIN" ||
      userTenant?.role === "HMS" ||
      userTenant?.role === "LEDER";

    if (!isAllowedRole) {
      return { success: false, error: "Ingen tilgang til å sende varsler" };
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { industry: true },
    });

    if (!hasTenantFeature(tenant?.industry, "helseforetak")) {
      return { success: false, error: "Varslingsflyten er kun tilgjengelig for helsebransje" };
    }

    const result = await runHealthcareTrainingExpiryAlerts({ tenantId });
    return { success: true, data: { sent: result.totalSent } };
  } catch (error: any) {
    console.error("Send healthcare training expiry alerts error:", error);
    return { success: false, error: error.message || "Kunne ikke sende kompetansevarsler" };
  }
}

