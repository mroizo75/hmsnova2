"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { generateSequenceNumber } from "@/lib/sequence";
import { getRequiredTenantContext } from "@/lib/tenant-context";
import { getAuthContext } from "@/lib/server-authorization";
import {
  createSjaSchema,
  updateSjaSchema,
  createSjaTemplateSchema,
  updateSjaTemplateSchema,
} from "@/features/sja/schemas/sja.schema";
import { RoutineStatus, SjaStatus, SjaConclusion } from "@prisma/client";
import { AuditLog } from "@/lib/audit-log";
import { triggerRealtimeEvent } from "@/lib/pusher-server";
import {
  evaluateFseCompetence,
  getRequiredCourseKeys,
} from "@/features/sja/lib/sja-fse";

async function getSessionContext() {
  const context = await getRequiredTenantContext();
  const auth = await getAuthContext();
  if (!auth) throw new Error("Ikke autentisert");

  const user = await prisma.user.findUnique({
    where: { id: context.userId },
    include: { tenants: true },
  });

  if (!user || user.tenants.length === 0) {
    throw new Error("User not associated with a tenant");
  }

  return { user, tenantId: context.tenantId, auth };
}

function parseStringArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

async function buildParticipantRecords(
  tenantId: string,
  electricalWorkType: Parameters<typeof getRequiredCourseKeys>[0],
  participantRecords: Array<{
    userId?: string;
    name: string;
    isExternal: boolean;
    competenceConfirmed: boolean;
  }>,
  templateCourseKeys: string[],
) {
  const requiredCourseKeys = Array.from(
    new Set([...getRequiredCourseKeys(electricalWorkType), ...templateCourseKeys]),
  );
  const internalUserIds = participantRecords
    .filter((participant) => !participant.isExternal && participant.userId)
    .map((participant) => participant.userId as string);

  const [memberships, training] = await Promise.all([
    prisma.userTenant.findMany({
      where: { tenantId, userId: { in: internalUserIds } },
      include: { user: { select: { name: true, email: true } } },
    }),
    prisma.training.findMany({
      where: {
        tenantId,
        userId: { in: internalUserIds },
        courseKey: { in: requiredCourseKeys },
      },
      select: { userId: true, courseKey: true, completedAt: true, validUntil: true },
    }),
  ]);
  const membershipByUserId = new Map(memberships.map((membership) => [membership.userId, membership]));

  return participantRecords.map((participant) => {
    if (participant.isExternal) {
      if (requiredCourseKeys.length > 0 && !participant.competenceConfirmed) {
        throw new Error(`Kompetansen til ekstern deltaker ${participant.name} må bekreftes`);
      }
      return {
        userId: null,
        name: participant.name,
        isExternal: true,
        competenceStatus:
          requiredCourseKeys.length > 0 ? "MANUALLY_CONFIRMED" as const : "NOT_REQUIRED" as const,
        competenceSnapshot: JSON.stringify({ requiredCourseKeys, manuallyConfirmed: true }),
      };
    }

    if (!participant.userId) {
      throw new Error(`Intern deltaker ${participant.name} mangler bruker`);
    }
    const membership = membershipByUserId.get(participant.userId);
    if (!membership) {
      throw new Error("En valgt deltaker tilhører ikke bedriften");
    }

    const evaluation = evaluateFseCompetence(
      requiredCourseKeys,
      training.filter((record) => record.userId === participant.userId),
    );
    if (evaluation.status === "MISSING" || evaluation.status === "EXPIRED") {
      const problemKeys = [...evaluation.missingCourseKeys, ...evaluation.expiredCourseKeys];
      throw new Error(
        `${membership.displayName || membership.user.name || membership.user.email} mangler gyldig kompetanse: ${problemKeys.join(", ")}`,
      );
    }

    return {
      userId: participant.userId,
      name: membership.displayName || membership.user.name || membership.user.email,
      isExternal: false,
      competenceStatus: evaluation.status,
      competenceSnapshot: JSON.stringify({ requiredCourseKeys, ...evaluation }),
    };
  });
}

export async function getSjaAnalyses(_tenantId: string) {
  try {
    const auth = await getAuthContext();
    if (!auth) throw new Error("Ikke autentisert");

    const canReadAll = auth.permissions.canReadSja;
    const canReadOwn = auth.permissions.canReadOwnSja;

    if (!canReadAll && !canReadOwn) {
      throw new Error("Ikke autorisert til å se SJA-analyser");
    }

    const { tenantId, userId } = auth;
    const ownerFilter = canReadAll ? {} : { createdById: userId };

    const analyses = await prisma.sjaAnalysis.findMany({
      where: { tenantId, ...ownerFilter },
      include: {
        hazards: { orderBy: { sortOrder: "asc" } },
      },
      orderBy: [{ plannedDate: "desc" }],
    });

    return { success: true, data: analyses, ownOnly: !canReadAll };
  } catch (error: any) {
    return { success: false, error: error.message || "Kunne ikke hente SJA-analyser" };
  }
}

