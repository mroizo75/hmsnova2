"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { generateSequenceNumber } from "@/lib/sequence";
import { getRequiredTenantContext } from "@/lib/tenant-context";
import { getAuthContext } from "@/lib/server-authorization";
import {
  createIncidentSchema,
  updateIncidentSchema,
  investigateIncidentSchema,
  closeIncidentSchema,
} from "@/features/incidents/schemas/incident.schema";
import { createNotification, notifyUsersByRoles } from "./notification.actions";
import { IncidentStage, IncidentStatus } from "@prisma/client";
import {
  parseModuleVisibilityConfig,
  getNotifyRolesForModule,
} from "@/lib/module-visibility";
import { dispatchNewIncidentNotifications } from "@/lib/incident-notification-routing.server";
import { normalizeProjectReference } from "@/lib/incident-project-reference";
import { resolveIncidentProjectId } from "@/lib/incident-project-reference.server";

async function getSessionContext() {
  const context = await getRequiredTenantContext();

  const user = await prisma.user.findUnique({
    where: { id: context.userId },
    select: {
      id: true,
      email: true,
    },
  });
  
  if (!user) {
    throw new Error("Unauthorized");
  }

  return { user, tenantId: context.tenantId };
}

async function getTenantModuleVisibility(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { moduleVisibilityConfig: true },
  });
  return parseModuleVisibilityConfig(tenant?.moduleVisibilityConfig);
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

const normalizeSuggestedMeasures = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item, index, array) => item.length > 0 && array.indexOf(item) === index)
    .slice(0, 5);
};

