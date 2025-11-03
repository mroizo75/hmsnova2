"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import {
  createIncidentSchema,
  updateIncidentSchema,
  investigateIncidentSchema,
  closeIncidentSchema,
} from "@/features/incidents/schemas/incident.schema";

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

// Hent alle avvik for en tenant
export async function getIncidents(tenantId: string) {
  try {
    const { user } = await getSessionContext();
    
    const incidents = await prisma.incident.findMany({
      where: { tenantId },
      include: {
        measures: {
          select: {
            id: true,
            title: true,
            status: true,
            dueAt: true,
          },
        },
        attachments: {
          select: {
            id: true,
            name: true,
            fileKey: true,
          },
        },
      },
      orderBy: [
        { occurredAt: "desc" },
      ],
    });
    
    return { success: true, data: incidents };
  } catch (error: any) {
    console.error("Get incidents error:", error);
    return { success: false, error: error.message || "Kunne ikke hente avvik" };
  }
}

// Hent et spesifikt avvik
export async function getIncident(id: string) {
  try {
    const { user, tenantId } = await getSessionContext();
    
    const incident = await prisma.incident.findUnique({
      where: { id, tenantId },
      include: {
        measures: {
          orderBy: { createdAt: "desc" },
        },
        attachments: true,
      },
    });
    
    if (!incident) {
      return { success: false, error: "Avvik ikke funnet" };
    }
    
    return { success: true, data: incident };
  } catch (error: any) {
    console.error("Get incident error:", error);
    return { success: false, error: error.message || "Kunne ikke hente avvik" };
  }
}

// Opprett nytt avvik (ISO 9001: Rapportere avvik)
export async function createIncident(input: any) {
  try {
    const { user, tenantId } = await getSessionContext();
    const validated = createIncidentSchema.parse({
      ...input,
      tenantId,
      occurredAt: new Date(input.occurredAt),
    });
    
    const incident = await prisma.incident.create({
      data: {
        tenantId: validated.tenantId,
        type: validated.type,
        title: validated.title,
        description: validated.description,
        severity: validated.severity,
        occurredAt: validated.occurredAt,
        reportedBy: validated.reportedBy,
        location: validated.location,
        witnessName: validated.witnessName,
        immediateAction: validated.immediateAction,
      },
    });
    
    // Audit log
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: user.id,
        action: "INCIDENT_CREATED",
        resource: `Incident:${incident.id}`,
        metadata: JSON.stringify({
          title: incident.title,
          type: incident.type,
          severity: incident.severity,
        }),
      },
    });
    
    revalidatePath("/dashboard/incidents");
    return { success: true, data: incident };
  } catch (error: any) {
    console.error("Create incident error:", error);
    return { success: false, error: error.message || "Kunne ikke opprette avvik" };
  }
}

// Oppdater avvik
export async function updateIncident(input: any) {
  try {
    const { user, tenantId } = await getSessionContext();
    const validated = updateIncidentSchema.parse({
      ...input,
      occurredAt: input.occurredAt ? new Date(input.occurredAt) : undefined,
    });
    
    const existingIncident = await prisma.incident.findUnique({
      where: { id: validated.id, tenantId },
    });
    
    if (!existingIncident) {
      return { success: false, error: "Avvik ikke funnet" };
    }
    
    const incident = await prisma.incident.update({
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
        action: "INCIDENT_UPDATED",
        resource: `Incident:${incident.id}`,
        metadata: JSON.stringify({ title: incident.title }),
      },
    });
    
    revalidatePath("/dashboard/incidents");
    revalidatePath(`/dashboard/incidents/${incident.id}`);
    return { success: true, data: incident };
  } catch (error: any) {
    console.error("Update incident error:", error);
    return { success: false, error: error.message || "Kunne ikke oppdatere avvik" };
  }
}

// Utred avvik (ISO 9001: Årsaksanalyse)
export async function investigateIncident(input: any) {
  try {
    const { user, tenantId } = await getSessionContext();
    const validated = investigateIncidentSchema.parse(input);
    
    const incident = await prisma.incident.update({
      where: { id: validated.id, tenantId },
      data: {
        rootCause: validated.rootCause,
        contributingFactors: validated.contributingFactors,
        investigatedBy: validated.investigatedBy,
        investigatedAt: new Date(),
        status: "INVESTIGATING",
        updatedAt: new Date(),
      },
    });
    
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: user.id,
        action: "INCIDENT_INVESTIGATED",
        resource: `Incident:${incident.id}`,
        metadata: JSON.stringify({
          title: incident.title,
          rootCause: validated.rootCause,
        }),
      },
    });
    
    revalidatePath("/dashboard/incidents");
    revalidatePath(`/dashboard/incidents/${incident.id}`);
    return { success: true, data: incident };
  } catch (error: any) {
    console.error("Investigate incident error:", error);
    return { success: false, error: error.message || "Kunne ikke utrede avvik" };
  }
}