export async function getSjaAnalysis(id: string) {
  try {
    const auth = await getAuthContext();
    if (!auth) throw new Error("Ikke autentisert");

    const canReadAll = auth.permissions.canReadSja;
    const canReadOwn = auth.permissions.canReadOwnSja;

    if (!canReadAll && !canReadOwn) {
      throw new Error("Ikke autorisert til å se SJA-analyser");
    }

    const { tenantId, userId } = auth;
    const ownerFilter = canReadAll ? {} : { createdById: userId };

    const analysis = await prisma.sjaAnalysis.findFirst({
      where: { id, tenantId, ...ownerFilter },
      include: {
        hazards: {
          orderBy: { sortOrder: "asc" },
          include: {
            linkedRisk: { select: { id: true, title: true, score: true } },
          },
        },
      },
    });

    if (!analysis) {
      return { success: false, error: "SJA ikke funnet" };
    }

    return { success: true, data: analysis };
  } catch (error: any) {
    return { success: false, error: error.message || "Kunne ikke hente SJA" };
  }
}

export async function createSjaAnalysis(input: any) {
  try {
    const { user, tenantId, auth } = await getSessionContext();
    if (!auth.permissions.canCreateSja) {
      throw new Error("Ikke autorisert til å opprette SJA");
    }

    const rawLinkedRoutineIds: unknown[] = Array.isArray(input.linkedRoutineIds)
      ? input.linkedRoutineIds
      : [];
    const linkedRoutineIds = Array.from(
      new Set<string>(
        rawLinkedRoutineIds.filter(
          (id: unknown): id is string => typeof id === "string" && id.trim().length > 5,
        ),
      ),
    ).slice(0, 20);

    let additionalConditions =
      typeof input.additionalConditions === "string" ? input.additionalConditions.trim() : "";

    if (linkedRoutineIds.length > 0) {
      const routines = await prisma.routine.findMany({
        where: {
          tenantId,
          id: { in: linkedRoutineIds },
          status: { in: [RoutineStatus.ACTIVE, RoutineStatus.NEEDS_REVIEW] },
        },
        select: { title: true },
        take: 20,
      });
      if (
        routines.length > 0 &&
        !additionalConditions.includes("Knyttede rutiner (lest før jobb)")
      ) {
        const block = `Knyttede rutiner (lest før jobb):\n${routines
          .map((routine) => `- ${routine.title}`)
          .join("\n")}`;
        additionalConditions = [block, additionalConditions]
          .filter((part) => part.length > 0)
          .join("\n\n");
      }
    }

    const sanitizedHazards = (input.hazards ?? []).map((h: any, i: number) => ({
      activity: String(h.activity ?? "").trim(),
      hazard: String(h.hazard ?? "").trim(),
      consequence: h.consequence ? String(h.consequence).trim() : undefined,
      probability: Number(h.probability) || 1,
      severity: Number(h.severity) || 1,
      measures: String(h.measures ?? "").trim(),
      responsibleName: h.responsibleName ? String(h.responsibleName).trim() : undefined,
      sortOrder: i,
      linkedRiskId: (h.linkedRiskId && typeof h.linkedRiskId === "string" && h.linkedRiskId.length > 5)
        ? h.linkedRiskId
        : undefined,
    }));
    const requestedTemplateId =
      typeof input.templateId === "string" && input.templateId.length > 5
        ? input.templateId
        : undefined;
    const sourceTemplate = requestedTemplateId
      ? await prisma.sjaTemplate.findFirst({
          where: { id: requestedTemplateId, tenantId, isActive: true },
          include: { hazards: { orderBy: { sortOrder: "asc" } } },
        })
      : null;
    if (requestedTemplateId && !sourceTemplate) {
      return { success: false, error: "Valgt SJA-mal finnes ikke lenger" };
    }

    const normalizedInput = {
      ...input,
      tenantId,
      templateId: requestedTemplateId,
      templateName: sourceTemplate?.name ?? input.templateName,
      electricalWorkType:
        sourceTemplate?.electricalWorkType ?? input.electricalWorkType ?? "NOT_APPLICABLE",
      requiresSecondPerson:
        Boolean(sourceTemplate?.requiresSecondPerson) || Boolean(input.requiresSecondPerson),
      plannedDate: new Date(input.plannedDate),
      additionalConditions: additionalConditions.length > 0 ? additionalConditions : undefined,
      hazards: sanitizedHazards,
    };

    const parseResult = createSjaSchema.safeParse(normalizedInput);
    if (!parseResult.success) {
      const firstIssue = parseResult.error.issues[0];
      const fieldPath = firstIssue?.path?.join(" → ") || "ukjent felt";
      return {
        success: false,
        error: `Valideringsfeil i "${fieldPath}": ${firstIssue?.message || "Ugyldig verdi"}`,
      };
    }
    const validated = parseResult.data;

    const templateCourseKeys = parseStringArray(sourceTemplate?.requiredCourseKeys);
    const participantRecords = await buildParticipantRecords(
      tenantId,
      validated.electricalWorkType,
      validated.participantRecords,
      templateCourseKeys,
    );

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

    const sjaNummer = await generateSequenceNumber(
      validated.tenantId,
      "SJA",
      new Date(validated.plannedDate).getFullYear()
    );

    const analysis = await prisma.sjaAnalysis.create({
      data: {
        tenantId: validated.tenantId,
        sjaNummer,
        title: validated.title,
        description: validated.description ?? null,
        workLocation: validated.workLocation,
        plannedDate: validated.plannedDate,
        responsibleName: validated.responsibleName,
        participants: validated.participants,
        additionalConditions: validated.additionalConditions ?? null,
        weatherConditions: validated.weatherConditions ?? null,
        createdById: user.id,
        createdByName: user.name || user.email,
        templateId: validated.templateId ?? null,
        templateName: validated.templateName ?? null,
        templateSnapshot: sourceTemplate ? JSON.stringify(sourceTemplate) : null,
        electricalWorkType: validated.electricalWorkType,
        workMethod: validated.workMethod ?? null,
        requiredEquipment: validated.requiredEquipment ?? null,
        requiredPpe: validated.requiredPpe ?? null,
        personnelRequirements: validated.personnelRequirements ?? null,
        safetyConditions: validated.safetyConditions ?? null,
        fseChecklist: JSON.stringify(validated.fseChecklist),
        requiresSecondPerson: validated.requiresSecondPerson,
        secondPersonException: validated.secondPersonException ?? null,
        projectId: validated.projectId ?? null,
        submittedAt: new Date(),
        signedByNames: validated.participants,
        status: SjaStatus.DRAFT,
        conclusion: SjaConclusion.NOT_DECIDED,
        hazards: {
          create: validated.hazards.map((h, i) => ({
            sortOrder: i,
            activity: h.activity,
            hazard: h.hazard,
            consequence: h.consequence ?? null,
            probability: h.probability,
            severity: h.severity,
            riskLevel: h.probability * h.severity,
            measures: h.measures,
            responsibleName: h.responsibleName ?? null,
            linkedRiskId: h.linkedRiskId ?? null,
          })),
        },
        participantRecords: {
          create: participantRecords,
        },
      },
      include: { hazards: true, participantRecords: true },
    });

    AuditLog.log(tenantId, user.id, "SJA_CREATED", "SjaAnalysis", analysis.id, { title: analysis.title }).catch(() => {});

    revalidatePath("/dashboard/sja");
    if (validated.projectId) {
      revalidatePath(`/dashboard/projects/${validated.projectId}`);
    }
    revalidatePath("/ansatt/sja");
    triggerRealtimeEvent(tenantId, "sja-updated");
    return { success: true, data: analysis };
  } catch (error: any) {
    return { success: false, error: error.message || "Kunne ikke opprette SJA" };
  }
}

