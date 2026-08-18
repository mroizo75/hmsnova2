"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { generateSequenceNumber } from "@/lib/sequence";
import { getRequiredTenantContext } from "@/lib/tenant-context";
import { getAuthContext } from "@/lib/server-authorization";
import { onRuhCreated } from "@/features/hms-ai/lib/event-handler";
import {
  createRuhSchema,
  updateRuhSchema,
} from "@/features/ruh/schemas/ruh.schema";
import { notifyUsersByRole, notifyUsersByRoles } from "./notification.actions";
import { RuhStatus } from "@prisma/client";
import {
  parseModuleVisibilityConfig,
  getNotifyRolesForModule,
} from "@/lib/module-visibility";

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

export async function getRuhReports(_tenantId: string) {
  try {
    const auth = await getAuthContext();
    if (!auth) throw new Error("Ikke autentisert");

    const canReadAll = auth.permissions.canReadRuh;
    const canReadOwn = auth.permissions.canReadOwnRuh;

    if (!canReadAll && !canReadOwn) {
      throw new Error("Ikke autorisert til å se RUH-rapporter");
    }

    const { tenantId, userId } = auth;
    // reportedById er Optional — sjekk om brukeren er den som sendte inn
    const ownerFilter = canReadAll ? {} : { reportedById: userId };

    const reports = await prisma.ruhReport.findMany({
      where: { tenantId, ...ownerFilter },
      include: {
        attachments: {
          select: {
            id: true,
            name: true,
            fileKey: true,
          },
        },
      },
      orderBy: [{ occurredAt: "desc" }],
    });

    return { success: true, data: reports, ownOnly: !canReadAll };
  } catch (error: any) {
    return { success: false, error: error.message || "Kunne ikke hente RUH-rapporter" };
  }
}

export async function getRuhReport(id: string) {
  try {
    const auth = await getAuthContext();
    if (!auth) throw new Error("Ikke autentisert");

    const canReadAll = auth.permissions.canReadRuh;
    const canReadOwn = auth.permissions.canReadOwnRuh;

    if (!canReadAll && !canReadOwn) {
      throw new Error("Ikke autorisert til å se RUH-rapporter");
    }

    const { tenantId, userId } = auth;
    const ownerFilter = canReadAll ? {} : { reportedById: userId };

    const report = await prisma.ruhReport.findFirst({
      where: { id, tenantId, ...ownerFilter },
      include: {
        attachments: true,
      },
    });

    if (!report) {
      return { success: false, error: "RUH-rapport ikke funnet" };
    }

    return { success: true, data: report };
  } catch (error: any) {
    return { success: false, error: error.message || "Kunne ikke hente RUH-rapport" };
  }
}

export async function createRuhReport(input: any) {
  try {
    const { user, tenantId } = await getSessionContext();

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { ruhModuleEnabled: true },
    });
    if (tenant && !tenant.ruhModuleEnabled) {
      return {
        success: false,
        error: "RUH er ikke i bruk i denne virksomheten. Registrer hendelsen som avvik.",
      };
    }

    const normalizedInput = {
      ...input,
      tenantId,
      occurredAt: new Date(input.occurredAt),
    };
    const validated = createRuhSchema.parse(normalizedInput);

    const ruhNummer = await generateSequenceNumber(
      validated.tenantId,
      "RUH",
      new Date(validated.occurredAt).getFullYear()
    );

    const report = await prisma.ruhReport.create({
      data: {
        tenantId: validated.tenantId,
        ruhNummer,
        category: validated.category,
        title: validated.title,
        description: validated.description,
        occurredAt: validated.occurredAt,
        location: sanitizeString(validated.location),
        reportedBy: validated.reportedBy,
        reportedById: validated.reportedById ?? user.id,
        involvedPersons: sanitizeString(validated.involvedPersons),
        witnessName: sanitizeString(validated.witnessName),
        injuryOccurred: validated.injuryOccurred ?? false,
        injuryDescription: sanitizeString(validated.injuryDescription),
        immediateAction: sanitizeString(validated.immediateAction),
        suggestedActions: sanitizeString(validated.suggestedActions),
        status: RuhStatus.SUBMITTED,
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: user.id,
        action: "RUH_CREATED",
        resource: `RuhReport:${report.id}`,
        metadata: JSON.stringify({
          title: report.title,
          category: report.category,
        }),
      },
    });

    const visConfig = await getTenantModuleVisibility(tenantId);
    const ruhNotifyRoles = getNotifyRolesForModule(visConfig, "ruh", ["ADMIN", "HMS", "LEDER"]);
    if (ruhNotifyRoles.length > 0) {
      const { notifyUsersByRoles } = await import("./notification.actions");
      await notifyUsersByRoles(tenantId, ruhNotifyRoles, {
        type: "NEW_INCIDENT",
        title: "Ny RUH-rapport innsendt",
        message: `${report.category}: ${report.title} - Rapportert av ${report.reportedBy}`,
        link: `/dashboard/ruh/${report.id}`,
      });
    }

    revalidatePath("/dashboard/ruh");

    // HMS Intelligens-motor: analyser mønstre og oppdater score
    onRuhCreated(tenantId, report.id).catch(() => {});

    return { success: true, data: report };
  } catch (error: any) {
    return { success: false, error: error.message || "Kunne ikke opprette RUH-rapport" };
  }
}

