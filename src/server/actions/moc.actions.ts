"use server";

import { revalidatePath } from "next/cache";
import { Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/server-authorization";
import { AuditLog } from "@/lib/audit-log";
import { generateMocNumber } from "@/lib/moc-number";
import { MOC_STATUS_LABELS } from "@/lib/moc-labels";
import {
  canTransitionMocStatus,
  type MocStatus,
  type MocTransitionContext,
} from "@/lib/moc-workflow";
import { createNotification } from "@/server/actions/notification.actions";
import { triggerRealtimeEvent } from "@/lib/pusher-server";
import {
  createMocSchema,
  transitionMocSchema,
  updateMocSchema,
} from "@/features/moc/schemas/moc.schema";
import { ZodError } from "zod";

function formatActionError(error: unknown, fallback: string): string {
  if (error instanceof ZodError) {
    return error.issues.map((issue) => issue.message).join(". ");
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

async function requireMocContext() {
  const auth = await getAuthContext();
  if (!auth) throw new Error("Ikke autentisert");

  const tenant = await prisma.tenant.findUnique({
    where: { id: auth.tenantId },
    select: { mocModuleEnabled: true },
  });
  if (!tenant?.mocModuleEnabled) {
    throw new Error("Endringsledelse er ikke slått på for denne bedriften");
  }
  return auth;
}

function transitionContextFromMoc(moc: {
  classification: MocTransitionContext["classification"];
  source: MocTransitionContext["source"];
  duration: MocTransitionContext["duration"];
  impactAssessment: string | null;
  environmentalImpact: string | null;
  plannedEndAt: Date | null;
  informedAt: Date | null;
  verificationNote: string | null;
  voReviewedAt: Date | null;
  _count: { riskLinks: number };
}): MocTransitionContext {
  return {
    classification: moc.classification,
    source: moc.source,
    duration: moc.duration,
    hasImpactAssessment: Boolean(moc.impactAssessment?.trim()),
    hasEnvironmentalImpact: Boolean(moc.environmentalImpact?.trim()),
    hasRiskLink: moc._count.riskLinks > 0,
    hasVoReview: Boolean(moc.voReviewedAt),
    hasPlannedEnd: Boolean(moc.plannedEndAt),
    hasInformed: Boolean(moc.informedAt),
    hasVerification: Boolean(moc.verificationNote?.trim()),
  };
}

function parseOptionalDate(value: string | null | undefined): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value.trim() === "") return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function getMocApproverIds(
  tenantId: string,
  classification: "MINOR" | "SIGNIFICANT" | "MAJOR",
): Promise<string[]> {
  const roles: Role[] =
    classification === "MINOR"
      ? [Role.ADMIN, Role.HMS, Role.LEDER]
      : [Role.ADMIN, Role.HMS, Role.LEDER, Role.VERNEOMBUD];
  const members = await prisma.userTenant.findMany({
    where: { tenantId, role: { in: roles } },
    select: { userId: true },
  });
  return members.map((member) => member.userId);
}

async function notifyMocWatchers(opts: {
  tenantId: string;
  mocId: string;
  number: string;
  title: string;
  message: string;
  actorId: string;
  extraUserIds?: string[];
}) {
  const moc = await prisma.managementOfChange.findUnique({
    where: { id: opts.mocId },
    select: {
      proposedById: true,
      responsibleId: true,
      affectedUsers: { select: { userId: true } },
    },
  });
  if (!moc) return;

  const ids = new Set<string>([
    moc.proposedById,
    ...(moc.responsibleId ? [moc.responsibleId] : []),
    ...moc.affectedUsers.map((row) => row.userId),
    ...(opts.extraUserIds ?? []),
  ]);
  ids.delete(opts.actorId);

  await Promise.all(
    [...ids].map((userId) =>
      createNotification({
        tenantId: opts.tenantId,
        userId,
        type: "MOC_UPDATED",
        title: `${opts.number}: ${opts.title}`,
        message: opts.message,
        link: `/dashboard/moc/${opts.mocId}`,
      }),
    ),
  );
}

export async function createMoc(input: unknown) {
  try {
    const auth = await requireMocContext();
    if (!auth.permissions.canCreateMoc) {
      throw new Error("Du har ikke tilgang til å opprette endringssaker");
    }

    const validated = createMocSchema.parse(input);
    const number = await generateMocNumber(auth.tenantId);

    const moc = await prisma.managementOfChange.create({
      data: {
        tenantId: auth.tenantId,
        number,
        title: validated.title,
        description: validated.description,
        changeType: validated.changeType,
        duration: validated.duration,
        source: validated.source,
        classification: validated.classification,
        hseImpact: validated.hseImpact,
        environmentalImpact: validated.environmentalImpact,
        plannedStartAt: parseOptionalDate(validated.plannedStartAt) ?? undefined,
        plannedEndAt: parseOptionalDate(validated.plannedEndAt) ?? undefined,
        rollbackPlan: validated.rollbackPlan?.trim() || null,
        projectId: validated.projectId || null,
        proposedById: auth.userId,
        status: "DRAFT",
        incidentLinks: validated.incidentId
          ? { create: { incidentId: validated.incidentId } }
          : undefined,
      },
    });

    await AuditLog.log(auth.tenantId, auth.userId, "MOC_CREATED", "ManagementOfChange", moc.id, {
      number,
      title: moc.title,
    });
    revalidatePath("/dashboard/moc");
    revalidatePath("/ansatt/moc");
    triggerRealtimeEvent(auth.tenantId, "moc-updated", { id: moc.id });
    return { success: true, data: { id: moc.id, number: moc.number } };
  } catch (error: unknown) {
    return { success: false, error: formatActionError(error, "Kunne ikke opprette endringssak") };
  }
}

export async function updateMoc(input: unknown) {
  try {
    const auth = await requireMocContext();
    const validated = updateMocSchema.parse(input);

    const existing = await prisma.managementOfChange.findFirst({
      where: { id: validated.id, tenantId: auth.tenantId },
    });
    if (!existing) throw new Error("Endringssaken ble ikke funnet");

    const canEdit =
      auth.permissions.canApproveMoc ||
      existing.proposedById === auth.userId ||
      existing.responsibleId === auth.userId;
    if (!canEdit) throw new Error("Du kan ikke redigere denne saken");
    if (existing.status === "CLOSED" || existing.status === "CANCELLED") {
      throw new Error("Lukkede saker kan ikke redigeres");
    }

    const moc = await prisma.managementOfChange.update({
      where: { id: existing.id },
      data: {
        title: validated.title,
        description: validated.description,
        changeType: validated.changeType,
        duration: validated.duration,
        classification: validated.classification,
        hseImpact: validated.hseImpact,
        environmentalImpact: validated.environmentalImpact,
        impactAssessment: validated.impactAssessment,
        plannedStartAt: parseOptionalDate(validated.plannedStartAt ?? undefined),
        plannedEndAt: parseOptionalDate(validated.plannedEndAt ?? undefined),
        rollbackPlan: validated.rollbackPlan,
        responsibleId: validated.responsibleId,
      },
    });

    await AuditLog.log(auth.tenantId, auth.userId, "MOC_UPDATED", "ManagementOfChange", moc.id, {
      number: moc.number,
    });
    revalidatePath(`/dashboard/moc/${moc.id}`);
    revalidatePath("/dashboard/moc");
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: formatActionError(error, "Kunne ikke oppdatere endringssak") };
  }
}

export async function transitionMoc(input: unknown) {
  try {
    const auth = await requireMocContext();
    const validated = transitionMocSchema.parse(input);

    const moc = await prisma.managementOfChange.findFirst({
      where: { id: validated.id, tenantId: auth.tenantId },
      include: { _count: { select: { riskLinks: true } } },
    });
    if (!moc) throw new Error("Endringssaken ble ikke funnet");

    const to = validated.to as MocStatus;
    if (to === "APPROVED" || to === "REJECTED") {
      if (!auth.permissions.canApproveMoc) {
        throw new Error("Kun HMS, leder eller admin kan godkjenne endringer");
      }
    }

    const result = canTransitionMocStatus(
      moc.status,
      to,
      transitionContextFromMoc({
        ...moc,
        verificationNote: validated.verificationNote ?? moc.verificationNote,
      }),
    );
    if (!result.ok) {
      throw new Error(result.message ?? "Ugyldig overgang");
    }

    const data: Prisma.ManagementOfChangeUpdateInput = { status: to };
    if (to === "APPROVED") {
      data.approvedBy = { connect: { id: auth.userId } };
      data.approvedAt = new Date();
    }
    if (to === "REJECTED") {
      data.rejectedReason = validated.rejectedReason?.trim() || "Avvist";
    }
    if (to === "CANCELLED") {
      data.cancelledReason = validated.cancelledReason?.trim() || "Kansellert";
    }
    if (to === "IMPLEMENTING") {
      data.implementedAt = new Date();
    }
    if (to === "VERIFYING" || to === "CLOSED") {
      if (validated.verificationNote?.trim()) {
        data.verificationNote = validated.verificationNote.trim();
      }
    }
    if (to === "CLOSED") {
      data.verifiedBy = { connect: { id: auth.userId } };
      data.verifiedAt = new Date();
      if (validated.verificationNote?.trim()) {
        data.verificationNote = validated.verificationNote.trim();
      }
    }

    await prisma.managementOfChange.update({
      where: { id: moc.id },
      data,
    });

    await AuditLog.log(auth.tenantId, auth.userId, "MOC_STATUS", "ManagementOfChange", moc.id, {
      from: moc.status,
      to,
    });

    const extraUserIds = to === "PENDING_APPROVAL" ? await getMocApproverIds(auth.tenantId, moc.classification) : [];
    const statusMessage =
      to === "APPROVED"
        ? "Endringen er godkjent"
        : to === "REJECTED"
          ? `Endringen er avvist${validated.rejectedReason?.trim() ? `: ${validated.rejectedReason.trim()}` : ""}`
          : to === "PENDING_APPROVAL"
            ? "Endringen venter på godkjenning"
            : `Status endret til ${MOC_STATUS_LABELS[to]}`;

    await notifyMocWatchers({
      tenantId: auth.tenantId,
      mocId: moc.id,
      number: moc.number,
      title: moc.title,
      message: statusMessage,
      actorId: auth.userId,
      extraUserIds,
    });
    revalidatePath(`/dashboard/moc/${moc.id}`);
    revalidatePath("/dashboard/moc");
    revalidatePath("/ansatt/moc");
    triggerRealtimeEvent(auth.tenantId, "moc-updated", { id: moc.id });
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: formatActionError(error, "Kunne ikke endre status") };
  }
}