export async function saveSjaDraft(input: any) {
  try {
    const { user, tenantId, auth } = await getSessionContext();
    if (!auth.permissions.canCreateSja) {
      throw new Error("Ikke autorisert til å opprette SJA");
    }

    const title = String(input.title ?? "").trim() || `Utkast — ${new Date().toLocaleDateString("nb-NO")}`;
    const workLocation = String(input.workLocation ?? "").trim() || "Ikke angitt";
    const plannedDate = input.plannedDate ? new Date(input.plannedDate) : new Date();

    const hazards = (input.hazards ?? [])
      .filter((h: any) => h.activity?.trim() || h.hazard?.trim() || h.measures?.trim())
      .map((h: any, i: number) => ({
        sortOrder: i,
        activity: String(h.activity ?? "").trim() || "—",
        hazard: String(h.hazard ?? "").trim() || "—",
        consequence: h.consequence ? String(h.consequence).trim() : null,
        probability: Number(h.probability) || 1,
        severity: Number(h.severity) || 1,
        riskLevel: (Number(h.probability) || 1) * (Number(h.severity) || 1),
        measures: String(h.measures ?? "").trim() || "—",
        responsibleName: h.responsibleName ? String(h.responsibleName).trim() : null,
        linkedRiskId: (h.linkedRiskId && typeof h.linkedRiskId === "string" && h.linkedRiskId.length > 5)
          ? h.linkedRiskId : null,
      }));

    if (input.id) {
      if (hazards.length > 0) {
        await prisma.sjaHazard.deleteMany({ where: { sjaAnalysisId: input.id } });
        await prisma.sjaHazard.createMany({
          data: hazards.map((h: any) => ({ ...h, sjaAnalysisId: input.id })),
        });
      }

      const analysis = await prisma.sjaAnalysis.update({
        where: { id: input.id, tenantId },
        data: {
          title,
          description: input.description ? String(input.description).trim() : null,
          workLocation,
          plannedDate,
          responsibleName: input.responsibleName || user.name || user.email,
          participants: input.participants ? String(input.participants).trim() : null,
          additionalConditions: input.additionalConditions ? String(input.additionalConditions).trim() : null,
          weatherConditions: input.weatherConditions ? String(input.weatherConditions).trim() : null,
          electricalWorkType: input.electricalWorkType || "NOT_APPLICABLE",
          workMethod: input.workMethod ? String(input.workMethod).trim() : null,
          requiredEquipment: input.requiredEquipment ? String(input.requiredEquipment).trim() : null,
          requiredPpe: input.requiredPpe ? String(input.requiredPpe).trim() : null,
          personnelRequirements: input.personnelRequirements ? String(input.personnelRequirements).trim() : null,
          safetyConditions: input.safetyConditions ? String(input.safetyConditions).trim() : null,
          fseChecklist: JSON.stringify(input.fseChecklist ?? {}),
          requiresSecondPerson: Boolean(input.requiresSecondPerson),
          secondPersonException: input.secondPersonException
            ? String(input.secondPersonException).trim()
            : null,
          projectId: input.projectId || null,
          contentVersion: new Date(),
          updatedAt: new Date(),
        },
        include: { hazards: true },
      });

      revalidatePath("/dashboard/sja");
      revalidatePath(`/dashboard/sja/${analysis.id}`);
      revalidatePath("/ansatt/sja");
      triggerRealtimeEvent(tenantId, "sja-updated");
      return { success: true, data: analysis };
    }

    const sjaNummer = await generateSequenceNumber(tenantId, "SJA", plannedDate.getFullYear());
    const sourceTemplate = input.templateId
      ? await prisma.sjaTemplate.findFirst({
          where: { id: input.templateId, tenantId, isActive: true },
          include: { hazards: { orderBy: { sortOrder: "asc" } } },
        })
      : null;

    const analysis = await prisma.sjaAnalysis.create({
      data: {
        tenantId,
        sjaNummer,
        title,
        description: input.description ? String(input.description).trim() : null,
        workLocation,
        plannedDate,
        responsibleName: input.responsibleName || user.name || user.email,
        participants: input.participants ? String(input.participants).trim() : null,
        additionalConditions: input.additionalConditions ? String(input.additionalConditions).trim() : null,
        weatherConditions: input.weatherConditions ? String(input.weatherConditions).trim() : null,
        createdById: user.id,
        createdByName: user.name || user.email,
        templateId: input.templateId ?? null,
        templateName: input.templateName ?? null,
        templateSnapshot: sourceTemplate ? JSON.stringify(sourceTemplate) : null,
        electricalWorkType: input.electricalWorkType || "NOT_APPLICABLE",
        workMethod: input.workMethod ? String(input.workMethod).trim() : null,
        requiredEquipment: input.requiredEquipment ? String(input.requiredEquipment).trim() : null,
        requiredPpe: input.requiredPpe ? String(input.requiredPpe).trim() : null,
        personnelRequirements: input.personnelRequirements ? String(input.personnelRequirements).trim() : null,
        safetyConditions: input.safetyConditions ? String(input.safetyConditions).trim() : null,
        fseChecklist: JSON.stringify(input.fseChecklist ?? {}),
        requiresSecondPerson: Boolean(input.requiresSecondPerson),
        secondPersonException: input.secondPersonException
          ? String(input.secondPersonException).trim()
          : null,
        projectId: input.projectId || null,
        status: SjaStatus.DRAFT,
        conclusion: SjaConclusion.NOT_DECIDED,
        hazards: hazards.length > 0 ? { create: hazards } : undefined,
      },
      include: { hazards: true },
    });

    revalidatePath("/dashboard/sja");
    revalidatePath("/ansatt/sja");
    triggerRealtimeEvent(tenantId, "sja-updated");
    return { success: true, data: analysis };
  } catch (error: any) {
    return { success: false, error: error.message || "Kunne ikke lagre utkast" };
  }
}