export async function updateRuhReport(input: any) {
  try {
    const { user, tenantId } = await getSessionContext();
    const normalizedInput = {
      ...input,
      occurredAt: input.occurredAt ? new Date(input.occurredAt) : undefined,
    };
    const validated = updateRuhSchema.parse(normalizedInput);

    const existing = await prisma.ruhReport.findUnique({
      where: { id: validated.id, tenantId },
    });

    if (!existing) {
      return { success: false, error: "RUH-rapport ikke funnet" };
    }

    const updateData: Record<string, any> = { updatedAt: new Date() };

    if (validated.category) updateData.category = validated.category;
    if (validated.title) updateData.title = validated.title;
    if (validated.description) updateData.description = validated.description;
    if (validated.occurredAt) updateData.occurredAt = validated.occurredAt;
    if (validated.location !== undefined) updateData.location = sanitizeString(validated.location);
    if (validated.involvedPersons !== undefined) updateData.involvedPersons = sanitizeString(validated.involvedPersons);
    if (validated.witnessName !== undefined) updateData.witnessName = sanitizeString(validated.witnessName);
    if (validated.injuryOccurred !== undefined) updateData.injuryOccurred = validated.injuryOccurred;
    if (validated.injuryDescription !== undefined) updateData.injuryDescription = sanitizeString(validated.injuryDescription);
    if (validated.immediateAction !== undefined) updateData.immediateAction = sanitizeString(validated.immediateAction);
    if (validated.suggestedActions !== undefined) updateData.suggestedActions = sanitizeString(validated.suggestedActions);

    if (validated.status === RuhStatus.UNDER_REVIEW && existing.status === RuhStatus.SUBMITTED) {
      updateData.status = RuhStatus.UNDER_REVIEW;
      updateData.reviewedBy = user.id;
      updateData.reviewedAt = new Date();
      if (validated.reviewComment) updateData.reviewComment = validated.reviewComment;
    }

    if (validated.status === RuhStatus.COMPLETED && existing.status !== RuhStatus.COMPLETED) {
      updateData.status = RuhStatus.COMPLETED;
      updateData.completedBy = user.id;
      updateData.completedAt = new Date();
      if (validated.completedComment) updateData.completedComment = validated.completedComment;
    }

    const report = await prisma.ruhReport.update({
      where: { id: validated.id, tenantId },
      data: updateData,
    });

    const statusChanged = existing.status !== report.status;
    const substantiveRuhFields = [
      "injuryDescription", "involvedPersons", "immediateAction",
      "suggestedActions", "injuryOccurred", "reviewComment", "completedComment",
    ] as const;
    const substantiveChange = substantiveRuhFields.some(
      (f) => updateData[f] !== undefined && updateData[f] !== (existing as any)[f],
    );

    void (async () => {
      try {
        await prisma.auditLog.create({
          data: {
            tenantId,
            userId: user.id,
            action: "RUH_UPDATED",
            resource: `RuhReport:${report.id}`,
            metadata: JSON.stringify({ title: report.title, status: report.status }),
          },
        });

        const tenant = await prisma.tenant.findUnique({
          where: { id: tenantId },
          select: { moduleVisibilityConfig: true },
        });
        const visConfig = parseModuleVisibilityConfig(tenant?.moduleVisibilityConfig);

        if (statusChanged) {
          const statusLabels: Record<string, string> = {
            SUBMITTED: "Innsendt",
            UNDER_REVIEW: "Under behandling",
            COMPLETED: "Fullført",
          };
          const notifyRoles = getNotifyRolesForModule(visConfig, "ruh", ["ADMIN", "HMS", "LEDER"]);
          await notifyUsersByRoles(tenantId, notifyRoles, {
            type: "INCIDENT_UPDATED",
            title: "RUH-rapport oppdatert",
            message: `RUH: ${report.title} – Status endret til ${statusLabels[report.status] ?? report.status}`,
            link: `/dashboard/ruh/${report.id}`,
          });
        } else if (substantiveChange) {
          const changedLabels: string[] = [];
          if (updateData.injuryDescription !== undefined) changedLabels.push("skadebeskrivelse");
          if (updateData.involvedPersons !== undefined) changedLabels.push("involverte personer");
          if (updateData.immediateAction !== undefined) changedLabels.push("strakstiltak");
          if (updateData.suggestedActions !== undefined) changedLabels.push("foreslåtte tiltak");
          if (updateData.injuryOccurred !== undefined) changedLabels.push("skade oppstått");

          const notifyRoles = getNotifyRolesForModule(visConfig, "ruh", ["ADMIN", "HMS"]);
          await notifyUsersByRoles(tenantId, notifyRoles, {
            type: "INCIDENT_UPDATED",
            title: "Ny informasjon lagt til i RUH",
            message: `RUH: ${report.title} – Oppdatert: ${changedLabels.join(", ")}`,
            link: `/dashboard/ruh/${report.id}`,
          });
        }
      } catch (bgError) {
        console.error("Background RUH notification error:", bgError);
      }
    })();

    revalidatePath("/dashboard/ruh");
    revalidatePath(`/dashboard/ruh/${report.id}`);
    return { success: true, data: report };
  } catch (error: any) {
    return { success: false, error: error.message || "Kunne ikke oppdatere RUH-rapport" };
  }
}