export async function markMocVoReviewed(id: string) {
  try {
    const auth = await requireMocContext();
    if (auth.role !== "VERNEOMBUD" && !auth.permissions.canApproveMoc) {
      throw new Error("Kun verneombud eller HMS kan bekrefte medvirkning");
    }

    const moc = await prisma.managementOfChange.findFirst({
      where: { id, tenantId: auth.tenantId },
      select: { id: true },
    });
    if (!moc) throw new Error("Saken ble ikke funnet");

    await prisma.managementOfChange.update({
      where: { id: moc.id },
      data: { voReviewedAt: new Date(), voReviewedById: auth.userId },
    });
    revalidatePath(`/dashboard/moc/${id}`);
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: formatActionError(error, "Kunne ikke bekrefte medvirkning") };
  }
}

export async function markMocInformed(id: string) {
  try {
    const auth = await requireMocContext();
    const moc = await prisma.managementOfChange.findFirst({
      where: { id, tenantId: auth.tenantId },
      include: { affectedUsers: true },
    });
    if (!moc) throw new Error("Saken ble ikke funnet");

    const isAffected = moc.affectedUsers.some((row) => row.userId === auth.userId);
    const canMarkAll = auth.permissions.canApproveMoc || moc.proposedById === auth.userId;

    if (isAffected) {
      await prisma.mocAffectedUser.update({
        where: { mocId_userId: { mocId: id, userId: auth.userId } },
        data: { informedAt: new Date() },
      });
    }

    if (canMarkAll) {
      await prisma.managementOfChange.update({
        where: { id },
        data: { informedAt: new Date() },
      });
    } else if (isAffected) {
      const remaining = await prisma.mocAffectedUser.count({
        where: { mocId: id, informedAt: null },
      });
      if (remaining === 0) {
        await prisma.managementOfChange.update({
          where: { id },
          data: { informedAt: new Date() },
        });
      }
    } else {
      throw new Error("Du er ikke berørt av denne endringen");
    }

    revalidatePath(`/dashboard/moc/${id}`);
    revalidatePath("/ansatt/moc");
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: formatActionError(error, "Kunne ikke bekrefte informasjon") };
  }
}