export async function updateSjaAnalysis(input: any) {
  try {
    const { user, tenantId, auth } = await getSessionContext();

    let sanitizedHazards = input.hazards;
    if (Array.isArray(input.hazards)) {
      sanitizedHazards = input.hazards.map((h: any, i: number) => ({
        activity: String(h.activity ?? "").trim(),
        hazard: String(h.hazard ?? "").trim(),
        consequence: h.consequence ? String(h.consequence).trim() : undefined,
        probability: Number(h.probability) || 1,
        severity: Number(h.severity) || 1,
        measures: String(h.measures ?? "").trim(),
        responsibleName: h.responsibleName ? String(h.responsibleName).trim() : undefined,
        sortOrder: i,
        linkedRiskId: (h.linkedRiskId && typeof h.linkedRiskId === "string" && h.linkedRiskId.length > 5)
          ? h.linkedRiskId
          : undefined,
      }));
    }

    const normalizedInput = {
      ...input,
      plannedDate: input.plannedDate ? new Date(input.plannedDate) : undefined,
      hazards: sanitizedHazards,
    };

    const parseResult = updateSjaSchema.safeParse(normalizedInput);
    if (!parseResult.success) {
      const firstIssue = parseResult.error.issues[0];
      const fieldPath = firstIssue?.path?.join(" → ") || "ukjent felt";
      return {
        success: false,
        error: `Valideringsfeil i "${fieldPath}": ${firstIssue?.message || "Ugyldig verdi"}`,
      };
    }
    const validated = parseResult.data;

    const existing = await prisma.sjaAnalysis.findUnique({
      where: { id: validated.id, tenantId },
    });

    if (!existing) {
      return { success: false, error: "SJA ikke funnet" };
    }
    const isApprovalChange =
      input.conclusion !== undefined ||
      input.status === SjaStatus.ACTIVE ||
      input.status === SjaStatus.CANCELLED;
    if (isApprovalChange && !auth.permissions.canApproveSja) {
      return { success: false, error: "Ikke autorisert til å godkjenne eller avvise SJA" };
    }
    const activatesWork =
      input.status === SjaStatus.ACTIVE ||
      input.conclusion === SjaConclusion.APPROVED ||
      input.conclusion === SjaConclusion.CONDITIONAL;
    if (activatesWork && existing.electricalWorkType !== "NOT_APPLICABLE") {
      const participants = await prisma.sjaParticipant.findMany({
        where: { sjaAnalysisId: existing.id, isExternal: false },
        select: { acknowledgedAt: true, acknowledgedVersion: true },
      });
      const allAcknowledgedCurrentVersion =
        participants.length > 0 &&
        participants.every(
          (participant) =>
            participant.acknowledgedAt &&
            participant.acknowledgedVersion?.getTime() === existing.contentVersion.getTime(),
        );
      if (!allAcknowledgedCurrentVersion) {
        return {
          success: false,
          error: "Alle deltakere må bekrefte gjeldende SJA-versjon før arbeidet kan godkjennes",
        };
      }
    }
    if (
      !auth.permissions.canApproveSja &&
      existing.createdById !== user.id
    ) {
      return { success: false, error: "Du kan bare oppdatere egne SJA-er" };
    }

    const hasContentChange =
      input.title !== undefined ||
      input.description !== undefined ||
      input.workLocation !== undefined ||
      input.plannedDate !== undefined ||
      input.responsibleName !== undefined ||
      input.participants !== undefined ||
      input.hazards !== undefined;
    const updateData: Record<string, any> = {
      updatedAt: new Date(),
      ...(hasContentChange ? { contentVersion: new Date() } : {}),
    };

    if (validated.title) updateData.title = validated.title;
    if (validated.description !== undefined) updateData.description = validated.description || null;
    if (validated.workLocation) updateData.workLocation = validated.workLocation;
    if (validated.plannedDate) updateData.plannedDate = validated.plannedDate;
    if (validated.responsibleName) updateData.responsibleName = validated.responsibleName;
    if (validated.participants !== undefined) updateData.participants = validated.participants || null;

    if (validated.status) {
      updateData.status = validated.status;
    }

    if (validated.conclusion) {
      updateData.conclusion = validated.conclusion;
      updateData.conclusionComment = validated.conclusionComment || null;
      if (validated.conclusion === SjaConclusion.APPROVED || validated.conclusion === SjaConclusion.CONDITIONAL) {
        updateData.approvedById = user.id;
        updateData.approvedByName = user.name || user.email;
        updateData.approvedAt = new Date();
        if (existing.status === SjaStatus.DRAFT) {
          updateData.status = SjaStatus.ACTIVE;
        }
      }
    }

    if (validated.hazards) {
      await prisma.sjaHazard.deleteMany({ where: { sjaAnalysisId: validated.id } });
      await prisma.sjaHazard.createMany({
        data: validated.hazards.map((h, i) => ({
          sjaAnalysisId: validated.id,
          sortOrder: i,
          activity: h.activity,
          hazard: h.hazard,
          consequence: h.consequence ?? null,
          probability: h.probability,
          severity: h.severity,
          riskLevel: h.probability * h.severity,
          measures: h.measures,
          responsibleName: h.responsibleName ?? null,
          linkedRiskId: h.linkedRiskId ?? null,
        })),
      });
    }

    const analysis = await prisma.sjaAnalysis.update({
      where: { id: validated.id, tenantId },
      data: updateData,
      include: { hazards: { orderBy: { sortOrder: "asc" } } },
    });
    if (hasContentChange) {
      await prisma.sjaParticipant.updateMany({
        where: { sjaAnalysisId: analysis.id },
        data: { acknowledgedAt: null, acknowledgedVersion: null },
      });
    }

    AuditLog.log(tenantId, user.id, "SJA_UPDATED", "SjaAnalysis", analysis.id, { title: analysis.title, status: analysis.status }).catch(() => {});

    if (validated.conclusion === SjaConclusion.APPROVED || validated.conclusion === SjaConclusion.CONDITIONAL) {
      AuditLog.log(tenantId, user.id, "SJA_APPROVED", "SjaAnalysis", analysis.id, {
        title: analysis.title,
        conclusion: validated.conclusion,
        conclusionComment: validated.conclusionComment ?? null,
      }).catch(() => {});
    }

    revalidatePath("/dashboard/sja");
    revalidatePath(`/dashboard/sja/${analysis.id}`);
    revalidatePath("/ansatt/sja");
    triggerRealtimeEvent(tenantId, "sja-updated");
    return { success: true, data: analysis };
  } catch (error: any) {
    return { success: false, error: error.message || "Kunne ikke oppdatere SJA" };
  }
}