export async function deleteRuhReport(id: string) {
  try {
    const { user, tenantId } = await getSessionContext();

    const report = await prisma.ruhReport.findUnique({
      where: { id, tenantId },
    });

    if (!report) {
      return { success: false, error: "RUH-rapport ikke funnet" };
    }

    const attachments = await prisma.attachment.findMany({
      where: { ruhReportId: id, tenantId },
    });

    const storage = await import("@/lib/storage").then((m) => m.getStorage());
    for (const attachment of attachments) {
      await storage.delete(attachment.fileKey);
    }

    await prisma.ruhReport.delete({
      where: { id, tenantId },
    });

    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: user.id,
        action: "RUH_DELETED",
        resource: `RuhReport:${id}`,
        metadata: JSON.stringify({ title: report.title }),
      },
    });

    revalidatePath("/dashboard/ruh");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Kunne ikke slette RUH-rapport" };
  }
}

export async function getRuhStats(_tenantId: string) {
  try {
    const { tenantId } = await getSessionContext();

    const reports = await prisma.ruhReport.findMany({
      where: { tenantId },
    });

    const stats = {
      total: reports.length,
      submitted: reports.filter((r) => r.status === "SUBMITTED").length,
      underReview: reports.filter((r) => r.status === "UNDER_REVIEW").length,
      completed: reports.filter((r) => r.status === "COMPLETED").length,
      byCategory: {
        personskade: reports.filter((r) => r.category === "PERSONSKADE").length,
        nestenulykke: reports.filter((r) => r.category === "NESTENULYKKE").length,
        materiellSkade: reports.filter((r) => r.category === "MATERIELL_SKADE").length,
        brannEksplosjon: reports.filter((r) => r.category === "BRANN_EKSPLOSJON").length,
        utslippMiljo: reports.filter((r) => r.category === "UTSLIPP_MILJO").length,
        truslerVold: reports.filter((r) => r.category === "TRUSLER_VOLD").length,
        ergonomi: reports.filter((r) => r.category === "ERGONOMI").length,
        annet: reports.filter((r) => r.category === "ANNET").length,
      },
    };

    return { success: true, data: stats };
  } catch (error: any) {
    return { success: false, error: error.message || "Kunne ikke hente statistikk" };
  }
}