export async function addMocLink(input: {
  mocId: string;
  kind: "risk" | "document" | "routine" | "sja" | "incident" | "environment";
  targetId: string;
}) {
  try {
    const auth = await requireMocContext();
    const moc = await prisma.managementOfChange.findFirst({
      where: { id: input.mocId, tenantId: auth.tenantId },
    });
    if (!moc) throw new Error("Saken ble ikke funnet");

    if (input.kind === "risk") {
      await prisma.mocRiskLink.create({ data: { mocId: input.mocId, riskId: input.targetId } });
    } else if (input.kind === "document") {
      await prisma.mocDocumentLink.create({ data: { mocId: input.mocId, documentId: input.targetId } });
    } else if (input.kind === "routine") {
      await prisma.mocRoutineLink.create({ data: { mocId: input.mocId, routineId: input.targetId } });
    } else if (input.kind === "sja") {
      await prisma.mocSjaLink.create({ data: { mocId: input.mocId, sjaAnalysisId: input.targetId } });
    } else if (input.kind === "environment") {
      const aspect = await prisma.environmentalAspect.findFirst({
        where: { id: input.targetId, tenantId: auth.tenantId },
        select: { id: true },
      });
      if (!aspect) throw new Error("Miljøaspektet finnes ikke i denne virksomheten.");
      await prisma.mocEnvironmentalAspectLink.create({
        data: { mocId: input.mocId, environmentalAspectId: input.targetId },
      });
    } else {
      await prisma.mocIncidentLink.create({ data: { mocId: input.mocId, incidentId: input.targetId } });
    }

    revalidatePath(`/dashboard/moc/${input.mocId}`);
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: formatActionError(error, "Kunne ikke knytte objekt") };
  }
}

export async function addMocAffectedUsers(mocId: string, userIds: string[]) {
  try {
    const auth = await requireMocContext();
    const moc = await prisma.managementOfChange.findFirst({
      where: { id: mocId, tenantId: auth.tenantId },
      select: { id: true },
    });
    if (!moc) throw new Error("Saken ble ikke funnet");
    const unique = [...new Set(userIds.filter(Boolean))];
    await prisma.mocAffectedUser.createMany({
      data: unique.map((userId) => ({ mocId, userId })),
      skipDuplicates: true,
    });
    await AuditLog.log(auth.tenantId, auth.userId, "MOC_AFFECTED", "ManagementOfChange", mocId, {
      count: unique.length,
    });
    revalidatePath(`/dashboard/moc/${mocId}`);
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: formatActionError(error, "Kunne ikke legge til berørte") };
  }
}