// Lukk avvik (ISO 9001: Evaluere effektivitet)
export async function closeIncident(input: any) {
  try {
    const { user, tenantId } = await getSessionContext();
    const validated = closeIncidentSchema.parse(input);
    
    // Sjekk at alle tiltak er fullført
    const measures = await prisma.measure.findMany({
      where: { incidentId: validated.id, tenantId },
    });
    
    const allMeasuresCompleted = measures.every(m => m.status === "DONE");
    
    if (measures.length > 0 && !allMeasuresCompleted) {
      return {
        success: false,
        error: "Alle tiltak må være fullført før avviket kan lukkes",
      };
    }
    
    const incident = await prisma.incident.update({
      where: { id: validated.id, tenantId },
      data: {
        status: "CLOSED",
        closedBy: validated.closedBy,
        closedAt: new Date(),
        effectivenessReview: validated.effectivenessReview,
        lessonsLearned: validated.lessonsLearned,
        updatedAt: new Date(),
      },
    });
    
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: user.id,
        action: "INCIDENT_CLOSED",
        resource: `Incident:${incident.id}`,
        metadata: JSON.stringify({
          title: incident.title,
          effectivenessReview: validated.effectivenessReview,
        }),
      },
    });
    
    revalidatePath("/dashboard/incidents");
    revalidatePath(`/dashboard/incidents/${incident.id}`);
    return { success: true, data: incident };
  } catch (error: any) {
    console.error("Close incident error:", error);
    return { success: false, error: error.message || "Kunne ikke lukke avvik" };
  }
}

// Slett avvik
export async function deleteIncident(id: string) {
  try {
    const { user, tenantId } = await getSessionContext();
    
    const incident = await prisma.incident.findUnique({
      where: { id, tenantId },
    });
    
    if (!incident) {
      return { success: false, error: "Avvik ikke funnet" };
    }
    
    // Slett tilknyttede vedlegg fra storage
    const attachments = await prisma.attachment.findMany({
      where: { incidentId: id, tenantId },
    });
    
    const storage = await import("@/lib/storage").then(m => m.getStorage());
    for (const attachment of attachments) {
      await storage.delete(attachment.fileKey);
    }
    
    await prisma.incident.delete({
      where: { id, tenantId },
    });
    
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: user.id,
        action: "INCIDENT_DELETED",
        resource: `Incident:${id}`,
        metadata: JSON.stringify({ title: incident.title }),
      },
    });
    
    revalidatePath("/dashboard/incidents");
    return { success: true };
  } catch (error: any) {
    console.error("Delete incident error:", error);
    return { success: false, error: error.message || "Kunne ikke slette avvik" };
  }
}

// Få statistikk over avvik
export async function getIncidentStats(tenantId: string) {
  try {
    const { user } = await getSessionContext();
    
    const incidents = await prisma.incident.findMany({
      where: { tenantId },
    });
    
    const stats = {
      total: incidents.length,
      open: incidents.filter(i => i.status === "OPEN").length,
      investigating: incidents.filter(i => i.status === "INVESTIGATING").length,
      actionTaken: incidents.filter(i => i.status === "ACTION_TAKEN").length,
      closed: incidents.filter(i => i.status === "CLOSED").length,
      byType: {
        avvik: incidents.filter(i => i.type === "AVVIK").length,
        nesten: incidents.filter(i => i.type === "NESTEN").length,
        skade: incidents.filter(i => i.type === "SKADE").length,
        miljo: incidents.filter(i => i.type === "MILJO").length,
        kvalitet: incidents.filter(i => i.type === "KVALITET").length,
      },
      bySeverity: {
        critical: incidents.filter(i => i.severity >= 5).length,
        high: incidents.filter(i => i.severity === 4).length,
        medium: incidents.filter(i => i.severity === 3).length,
        low: incidents.filter(i => i.severity <= 2).length,
      },
    };
    
    return { success: true, data: stats };
  } catch (error: any) {
    console.error("Get incident stats error:", error);
    return { success: false, error: error.message || "Kunne ikke hente statistikk" };
  }
}