const assertTenantScopedRelations = async (input: {
  tenantId: string;
  projectId?: string | null;
  riskReferenceId?: string | null;
  reportedForUserId?: string | null;
}): Promise<void> => {
  if (input.projectId) {
    const project = await prisma.project.findFirst({
      where: {
        id: input.projectId,
        tenantId: input.tenantId,
      },
      select: { id: true },
    });
    if (!project) {
      throw new Error("Prosjekt finnes ikke i valgt tenant");
    }
  }

  if (input.riskReferenceId) {
    const risk = await prisma.risk.findFirst({
      where: {
        id: input.riskReferenceId,
        tenantId: input.tenantId,
      },
      select: { id: true },
    });
    if (!risk) {
      throw new Error("Risiko-referanse finnes ikke i valgt tenant");
    }
  }

  if (input.reportedForUserId) {
    const membership = await prisma.userTenant.findUnique({
      where: {
        userId_tenantId: {
          userId: input.reportedForUserId,
          tenantId: input.tenantId,
        },
      },
      select: { userId: true },
    });
    if (!membership) {
      throw new Error("Rapportert for-bruker finnes ikke i valgt tenant");
    }
  }
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

const buildCriticalStopWorkNotification = (incident: {
  id: string;
  type: string;
  title: string;
}): {
  type: "NEW_INCIDENT";
  title: string;
  message: string;
  link: string;
} => {
  return {
    type: "NEW_INCIDENT",
    title: "KRITISK: Stoppet arbeid",
    message: `${incident.type}: ${incident.title} - stoppet arbeid krever umiddelbar oppfolging.`,
    link: `/dashboard/incidents/${incident.id}`,
  };
};

// Hent avvik for en tenant – respekterer "kun egne" for ansatte uten full lesetilgang
export async function getIncidents(_tenantId: string) {
  try {
    const auth = await getAuthContext();
    if (!auth) throw new Error("Ikke autentisert");

    const canReadAll = auth.permissions.canReadIncidents;
    const canReadOwn = auth.permissions.canReadOwnIncidents;

    if (!canReadAll && !canReadOwn) {
      throw new Error("Ikke autorisert til å se avvik");
    }

    const { tenantId, userId } = auth;

    // Ansatte uten full tilgang ser kun egne avvik (rapportBy = innlogget bruker)
    const ownerFilter = canReadAll ? {} : { reportedBy: userId };

    const incidents = await prisma.incident.findMany({
      where: { tenantId, ...ownerFilter },
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
    
    return { success: true, data: incidents, ownOnly: !canReadAll };
  } catch (error: any) {
    console.error("Get incidents error:", error);
    return { success: false, error: error.message || "Kunne ikke hente avvik" };
  }
}

// Hent et spesifikt avvik – brukere uten full tilgang ser kun egne
export async function getIncident(id: string) {
  try {
    const auth = await getAuthContext();
    if (!auth) throw new Error("Ikke autentisert");

    const canReadAll = auth.permissions.canReadIncidents;
    const canReadOwn = auth.permissions.canReadOwnIncidents;

    if (!canReadAll && !canReadOwn) {
      throw new Error("Ikke autorisert til å se avvik");
    }

    const { userId: _userId, tenantId } = auth;
    const user = { id: auth.userId, email: auth.userEmail };

    // Ved "kun egne": legg til reportedBy-filter for å hindre henting av andres avvik
    const ownerFilter = canReadAll ? {} : { reportedBy: auth.userId };
    
    const incident = await prisma.incident.findFirst({
      where: { id, tenantId, ...ownerFilter },
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
      reportedBy: user.id,
      occurredAt: new Date(input.occurredAt),
      lostTimeMinutes: parseOptionalNumber(input.lostTimeMinutes),
      lostWorkdays: parseOptionalNumber(input.lostWorkdays),
      medicalAttentionRequired: parseBoolean(input.medicalAttentionRequired),
      isFatal: parseBoolean(input.isFatal) ?? false,
      isLostTimeIncident: parseBoolean(input.isLostTimeIncident) ?? false,
      isRestrictedWork: parseBoolean(input.isRestrictedWork) ?? false,
      responseDeadline: parseOptionalDate(input.responseDeadline),
      customerSatisfaction: parseOptionalNumber(input.customerSatisfaction),
      subcategoryKeys: Array.isArray(input.subcategoryKeys) ? input.subcategoryKeys : [],
      aiSuggestedMeasures: normalizeSuggestedMeasures(input.aiSuggestedMeasures),
    };
    const validated = createIncidentSchema.parse(normalizedInput);
    await assertTenantScopedRelations({
      tenantId,
      projectId: validated.projectId ?? null,
      riskReferenceId: validated.riskReferenceId ?? null,
      reportedForUserId: validated.reportedForUserId ?? null,
    });

    const avviksnummer = await generateSequenceNumber(
      validated.tenantId,
      "AVVIK",
      new Date(validated.occurredAt).getFullYear()
    );

    const projectReference = normalizeProjectReference(validated.projectReference);
    // Treffer referansen et registrert prosjekt, varsles prosjektlederen for det
    const projectId = await resolveIncidentProjectId({
      tenantId,
      projectId: validated.projectId ?? null,
      projectReference,
    });

    const incident = await prisma.incident.create({
      data: {
        tenantId: validated.tenantId,
        avviksnummer,
        type: validated.type,
        title: validated.title,
        description: validated.description,
        severity: validated.severity ?? null,
        occurredAt: validated.occurredAt,
        reportedBy: user.id,
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
        // Prosjektkobling
        projectId,
        projectReference,
        // Underkategorier
        subcategoryKeys: validated.subcategoryKeys?.length
          ? JSON.stringify(validated.subcategoryKeys)
          : null,
        // RUH-felt (AML § 5-2)
        involvedPersons: sanitizeString(validated.involvedPersons),
        injuryDescription: sanitizeString(validated.injuryDescription),
        suggestedActions: sanitizeString(validated.suggestedActions),
        // HSE-statistikk (TRIR)
        isFatal: validated.isFatal ?? false,
        isLostTimeIncident: validated.isLostTimeIncident ?? false,
        lostWorkdays: validated.lostWorkdays,
        isRestrictedWork: validated.isRestrictedWork ?? false,
        stage: IncidentStage.REPORTED,
      },
    });

    if (normalizedInput.aiSuggestedMeasures.length > 0) {
      const dueAt = new Date();
      dueAt.setDate(dueAt.getDate() + 14);
      await prisma.measure.createMany({
        data: normalizedInput.aiSuggestedMeasures.map((title) => ({
          tenantId,
          incidentId: incident.id,
          title,
          description: "AI-foreslått tiltak fra hendelsesanalyse. Bekreft ansvarlig og effekt.",
          dueAt,
          responsibleId: user.id,
          category: "CORRECTIVE",
          followUpFrequency: "ANNUAL",
        })),
      });
    }
    
    // Fire-and-forget: audit + notifikasjoner skal ikke blokkere brukeren
    void (async () => {
      try {
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
        const visConfig = await getTenantModuleVisibility(tenantId);
        const notifyRoles = getNotifyRolesForModule(visConfig, "incidents", ["ADMIN", "HMS", "LEDER"]);
        await dispatchNewIncidentNotifications({
          tenantId,
          reporterId: user.id,
          projectId: incident.projectId,
          fallbackRoles: notifyRoles,
          incidentId: incident.id,
          title: incident.title,
          typeLabel: incident.type,
        });
        if (incident.isRestrictedWork || (incident.severity ?? 0) >= 5) {
          const criticalRoles = getNotifyRolesForModule(visConfig, "incidents", ["ADMIN", "HMS"]);
          await notifyUsersByRoles(
            tenantId,
            criticalRoles,
            buildCriticalStopWorkNotification(incident),
          );
        }
      } catch (bgError) {
        console.error("Background notification error:", bgError);
      }
    })();

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
      lostWorkdays: parseOptionalNumber(input.lostWorkdays),
      medicalAttentionRequired: parseBoolean(input.medicalAttentionRequired),
      isFatal: parseBoolean(input.isFatal),
      isLostTimeIncident: parseBoolean(input.isLostTimeIncident),
      isRestrictedWork: parseBoolean(input.isRestrictedWork),
      responseDeadline: parseOptionalDate(input.responseDeadline),
      customerSatisfaction: parseOptionalNumber(input.customerSatisfaction),
      subcategoryKeys: Array.isArray(input.subcategoryKeys) ? input.subcategoryKeys : undefined,
    };
    const validated = updateIncidentSchema.parse(normalizedInput);
    await assertTenantScopedRelations({
      tenantId,
      projectId: validated.projectId,
      riskReferenceId: validated.riskReferenceId,
    });
    
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
    if (validated.projectId !== undefined) updateData.projectId = validated.projectId ?? null;
    if (validated.projectReference !== undefined) {
      updateData.projectReference = normalizeProjectReference(validated.projectReference);
    }
    if (validated.subcategoryKeys !== undefined) {
      updateData.subcategoryKeys = validated.subcategoryKeys.length
        ? JSON.stringify(validated.subcategoryKeys)
        : null;
    }
    if (validated.involvedPersons !== undefined) updateData.involvedPersons = sanitizeString(validated.involvedPersons);
    if (validated.injuryDescription !== undefined) updateData.injuryDescription = sanitizeString(validated.injuryDescription);
    if (validated.suggestedActions !== undefined) updateData.suggestedActions = sanitizeString(validated.suggestedActions);
    if (validated.isFatal !== undefined) updateData.isFatal = validated.isFatal;
    if (validated.isLostTimeIncident !== undefined) updateData.isLostTimeIncident = validated.isLostTimeIncident;
    if (validated.lostWorkdays !== undefined) updateData.lostWorkdays = validated.lostWorkdays;
    if (validated.isRestrictedWork !== undefined) updateData.isRestrictedWork = validated.isRestrictedWork;
    if (validated.source !== undefined) updateData.source = validated.source;

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
    
    const statusChanged = existingIncident.status !== incident.status;
    const becameStopWork = existingIncident.isRestrictedWork !== true && incident.isRestrictedWork === true;
    void (async () => {
      try {
        await prisma.auditLog.create({
          data: {
            tenantId,
            userId: user.id,
            action: "INCIDENT_UPDATED",
            resource: `Incident:${incident.id}`,
            metadata: JSON.stringify({ title: incident.title }),
          },
        });
        const visConfig = await getTenantModuleVisibility(tenantId);
        if (statusChanged) {
          const notifyRoles = getNotifyRolesForModule(visConfig, "incidents", ["ADMIN", "HMS", "LEDER"]);
          await notifyUsersByRoles(tenantId, notifyRoles, {
            type: "INCIDENT_UPDATED",
            title: "Avvik oppdatert",
            message: `${incident.type}: ${incident.title} - Status endret til ${incident.status}`,
            link: `/dashboard/incidents/${incident.id}`,
          });
        }
        if (becameStopWork || (incident.severity ?? 0) >= 5) {
          const criticalRoles = getNotifyRolesForModule(visConfig, "incidents", ["ADMIN", "HMS"]);
          await notifyUsersByRoles(
            tenantId,
            criticalRoles,
            buildCriticalStopWorkNotification(incident),
          );
        }
      } catch (bgError) {
        console.error("Background notification error:", bgError);
      }
    })();

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
        investigatedBy: user.id,
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
        closedBy: user.id,
        closedAt: new Date(),
        effectivenessReview: validated.effectivenessReview,
        lessonsLearned: validated.lessonsLearned,
        measureEffectiveness: validated.measureEffectiveness,
        stage: IncidentStage.VERIFIED,
        updatedAt: new Date(),
      },
    });
    
    void (async () => {
      try {
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
        const visConfig = await getTenantModuleVisibility(tenantId);
        const notifyRoles = getNotifyRolesForModule(visConfig, "incidents", ["ADMIN", "HMS", "LEDER"]);
        await notifyUsersByRoles(tenantId, notifyRoles, {
          type: "INCIDENT_CLOSED",
          title: "Avvik lukket",
          message: `${incident.type}: ${incident.title} er nå lukket`,
          link: `/dashboard/incidents/${incident.id}`,
        });
      } catch (bgError) {
        console.error("Background notification error:", bgError);
      }
    })();

    revalidatePath("/dashboard/incidents");
    revalidatePath(`/dashboard/incidents/${incident.id}`);
    return { success: true, data: incident };
  } catch (error: any) {
    console.error("Close incident error:", error);
    return { success: false, error: error.message || "Kunne ikke lukke avvik" };
  }
}

