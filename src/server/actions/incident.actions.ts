"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { generateSequenceNumber } from "@/lib/sequence";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import {
  createIncidentSchema,
  updateIncidentSchema,
  investigateIncidentSchema,
  closeIncidentSchema,
} from "@/features/incidents/schemas/incident.schema";
import { createNotification, notifyUsersByRole } from "./notification.actions";
import { IncidentStage, IncidentStatus } from "@prisma/client";

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

const sanitizeString = (value?: string | null) => {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const parseOptionalNumber = (value: any) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const parseBoolean = (value: any) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value.toLowerCase() === "true") return true;
    if (value.toLowerCase() === "false") return false;
  }
  return undefined;
};

const parseOptionalDate = (value: any) => {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const stageFromStatus = (status: IncidentStatus): IncidentStage => {
  switch (status) {
    case "INVESTIGATING":
      return "UNDER_REVIEW";
    case "ACTION_TAKEN":
      return "ACTIONS_DEFINED";
    case "CLOSED":
      return "VERIFIED";
    case "OPEN":
    default:
      return "REPORTED";
  }
};

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
        risk: {
          select: {
            id: true,
            title: true,
            category: true,
            score: true,
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
        risk: {
          select: {
            id: true,
            title: true,
            category: true,
            score: true,
          },
        },
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
    const normalizedInput = {
      ...input,
      tenantId,
      occurredAt: new Date(input.occurredAt),
      lostTimeMinutes: parseOptionalNumber(input.lostTimeMinutes),
      medicalAttentionRequired: parseBoolean(input.medicalAttentionRequired),
    responseDeadline: parseOptionalDate(input.responseDeadline),
    customerSatisfaction: parseOptionalNumber(input.customerSatisfaction),
    };
    const validated = createIncidentSchema.parse(normalizedInput);

    const avviksnummer = await generateSequenceNumber(
      validated.tenantId,
      "AVVIK",
      new Date(validated.occurredAt).getFullYear()
    );

    const incident = await prisma.incident.create({
      data: {
        tenantId: validated.tenantId,
        avviksnummer,
        type: validated.type,
        title: validated.title,
        description: validated.description,
        severity: validated.severity,
        occurredAt: validated.occurredAt,
        reportedBy: validated.reportedBy,
        reportedForUserId: validated.reportedForUserId ?? null,
        location: sanitizeString(validated.location),
        witnessName: sanitizeString(validated.witnessName),
        immediateAction: sanitizeString(validated.immediateAction),
        injuryType: sanitizeString(validated.injuryType),
        medicalAttentionRequired: validated.medicalAttentionRequired ?? false,
        lostTimeMinutes: validated.lostTimeMinutes,
        riskReferenceId: validated.riskReferenceId ?? null,
        customerName: sanitizeString(validated.customerName),
        customerEmail: sanitizeString(validated.customerEmail),
        customerPhone: sanitizeString(validated.customerPhone),
        customerTicketId: sanitizeString(validated.customerTicketId),
        responseDeadline: validated.responseDeadline ?? null,
        customerSatisfaction: validated.customerSatisfaction ?? null,
        stage: IncidentStage.REPORTED,
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
    
    // Send varsling til HMS-ansvarlige
    await notifyUsersByRole(tenantId, "HMS", {
      type: "NEW_INCIDENT",
      title: "Nytt avvik registrert",
      message: `${incident.type}: ${incident.title}`,
      link: `/dashboard/incidents/${incident.id}`,
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
    const normalizedInput = {
      ...input,
      occurredAt: input.occurredAt ? new Date(input.occurredAt) : undefined,
      lostTimeMinutes: parseOptionalNumber(input.lostTimeMinutes),
      medicalAttentionRequired: parseBoolean(input.medicalAttentionRequired),
    responseDeadline: parseOptionalDate(input.responseDeadline),
    customerSatisfaction: parseOptionalNumber(input.customerSatisfaction),
    };
    const validated = updateIncidentSchema.parse(normalizedInput);
    
    const existingIncident = await prisma.incident.findUnique({
      where: { id: validated.id, tenantId },
    });
    
    if (!existingIncident) {
      return { success: false, error: "Avvik ikke funnet" };
    }
    
    const updateData: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (validated.title) updateData.title = validated.title;
    if (validated.description) updateData.description = validated.description;
    if (validated.type) updateData.type = validated.type;
    if (validated.severity !== undefined) updateData.severity = validated.severity;
    if (validated.occurredAt) updateData.occurredAt = validated.occurredAt;
    if (validated.location !== undefined) updateData.location = sanitizeString(validated.location);
    if (validated.witnessName !== undefined) updateData.witnessName = sanitizeString(validated.witnessName);
    if (validated.immediateAction !== undefined) updateData.immediateAction = sanitizeString(validated.immediateAction);
    if (validated.rootCause !== undefined) updateData.rootCause = validated.rootCause;
    if (validated.contributingFactors !== undefined) updateData.contributingFactors = validated.contributingFactors;
    if (validated.injuryType !== undefined) updateData.injuryType = sanitizeString(validated.injuryType);
    if (validated.medicalAttentionRequired !== undefined) updateData.medicalAttentionRequired = validated.medicalAttentionRequired;
    if (validated.lostTimeMinutes !== undefined) updateData.lostTimeMinutes = validated.lostTimeMinutes;
    if (validated.riskReferenceId !== undefined) updateData.riskReferenceId = validated.riskReferenceId ?? null;
    if (validated.measureEffectiveness) updateData.measureEffectiveness = validated.measureEffectiveness;
    if (validated.customerName !== undefined) updateData.customerName = sanitizeString(validated.customerName);
    if (validated.customerEmail !== undefined) updateData.customerEmail = sanitizeString(validated.customerEmail);
    if (validated.customerPhone !== undefined) updateData.customerPhone = sanitizeString(validated.customerPhone);
    if (validated.customerTicketId !== undefined) updateData.customerTicketId = sanitizeString(validated.customerTicketId);
    if (validated.responseDeadline !== undefined) updateData.responseDeadline = validated.responseDeadline ?? null;
    if (validated.customerSatisfaction !== undefined) updateData.customerSatisfaction = validated.customerSatisfaction ?? null;

    let stageToPersist = validated.stage;
    if (!stageToPersist && validated.status) {
      stageToPersist = stageFromStatus(validated.status);
    }

    if (stageToPersist && stageToPersist !== existingIncident.stage) {
      updateData.stage = stageToPersist;
    }

    if (validated.status) {
      updateData.status = validated.status;
    }

    const incident = await prisma.incident.update({
      where: { id: validated.id, tenantId },
      data: updateData,
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
    
    // Send varsling hvis status endres
    if (existingIncident.status !== incident.status) {
      await notifyUsersByRole(tenantId, "HMS", {
        type: "INCIDENT_UPDATED",
        title: "Avvik oppdatert",
        message: `${incident.type}: ${incident.title} - Status endret til ${incident.status}`,
        link: `/dashboard/incidents/${incident.id}`,
      });
    }
    
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
        stage: IncidentStage.ROOT_CAUSE,
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
        measureEffectiveness: validated.measureEffectiveness,
        stage: IncidentStage.VERIFIED,
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
    
    // Send varsling om lukket avvik
    await notifyUsersByRole(tenantId, "HMS", {
      type: "INCIDENT_CLOSED",
      title: "Avvik lukket",
      message: `${incident.type}: ${incident.title} er nå lukket`,
      link: `/dashboard/incidents/${incident.id}`,
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