export async function deleteSjaAnalysis(id: string) {
  try {
    const { user, tenantId, auth } = await getSessionContext();
    if (!auth.permissions.canApproveSja) {
      throw new Error("Ikke autorisert til å slette SJA");
    }

    const analysis = await prisma.sjaAnalysis.findUnique({
      where: { id, tenantId },
    });

    if (!analysis) {
      return { success: false, error: "SJA ikke funnet" };
    }

    await prisma.sjaAnalysis.delete({ where: { id, tenantId } });

    AuditLog.log(tenantId, user.id, "SJA_DELETED", "SjaAnalysis", id, { title: analysis.title }).catch(() => {});

    revalidatePath("/dashboard/sja");
    revalidatePath("/ansatt/sja");
    triggerRealtimeEvent(tenantId, "sja-updated");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Kunne ikke slette SJA" };
  }
}

export async function acknowledgeSjaParticipation(analysisId: string) {
  try {
    const { user, tenantId } = await getSessionContext();
    const analysis = await prisma.sjaAnalysis.findFirst({
      where: { id: analysisId, tenantId },
      select: { id: true, contentVersion: true },
    });
    if (!analysis) return { success: false, error: "SJA ikke funnet" };

    const participant = await prisma.sjaParticipant.findFirst({
      where: { sjaAnalysisId: analysisId, userId: user.id },
    });
    if (!participant) {
      return { success: false, error: "Du er ikke registrert som deltaker i denne SJA-en" };
    }

    await prisma.sjaParticipant.update({
      where: { id: participant.id },
      data: {
        acknowledgedAt: new Date(),
        acknowledgedVersion: analysis.contentVersion,
      },
    });
    AuditLog.log(tenantId, user.id, "SJA_ACKNOWLEDGED", "SjaAnalysis", analysisId, {
      version: analysis.contentVersion.toISOString(),
    }).catch(() => {});
    revalidatePath(`/ansatt/sja/${analysisId}`);
    revalidatePath(`/dashboard/sja/${analysisId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Kunne ikke bekrefte SJA" };
  }
}

// ============================================
// SJA Maler (Templates)
// ============================================

export async function getSjaTemplates(_tenantId: string) {
  try {
    const context = await getSessionContext();
    if (
      !context.auth.permissions.canReadSja &&
      !context.auth.permissions.canReadOwnSja &&
      !context.auth.permissions.canCreateSja
    ) {
      throw new Error("Ikke autorisert til å se SJA-maler");
    }

    const templates = await prisma.sjaTemplate.findMany({
      where: { tenantId: context.tenantId, isActive: true },
      include: {
        hazards: { orderBy: { sortOrder: "asc" } },
      },
      orderBy: { name: "asc" },
    });

    return { success: true, data: templates };
  } catch (error: any) {
    return { success: false, error: error.message || "Kunne ikke hente SJA-maler" };
  }
}

export async function createSjaTemplate(input: any) {
  try {
    const { user, tenantId, auth } = await getSessionContext();
    if (!auth.permissions.canApproveSja) {
      throw new Error("Kun leder, HMS eller administrator kan administrere SJA-maler");
    }
    const normalizedInput = { ...input, tenantId };
    const validated = createSjaTemplateSchema.parse(normalizedInput);

    const template = await prisma.sjaTemplate.create({
      data: {
        tenantId: validated.tenantId,
        name: validated.name,
        description: validated.description ?? null,
        workLocation: validated.workLocation ?? null,
        electricalWorkType: validated.electricalWorkType,
        workMethod: validated.workMethod ?? null,
        requiredEquipment: validated.requiredEquipment ?? null,
        requiredPpe: validated.requiredPpe ?? null,
        personnelRequirements: validated.personnelRequirements ?? null,
        safetyConditions: validated.safetyConditions ?? null,
        requiresSecondPerson: validated.requiresSecondPerson,
        requiredCourseKeys: JSON.stringify(validated.requiredCourseKeys),
        createdById: user.id,
        createdByName: user.name || user.email,
        hazards: {
          create: validated.hazards.map((h, i) => ({
            sortOrder: i,
            activity: h.activity,
            hazard: h.hazard,
            consequence: h.consequence ?? null,
            probability: h.probability,
            severity: h.severity,
            measures: h.measures,
            responsibleName: h.responsibleName ?? null,
          })),
        },
      },
      include: { hazards: true },
    });

    AuditLog.log(tenantId, user.id, "SJA_TEMPLATE_CREATED", "SjaTemplate", template.id, { name: template.name }).catch(() => {});

    revalidatePath("/dashboard/sja");
    revalidatePath("/dashboard/sja/maler");
    revalidatePath("/ansatt/sja");
    revalidatePath("/ansatt/sja/maler");
    triggerRealtimeEvent(tenantId, "sja-updated");
    return { success: true, data: template };
  } catch (error: any) {
    return { success: false, error: error.message || "Kunne ikke opprette SJA-mal" };
  }
}

export async function updateSjaTemplate(input: any) {
  try {
    const { user, tenantId, auth } = await getSessionContext();
    if (!auth.permissions.canApproveSja) {
      throw new Error("Kun leder, HMS eller administrator kan administrere SJA-maler");
    }
    const validated = updateSjaTemplateSchema.parse({ ...input, tenantId });
    const existing = await prisma.sjaTemplate.findFirst({
      where: { id: validated.id, tenantId, isActive: true },
    });
    if (!existing) return { success: false, error: "SJA-mal ikke funnet" };
    if (existing.isLockedByGroup) {
      return { success: false, error: "Konsernstyrte maler kan ikke redigeres lokalt" };
    }

    const template = await prisma.$transaction(async (tx) => {
      await tx.sjaTemplateHazard.deleteMany({ where: { templateId: validated.id } });
      return tx.sjaTemplate.update({
        where: { id: validated.id },
        data: {
          name: validated.name,
          description: validated.description ?? null,
          workLocation: validated.workLocation ?? null,
          electricalWorkType: validated.electricalWorkType,
          workMethod: validated.workMethod ?? null,
          requiredEquipment: validated.requiredEquipment ?? null,
          requiredPpe: validated.requiredPpe ?? null,
          personnelRequirements: validated.personnelRequirements ?? null,
          safetyConditions: validated.safetyConditions ?? null,
          requiresSecondPerson: validated.requiresSecondPerson,
          requiredCourseKeys: JSON.stringify(validated.requiredCourseKeys),
          hazards: {
            create: validated.hazards.map((hazard, index) => ({
              sortOrder: index,
              activity: hazard.activity,
              hazard: hazard.hazard,
              consequence: hazard.consequence ?? null,
              probability: hazard.probability,
              severity: hazard.severity,
              measures: hazard.measures,
              responsibleName: hazard.responsibleName ?? null,
            })),
          },
        },
        include: { hazards: { orderBy: { sortOrder: "asc" } } },
      });
    });

    AuditLog.log(tenantId, user.id, "SJA_TEMPLATE_UPDATED", "SjaTemplate", template.id, {
      name: template.name,
    }).catch(() => {});
    revalidatePath("/dashboard/sja");
    revalidatePath("/dashboard/sja/maler");
    revalidatePath(`/dashboard/sja/maler/${template.id}/rediger`);
    revalidatePath("/ansatt/sja/maler");
    triggerRealtimeEvent(tenantId, "sja-updated");
    return { success: true, data: template };
  } catch (error: any) {
    return { success: false, error: error.message || "Kunne ikke oppdatere SJA-mal" };
  }
}

export async function duplicateSjaTemplate(id: string) {
  try {
    const { user, tenantId, auth } = await getSessionContext();
    if (!auth.permissions.canApproveSja) {
      throw new Error("Kun leder, HMS eller administrator kan administrere SJA-maler");
    }
    const source = await prisma.sjaTemplate.findFirst({
      where: { id, tenantId, isActive: true },
      include: { hazards: { orderBy: { sortOrder: "asc" } } },
    });
    if (!source) return { success: false, error: "SJA-mal ikke funnet" };

    const copy = await prisma.sjaTemplate.create({
      data: {
        tenantId,
        name: `${source.name} – kopi`,
        description: source.description,
        workLocation: source.workLocation,
        electricalWorkType: source.electricalWorkType,
        workMethod: source.workMethod,
        requiredEquipment: source.requiredEquipment,
        requiredPpe: source.requiredPpe,
        personnelRequirements: source.personnelRequirements,
        safetyConditions: source.safetyConditions,
        requiresSecondPerson: source.requiresSecondPerson,
        requiredCourseKeys: source.requiredCourseKeys,
        createdById: user.id,
        createdByName: user.name || user.email,
        hazards: {
          create: source.hazards.map((hazard) => ({
            sortOrder: hazard.sortOrder,
            activity: hazard.activity,
            hazard: hazard.hazard,
            consequence: hazard.consequence,
            probability: hazard.probability,
            severity: hazard.severity,
            measures: hazard.measures,
            responsibleName: hazard.responsibleName,
          })),
        },
      },
      include: { hazards: true },
    });

    AuditLog.log(tenantId, user.id, "SJA_TEMPLATE_DUPLICATED", "SjaTemplate", copy.id, {
      sourceTemplateId: source.id,
      name: copy.name,
    }).catch(() => {});
    revalidatePath("/dashboard/sja");
    revalidatePath("/dashboard/sja/maler");
    triggerRealtimeEvent(tenantId, "sja-updated");
    return { success: true, data: copy };
  } catch (error: any) {
    return { success: false, error: error.message || "Kunne ikke kopiere SJA-mal" };
  }
}

export async function deleteSjaTemplate(id: string) {
  try {
    const { user, tenantId, auth } = await getSessionContext();
    if (!auth.permissions.canApproveSja) {
      throw new Error("Kun leder, HMS eller administrator kan administrere SJA-maler");
    }

    const template = await prisma.sjaTemplate.findUnique({
      where: { id, tenantId },
    });

    if (!template) {
      return { success: false, error: "SJA-mal ikke funnet" };
    }
    if (template.isLockedByGroup) {
      return { success: false, error: "Konsernstyrte maler kan ikke arkiveres lokalt" };
    }

    await prisma.sjaTemplate.update({
      where: { id, tenantId },
      data: { isActive: false },
    });

    AuditLog.log(tenantId, user.id, "SJA_TEMPLATE_DELETED", "SjaTemplate", id, { name: template.name }).catch(() => {});

    revalidatePath("/dashboard/sja");
    revalidatePath("/dashboard/sja/maler");
    revalidatePath("/ansatt/sja");
    revalidatePath("/ansatt/sja/maler");
    triggerRealtimeEvent(tenantId, "sja-updated");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Kunne ikke slette SJA-mal" };
  }
}

export async function getTenantRisksForLinking(_tenantId: string) {
  try {
    const context = await getSessionContext();

    const risks = await prisma.risk.findMany({
      where: { tenantId: context.tenantId },
      select: { id: true, title: true, score: true },
      orderBy: { title: "asc" },
    });

    return { success: true, data: risks };
  } catch (error: any) {
    return { success: false, error: error.message || "Kunne ikke hente risikoer" };
  }
}

export async function getSjaStats(_tenantId: string) {
  try {
    const context = await getSessionContext();

    const analyses = await prisma.sjaAnalysis.findMany({
      where: { tenantId: context.tenantId },
    });

    const stats = {
      total: analyses.length,
      draft: analyses.filter((a) => a.status === "DRAFT").length,
      active: analyses.filter((a) => a.status === "ACTIVE").length,
      completed: analyses.filter((a) => a.status === "COMPLETED").length,
      cancelled: analyses.filter((a) => a.status === "CANCELLED").length,
      approved: analyses.filter((a) => a.conclusion === "APPROVED").length,
      rejected: analyses.filter((a) => a.conclusion === "REJECTED").length,
    };

    return { success: true, data: stats };
  } catch (error: any) {
    return { success: false, error: error.message || "Kunne ikke hente SJA-statistikk" };
  }
}