// Opprett avvik via filopplasting (eksternt/internt – minimalt skjema)
export async function createUploadedIncident(formData: FormData) {
  try {
    const { user, tenantId } = await getSessionContext();

    const title = (formData.get("title") as string | null)?.trim() ?? "";
    const source = (formData.get("source") as string | null)?.trim() ?? "EXTERNAL";
    const file = formData.get("file") as File | null;

    if (!title || title.length < 3) {
      return { success: false, error: "Tittel må være minst 3 tegn." };
    }
    if (source !== "INTERNAL" && source !== "EXTERNAL") {
      return { success: false, error: "Ugyldig kilde. Må være INTERNAL eller EXTERNAL." };
    }

    const avviksnummer = await generateSequenceNumber(
      tenantId,
      "AVVIK",
      new Date().getFullYear()
    );

    const incident = await prisma.incident.create({
      data: {
        tenantId,
        avviksnummer,
        type: "AVVIK",
        title,
        description: source === "EXTERNAL"
          ? "Eksternt avvik – se vedlagt fil for detaljer."
          : "Avvik opprettet via filopplasting.",
        // Ikke vurdert – leder setter alvorlighetsgrad ved behandling
        severity: null,
        occurredAt: new Date(),
        reportedBy: user.id,
        status: "OPEN",
        stage: IncidentStage.REPORTED,
        source,
      },
    });

    if (file && file.size > 0) {
      const { getStorage, generateFileKey } = await import("@/lib/storage");
      const storage = getStorage();
      const fileKey = generateFileKey(tenantId, "incidents", file.name);
      await storage.upload(fileKey, file);
      await prisma.attachment.create({
        data: {
          tenantId,
          incidentId: incident.id,
          fileKey,
          name: file.name,
          mime: file.type || "application/octet-stream",
          size: file.size,
        },
      });
    }

    void (async () => {
      try {
        await prisma.auditLog.create({
          data: {
            tenantId,
            userId: user.id,
            action: "INCIDENT_CREATED",
            resource: `Incident:${incident.id}`,
            metadata: JSON.stringify({
              title: incident.title,
              source,
              uploadedFile: file?.name ?? null,
            }),
          },
        });
        const visConfig = await getTenantModuleVisibility(tenantId);
        const notifyRoles = getNotifyRolesForModule(visConfig, "incidents", ["ADMIN", "HMS", "LEDER"]);
        await notifyUsersByRoles(tenantId, notifyRoles, {
          type: "NEW_INCIDENT",
          title: "Nytt avvik registrert",
          message: `${source === "EXTERNAL" ? "Eksternt" : "Internt"} avvik: ${incident.title}`,
          link: `/dashboard/incidents/${incident.id}`,
        });
      } catch (bgError) {
        console.error("Background notification error:", bgError);
      }
    })();

    revalidatePath("/dashboard/incidents");
    return { success: true, data: incident };
  } catch (error: any) {
    console.error("Create uploaded incident error:", error);
    return { success: false, error: error.message || "Kunne ikke opprette avvik" };
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
export async function getIncidentStats(_tenantId: string) {
  try {
    const { tenantId } = await getSessionContext();
    
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
        critical: incidents.filter(i => (i.severity ?? 0) >= 5).length,
        high: incidents.filter(i => i.severity === 4).length,
        medium: incidents.filter(i => i.severity === 3).length,
        low: incidents.filter(i => i.severity !== null && i.severity <= 2).length,
        notAssessed: incidents.filter(i => i.severity === null).length,
      },
    };
    
    return { success: true, data: stats };
  } catch (error: any) {
    console.error("Get incident stats error:", error);
    return { success: false, error: error.message || "Kunne ikke hente statistikk" };
  }
}

