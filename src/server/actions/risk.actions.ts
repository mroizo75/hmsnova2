"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import {
  createRiskSchema,
  updateRiskSchema,
  createRiskAssessmentSchema,
  updateRiskAssessmentSchema,
  addRiskAssessmentItemSchema,
  riskLevelToMatrix,
} from "@/features/risks/schemas/risk.schema";
import { ControlFrequency } from "@prisma/client";
import { calculateNextReviewDate } from "@/lib/document-utils";
import { getActionContext } from "./action-context";
import { AuditLog } from "@/lib/audit-log";
import { generateRiskAnalysis, generateRiskAssessmentItemDraft } from "@/lib/ai";
import { logAiFeedback } from "@/lib/ai-feedback";
import { getIndustryLabel, isSupportedIndustry } from "@/lib/industry-packages";
import { mapAiSeverityToValues, mapAiCategoryToRiskCategory, normalizeAiMeasures } from "@/lib/risk-ai-mapping";
import { z } from "zod";
import { getPermissions } from "@/lib/permissions";
import { triggerRealtimeEvent } from "@/lib/pusher-server";

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

const parseOptionalDate = (value: any) => {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const getNextReviewDateForFrequency = (base: Date, frequency: ControlFrequency) => {
  switch (frequency) {
    case "WEEKLY":
      return new Date(base.getTime() + 7 * 24 * 60 * 60 * 1000);
    case "MONTHLY":
      return calculateNextReviewDate(base, 1);
    case "QUARTERLY":
      return calculateNextReviewDate(base, 3);
    case "ANNUAL":
      return calculateNextReviewDate(base, 12);
    case "BIENNIAL":
      return calculateNextReviewDate(base, 24);
    default:
      return calculateNextReviewDate(base, 12);
  }
};

const applyAiRiskSuggestionsSchema = z.object({
  assessmentTitle: z.string().trim().min(2).max(200),
  suggestions: z
    .array(
      z.object({
        title: z.string().min(2),
        severity: z.string().min(1),
        category: z.string().min(1),
        description: z.string().max(2000).optional(),
        riskStatement: z.string().max(500).optional(),
        existingControls: z.string().max(2000).optional(),
        suggestedMeasures: z.array(z.string().min(1).max(500)).max(5).optional(),
        /** Opprinnelig AI-forslått tittel før evt. brukerredigering - kun for bakgrunnslogging av AI-feedback. */
        originalTitle: z.string().optional(),
      })
    )
    .min(1),
});

const generateAiRiskAssessmentItemDraftSchema = z.object({
  riskType: z.string().min(2).max(120),
  category: z.string().min(2).max(50),
  industryContext: z.string().max(120).optional(),
});

const resolveIndustryPromptLabel = (
  industry: string | null | undefined,
  industryContext?: string | null
): string => {
  const base = isSupportedIndustry(industry)
    ? getIndustryLabel(industry || "other")
    : industry?.trim() || "Annet";
  const extra = industryContext?.trim();
  return extra ? `${base} (${extra})` : base;
};

// Hent alle risikoer for en tenant
export async function getRisks(tenantId: string) {
  try {
    await getActionContext();
    
    const risks = await prisma.risk.findMany({
      where: { tenantId },
      include: {
        measures: {
          orderBy: { createdAt: "desc" },
        },
        owner: {
          select: { id: true, name: true, email: true },
        },
        inspectionTemplate: {
          select: { id: true, name: true },
        },
        kpi: {
          select: { id: true, title: true },
        },
      },
      orderBy: [
        { score: "desc" },
        { createdAt: "desc" },
      ],
    });
    
    return { success: true, data: risks };
  } catch (error: any) {
    console.error("Get risks error:", error);
    return { success: false, error: error.message || "Kunne ikke hente risikoer" };
  }
}

// Hent en spesifikk risiko
export async function getRisk(id: string) {
  try {
    const { tenantId } = await getActionContext();
    
    const risk = await prisma.risk.findUnique({
      where: { id, tenantId },
      include: {
        measures: {
          orderBy: { createdAt: "desc" },
        },
        owner: {
          select: { id: true, name: true, email: true },
        },
        inspectionTemplate: {
          select: { id: true, name: true },
        },
        kpi: {
          select: { id: true, title: true },
        },
      },
    });
    
    if (!risk) {
      return { success: false, error: "Risiko ikke funnet" };
    }
    
    return { success: true, data: risk };
  } catch (error: any) {
    console.error("Get risk error:", error);
    return { success: false, error: error.message || "Kunne ikke hente risiko" };
  }
}

// Opprett ny risiko
export async function createRisk(input: any) {
  try {
    const { user, tenantId, role } = await getActionContext();
    const normalizedInput = {
      ...input,
      tenantId,
      likelihood: Number(input.likelihood),
      consequence: Number(input.consequence),
      residualLikelihood: parseOptionalNumber(input.residualLikelihood),
      residualConsequence: parseOptionalNumber(input.residualConsequence),
      nextReviewDate: parseOptionalDate(input.nextReviewDate),
      reviewedAt: parseOptionalDate(input.reviewedAt),
      assessmentDate: parseOptionalDate(input.assessmentDate),
    };
    const validated = createRiskSchema.parse(normalizedInput);

    const score = validated.likelihood * validated.consequence;
    const residualScore =
      validated.residualLikelihood && validated.residualConsequence
        ? validated.residualLikelihood * validated.residualConsequence
        : null;
    const controlFrequency = validated.controlFrequency ?? ControlFrequency.ANNUAL;
    const nextReviewDate =
      validated.nextReviewDate ??
      getNextReviewDateForFrequency(new Date(), controlFrequency);
    
    const risk = await prisma.risk.create({
      data: {
        tenantId: validated.tenantId,
        riskAssessmentId: validated.riskAssessmentId ?? null,
        title: validated.title,
        context: validated.context,
        description: sanitizeString(validated.description),
        existingControls: sanitizeString(validated.existingControls),
        location: sanitizeString(validated.location),
        area: sanitizeString(validated.area),
        category: validated.category,
        likelihood: validated.likelihood,
        consequence: validated.consequence,
        score,
        ownerId: validated.ownerId,
        status: validated.status,
        riskStatement: sanitizeString(validated.riskStatement),
        controlFrequency,
        nextReviewDate,
        residualLikelihood: validated.residualLikelihood,
        residualConsequence: validated.residualConsequence,
        residualScore,
        kpiId: validated.kpiId ?? null,
        inspectionTemplateId: validated.inspectionTemplateId ?? null,
        linkedProcess: sanitizeString(validated.linkedProcess),
        riskAppetite: sanitizeString(validated.riskAppetite),
        riskTolerance: sanitizeString(validated.riskTolerance),
        responseStrategy: validated.responseStrategy,
        trend: validated.trend,
        reviewedAt: validated.reviewedAt ?? null,
        assessmentDate: validated.assessmentDate ?? null,
      },
    });
    
    AuditLog.log(tenantId, user.id, "RISK_CREATED", "Risk", risk.id, { title: risk.title, score }).catch(() => {});
    
    revalidatePath("/dashboard/risks");
    triggerRealtimeEvent(tenantId, "risk-updated");
    return { success: true, data: risk };
  } catch (error: any) {
    console.error("Create risk error:", error);
    return { success: false, error: error.message || "Kunne ikke opprette risiko" };
  }
}

// Oppdater risiko
export async function updateRisk(input: any) {
  try {
    const { user, tenantId, role } = await getActionContext();
    const nextReviewValue =
      input.nextReviewDate === "" || input.nextReviewDate === null
        ? null
        : parseOptionalDate(input.nextReviewDate);
    const normalizedInput = {
      ...input,
      likelihood: parseOptionalNumber(input.likelihood),
      consequence: parseOptionalNumber(input.consequence),
      residualLikelihood: parseOptionalNumber(input.residualLikelihood),
      residualConsequence: parseOptionalNumber(input.residualConsequence),
      nextReviewDate: nextReviewValue,
      reviewedAt: parseOptionalDate(input.reviewedAt),
    };
    const validated = updateRiskSchema.parse(normalizedInput);
    
    const existingRisk = await prisma.risk.findUnique({
      where: { id: validated.id, tenantId },
    });
    
    if (!existingRisk) {
      return { success: false, error: "Risiko ikke funnet" };
    }
    
    // Beregn ny score hvis likelihood eller consequence endres
    const likelihood = validated.likelihood ?? existingRisk.likelihood;
    const consequence = validated.consequence ?? existingRisk.consequence;
    const score = likelihood * consequence;
    const residualLikelihood = validated.residualLikelihood ?? existingRisk.residualLikelihood ?? undefined;
    const residualConsequence = validated.residualConsequence ?? existingRisk.residualConsequence ?? undefined;
    const residualScore =
      residualLikelihood && residualConsequence
        ? residualLikelihood * residualConsequence
        : null;

    const updateData: Record<string, any> = {
      score,
      updatedAt: new Date(),
    };

    if (validated.title) updateData.title = validated.title;
    if (validated.context) updateData.context = validated.context;
    if (validated.description !== undefined) updateData.description = sanitizeString(validated.description);
    if (validated.existingControls !== undefined) updateData.existingControls = sanitizeString(validated.existingControls);
    if (validated.location !== undefined) updateData.location = sanitizeString(validated.location);
    if (validated.area !== undefined) updateData.area = sanitizeString(validated.area);
    if (validated.ownerId) updateData.ownerId = validated.ownerId;
    if (validated.status) updateData.status = validated.status;
    if (validated.category) updateData.category = validated.category;
    if (validated.riskStatement !== undefined) updateData.riskStatement = sanitizeString(validated.riskStatement);
    if (validated.linkedProcess !== undefined) updateData.linkedProcess = sanitizeString(validated.linkedProcess);
    if (validated.riskAppetite !== undefined) updateData.riskAppetite = sanitizeString(validated.riskAppetite);
    if (validated.riskTolerance !== undefined) updateData.riskTolerance = sanitizeString(validated.riskTolerance);
    if (validated.responseStrategy) updateData.responseStrategy = validated.responseStrategy;
    if (validated.trend) updateData.trend = validated.trend;
    if (validated.kpiId !== undefined) updateData.kpiId = validated.kpiId ?? null;
    if (validated.inspectionTemplateId !== undefined) updateData.inspectionTemplateId = validated.inspectionTemplateId ?? null;
    if (validated.likelihood !== undefined) updateData.likelihood = validated.likelihood;
    if (validated.consequence !== undefined) updateData.consequence = validated.consequence;
    if (validated.residualLikelihood !== undefined) updateData.residualLikelihood = validated.residualLikelihood;
    if (validated.residualConsequence !== undefined) updateData.residualConsequence = validated.residualConsequence;
    updateData.residualScore = residualScore;
    if (validated.reviewedAt !== undefined) {
      updateData.reviewedAt = validated.reviewedAt ?? null;
    }

    let nextReviewDateToPersist = validated.nextReviewDate;
    if (validated.nextReviewDate === null) {
      nextReviewDateToPersist = null;
    } else if (validated.nextReviewDate === undefined && validated.controlFrequency) {
      nextReviewDateToPersist = getNextReviewDateForFrequency(
        existingRisk.nextReviewDate ?? new Date(),
        validated.controlFrequency
      );
    }

    if (nextReviewDateToPersist !== undefined) {
      updateData.nextReviewDate = nextReviewDateToPersist;
    }

    if (validated.controlFrequency) {
      updateData.controlFrequency = validated.controlFrequency;
    }
    if (validated.riskAssessmentId !== undefined) updateData.riskAssessmentId = validated.riskAssessmentId;
    if (validated.assessmentDate !== undefined) updateData.assessmentDate = validated.assessmentDate;

    const risk = await prisma.risk.update({
      where: { id: validated.id, tenantId },
      data: updateData,
    });
    
    AuditLog.log(tenantId, user.id, "RISK_UPDATED", "Risk", risk.id, { title: risk.title, score }).catch(() => {});
    
    revalidatePath("/dashboard/risks");
    revalidatePath(`/dashboard/risks/${risk.id}`);
    triggerRealtimeEvent(tenantId, "risk-updated");
    return { success: true, data: risk };
  } catch (error: any) {
    console.error("Update risk error:", error);
    return { success: false, error: error.message || "Kunne ikke oppdatere risiko" };
  }
}

// Slett risiko
export async function deleteRisk(id: string) {
  try {
    const { user, tenantId, role } = await getActionContext();
    
    const risk = await prisma.risk.findUnique({
      where: { id, tenantId },
    });
    
    if (!risk) {
      return { success: false, error: "Risiko ikke funnet" };
    }
    
    await prisma.risk.delete({
      where: { id, tenantId },
    });
    
    AuditLog.log(tenantId, user.id, "RISK_DELETED", "Risk", id, { title: risk.title }).catch(() => {});
    
    revalidatePath("/dashboard/risks");
    triggerRealtimeEvent(tenantId, "risk-updated");
    return { success: true };
  } catch (error: any) {
    console.error("Delete risk error:", error);
    return { success: false, error: error.message || "Kunne ikke slette risiko" };
  }
}

// Få statistikk over risikoer
export async function getRiskStats(tenantId: string) {
  try {
    await getActionContext();
    
    const risks = await prisma.risk.findMany({
      where: { tenantId },
    });
    
    const stats = {
      total: risks.length,
      critical: risks.filter(r => r.score >= 20).length,
      high: risks.filter(r => r.score >= 12 && r.score < 20).length,
      medium: risks.filter(r => r.score >= 6 && r.score < 12).length,
      low: risks.filter(r => r.score < 6).length,
      open: risks.filter(r => r.status === "OPEN").length,
      mitigating: risks.filter(r => r.status === "MITIGATING").length,
      accepted: risks.filter(r => r.status === "ACCEPTED").length,
      closed: risks.filter(r => r.status === "CLOSED").length,
    };
    
    return { success: true, data: stats };
  } catch (error: any) {
    console.error("Get risk stats error:", error);
    return { success: false, error: error.message || "Kunne ikke hente statistikk" };
  }
}

// —— Risikovurdering (årlig dokument med risikopunkter) ——

export async function createRiskAssessment(input: {
  tenantId: string;
  projectId?: string | null;
  title: string;
  assessmentYear: number;
  participants?: string;
}) {
  try {
    const { user, tenantId } = await getActionContext();
    const validated = createRiskAssessmentSchema.parse({ ...input, tenantId });
    if (validated.projectId) {
      const project = await prisma.project.findFirst({
        where: {
          id: validated.projectId,
          tenantId: validated.tenantId,
        },
        select: { id: true },
      });
      if (!project) {
        return { success: false, error: "Prosjekt ikke funnet for valgt tenant" };
      }
    }

    const assessment = await prisma.riskAssessment.create({
      data: {
        tenantId: validated.tenantId,
        projectId: validated.projectId ?? null,
        title: validated.title,
        assessmentYear: validated.assessmentYear,
        participants: validated.participants?.trim() || null,
      },
    });

    AuditLog.log(tenantId, user.id, "RISK_ASSESSMENT_CREATED", "RiskAssessment", assessment.id, { title: assessment.title, year: assessment.assessmentYear }).catch(() => {});

    revalidatePath("/dashboard/risks");
    revalidatePath(`/dashboard/risks/assessment/${assessment.id}`);
    triggerRealtimeEvent(tenantId, "risk-updated");
    return { success: true, data: assessment };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Kunne ikke opprette risikovurdering";
    return { success: false, error: message };
  }
}

export async function updateRiskAssessment(input: {
  id: string;
  title?: string;
  participants?: string;
  approvedById?: string | null;
  approvedAt?: string | null;
  reviewedById?: string | null;
  reviewedAt?: string | null;
}) {
  try {
    const { user, tenantId, role } = await getActionContext();
    const validated = updateRiskAssessmentSchema.parse(input);

    const existing = await prisma.riskAssessment.findFirst({
      where: { id: validated.id, tenantId },
    });
    if (!existing) return { success: false, error: "Risikovurdering ikke funnet" };

    if (validated.title !== undefined) {
      const permissions = getPermissions(role);
      if (!permissions.canCreateRisks) {
        return { success: false, error: "Ingen tilgang til å endre tittel på risikovurdering" };
      }
    }

    const assessment = await prisma.riskAssessment.update({
      where: { id: validated.id },
      data: {
        ...(validated.title !== undefined && { title: validated.title }),
        participants: validated.participants !== undefined
          ? (validated.participants?.trim() || null)
          : undefined,
        approvedById: validated.approvedById,
        approvedAt: validated.approvedAt,
        reviewedById: validated.reviewedById,
        reviewedAt: validated.reviewedAt,
        updatedAt: new Date(),
      },
    });

    AuditLog.log(tenantId, user.id, "RISK_ASSESSMENT_UPDATED", "RiskAssessment", assessment.id, {
      title: assessment.title,
      previousTitle: validated.title !== undefined ? existing.title : undefined,
    }).catch(() => {});

    revalidatePath(`/dashboard/risks/assessment/${assessment.id}`);
    revalidatePath("/dashboard/risks");
    triggerRealtimeEvent(tenantId, "risk-updated");
    return { success: true, data: assessment };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Kunne ikke oppdatere risikovurdering";
    return { success: false, error: message };
  }
}

export async function getRiskAssessments(tenantId: string) {
  try {
    await getActionContext();
    const assessments = await prisma.riskAssessment.findMany({
      where: { tenantId },
      include: {
        _count: { select: { risks: true } },
      },
      orderBy: [{ assessmentYear: "desc" }, { createdAt: "desc" }],
    });
    return { success: true, data: assessments };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Kunne ikke hente risikovurderinger";
    return { success: false, error: message };
  }
}

export async function getRiskAssessment(assessmentId: string) {
  try {
    const { tenantId } = await getActionContext();
    const assessment = await prisma.riskAssessment.findFirst({
      where: { id: assessmentId, tenantId },
      include: {
        risks: {
          orderBy: [{ score: "desc" }, { assessmentDate: "desc" }, { createdAt: "asc" }],
          include: {
            owner: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });
    if (!assessment) return { success: false, error: "Risikovurdering ikke funnet" };
    return { success: true, data: assessment };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Kunne ikke hente risikovurdering";
    return { success: false, error: message };
  }
}

export async function deleteRiskAssessment(assessmentId: string) {
  try {
    const { user, tenantId } = await getActionContext();
    const assessment = await prisma.riskAssessment.findFirst({
      where: { id: assessmentId, tenantId },
      include: { _count: { select: { risks: true } } },
    });
    if (!assessment) return { success: false, error: "Risikovurdering ikke funnet" };

    await prisma.riskAssessment.delete({ where: { id: assessmentId } });

    AuditLog.log(tenantId, user.id, "RISK_ASSESSMENT_DELETED", "RiskAssessment", assessmentId, { title: assessment.title, risksCount: assessment._count.risks }).catch(() => {});

    revalidatePath("/dashboard/risks");
    triggerRealtimeEvent(tenantId, "risk-updated");
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Kunne ikke slette risikovurdering";
    return { success: false, error: message };
  }
}

/** Legg til risikopunkt i en risikovurdering (tittel, beskrivelse, konsekvens, nivå, kategori, dato) */
export async function addRiskAssessmentItem(input: z.input<typeof addRiskAssessmentItemSchema>) {
  try {
    const { user, tenantId: ctxTenantId } = await getActionContext();
    const validatedInput = addRiskAssessmentItemSchema.parse(input);
    if (validatedInput.tenantId !== ctxTenantId) return { success: false, error: "Ugyldig tenant" };

    const assessment = await prisma.riskAssessment.findFirst({
      where: { id: validatedInput.riskAssessmentId, tenantId: validatedInput.tenantId },
    });
    if (!assessment) return { success: false, error: "Risikovurdering ikke funnet" };

    const { likelihood, consequence } = riskLevelToMatrix[validatedInput.level];
    const score = likelihood * consequence;
    const beskrivelseTrimmed = (validatedInput.beskrivelse ?? "").trim();
    const context =
      beskrivelseTrimmed.length >= 10
        ? beskrivelseTrimmed
        : validatedInput.title.length >= 10
          ? validatedInput.title
          : `${validatedInput.title} (risikopunkt)`;
    const riskStatement = (validatedInput.konsekvens ?? "").trim() || null;
    const existingControls = (validatedInput.eksisterendeKontroller ?? "").trim() || null;

    const normalizedMeasures = normalizeAiMeasures(validatedInput.suggestedMeasures);

    const risk = await prisma.$transaction(async (tx) => {
      const createdRisk = await tx.risk.create({
        data: {
          tenantId: validatedInput.tenantId,
          riskAssessmentId: validatedInput.riskAssessmentId,
          title: validatedInput.title,
          context,
          riskStatement,
          existingControls,
          likelihood,
          consequence,
          score,
          ownerId: validatedInput.ownerId,
          status: "OPEN",
          category: validatedInput.category,
          assessmentDate: validatedInput.assessmentDate ? new Date(validatedInput.assessmentDate) : null,
          nextReviewDate: validatedInput.nextReviewDate ? new Date(validatedInput.nextReviewDate) : null,
          controlFrequency: validatedInput.nextReviewDate ? "ANNUAL" : undefined,
        },
      });

      if (normalizedMeasures.length > 0) {
        const dueAt = new Date();
        dueAt.setDate(dueAt.getDate() + 30);
        await tx.measure.createMany({
          data: normalizedMeasures.map((measureTitle) => ({
            tenantId: input.tenantId,
            riskId: createdRisk.id,
            title: measureTitle,
            description: "AI-foreslått tiltak. Bekreft ansvarlig, frist og effekt ved oppfølging.",
            dueAt,
            responsibleId: validatedInput.ownerId,
            category: "MITIGATION",
            followUpFrequency: "ANNUAL",
          })),
        });
      }

      return createdRisk;
    });

    AuditLog.log(ctxTenantId, user.id, "RISK_CREATED", "Risk", risk.id, {
      title: risk.title,
      score: risk.score,
      riskAssessmentId: validatedInput.riskAssessmentId,
      measuresCount: normalizedMeasures.length,
    }).catch(() => {});

    if (validatedInput.aiSuggestedTitle) {
      void logAiFeedback({
        tenantId: ctxTenantId,
        feature: "risk_suggestion",
        aiSuggestion: validatedInput.aiSuggestedTitle,
        userFinalValue: risk.title,
      });
    }

    revalidatePath("/dashboard/risks");
    revalidatePath(`/dashboard/risks/assessment/${validatedInput.riskAssessmentId}`);
    triggerRealtimeEvent(ctxTenantId, "risk-updated");
    return { success: true, data: risk };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Kunne ikke legge til risikopunkt";
    return { success: false, error: message };
  }
}

export async function generateAiRiskAssessmentItem(input: {
  riskType: string;
  category: string;
  industryContext?: string;
}) {
  try {
    const { tenantId, role } = await getActionContext();
    const permissions = getPermissions(role);
    if (!permissions.canCreateRisks) {
      return { success: false, error: "Ingen tilgang til AI-forslag for risikopunkt" };
    }

    const validated = generateAiRiskAssessmentItemDraftSchema.parse(input);
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { industry: true },
    });
    if (!tenant) {
      return { success: false, error: "Bedrift ikke funnet" };
    }

    const existingRisks = await prisma.risk.findMany({
      where: { tenantId },
      select: { title: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    const draft = await generateRiskAssessmentItemDraft(
      resolveIndustryPromptLabel(tenant.industry, validated.industryContext),
      validated.riskType,
      validated.category,
      existingRisks.map((item) => item.title),
      validated.industryContext,
      {
        cacheScope: `tenant:${tenantId}:riskAssessmentItem`,
        rateLimitScope: `tenant:${tenantId}`,
        budgetScope: `tenant:${tenantId}`,
        tenantId,
      }
    );

    const normalizedTitle = draft.title.trim();
    if (!normalizedTitle) {
      return { success: false, error: "AI kunne ikke lage et gyldig forslag" };
    }

    const level = draft.level?.toUpperCase();
    const normalizedLevel =
      level === "LOW" || level === "MEDIUM" || level === "HIGH" || level === "CRITICAL"
        ? level
        : "MEDIUM";

    const fallbackCategory = mapAiCategoryToRiskCategory(validated.category, "OPERATIONAL");
    const normalizedCategory = mapAiCategoryToRiskCategory(draft.category || "", fallbackCategory);
    const suggestedMeasures = normalizeAiMeasures(draft.suggestedMeasures);

    return {
      success: true,
      data: {
        title: normalizedTitle,
        beskrivelse: draft.beskrivelse?.trim() || "",
        konsekvens: draft.konsekvens?.trim() || "",
        eksisterendeKontroller: draft.eksisterendeKontroller?.trim() || "",
        level: normalizedLevel,
        category: normalizedCategory,
        suggestedMeasures,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Kunne ikke generere AI-forslag" };
  }
}

export async function previewAiRiskSuggestions() {
  try {
    const { tenantId, role } = await getActionContext();
    const permissions = getPermissions(role);
    if (!permissions.canCreateRisks) {
      return { success: false, error: "Ingen tilgang til AI-risikoforslag" };
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        industry: true,
        employeeCount: true,
        naceCode: true,
        naceDescription: true,
        subIndustry: true,
      },
    });

    if (!tenant) {
      return { success: false, error: "Bedrift ikke funnet" };
    }

    const activityProfile = await prisma.tenantActivityProfile.findUnique({
      where: { tenantId },
      select: { activeActivities: true },
    });

    const [existingRisks, existingIncidents] = await Promise.all([
      prisma.risk.findMany({
        where: { tenantId },
        select: { title: true },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
      prisma.incident.findMany({
        where: { tenantId },
        select: { title: true },
        orderBy: { occurredAt: "desc" },
        take: 100,
      }),
    ]);

    let industryLabel = resolveIndustryPromptLabel(tenant.industry);
    if (tenant.naceCode && tenant.naceDescription) {
      industryLabel += ` (NACE ${tenant.naceCode}: ${tenant.naceDescription})`;
    }
    if (tenant.subIndustry) {
      industryLabel += `, sub-bransje: ${tenant.subIndustry}`;
    }
    if (activityProfile?.activeActivities) {
      const activities = activityProfile.activeActivities as string[];
      if (activities.length > 0) {
        industryLabel += `. Aktive aktiviteter: ${activities.join(", ")}`;
      }
    }

    const analysis = await generateRiskAnalysis(
      industryLabel,
      tenant.employeeCount || 1,
      existingRisks.map((item) => item.title),
      existingIncidents.map((item) => item.title),
      {
        cacheScope: `tenant:${tenantId}:riskSuggestions`,
        rateLimitScope: `tenant:${tenantId}`,
        budgetScope: `tenant:${tenantId}`,
        tenantId,
      }
    );

    const existingRiskTitles = new Set(existingRisks.map((item) => item.title.trim().toLowerCase()));
    const suggestions = analysis.suggestedRisks
      .map((suggestion) => {
        const title = suggestion.risk.trim();
        return {
          title,
          severity: suggestion.severity.trim().toUpperCase(),
          category: suggestion.category.trim(),
          rationale: (suggestion.rationale || "").trim(),
          description: (suggestion.description || "").trim(),
          riskStatement: (suggestion.riskStatement || "").trim(),
          existingControls: (suggestion.existingControls || "").trim(),
          suggestedMeasures: normalizeAiMeasures(suggestion.suggestedMeasures),
          isDuplicate: existingRiskTitles.has(title.toLowerCase()),
        };
      })
      .filter((item) => item.title.length > 0);

    return {
      success: true,
      data: {
        suggestions,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Kunne ikke hente AI-risikoforslag" };
  }
}

export async function applyAiRiskSuggestions(input: {
  assessmentTitle: string;
  suggestions: Array<{
    title: string;
    severity: string;
    category: string;
    description?: string;
    riskStatement?: string;
    existingControls?: string;
    suggestedMeasures?: string[];
    originalTitle?: string;
  }>;
}) {
  try {
    const { user, tenantId, role } = await getActionContext();
    const permissions = getPermissions(role);
    if (!permissions.canCreateRisks) {
      return { success: false, error: "Ingen tilgang til å lagre AI-risikoforslag" };
    }

    const validated = applyAiRiskSuggestionsSchema.parse(input);
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { industry: true },
    });
    if (!tenant) {
      return { success: false, error: "Bedrift ikke funnet" };
    }

    const ownerCandidate = await prisma.userTenant.findFirst({
      where: {
        tenantId,
        role: { in: ["ADMIN", "HMS", "LEDER"] },
      },
      orderBy: { createdAt: "asc" },
      select: { userId: true },
    });
    if (!ownerCandidate) {
      return { success: false, error: "Fant ingen ansvarlig bruker for nye risikoforslag" };
    }

    const currentYear = new Date().getFullYear();
    const assessmentTitle = validated.assessmentTitle.trim();
    const industryLabel = resolveIndustryPromptLabel(tenant.industry);
    let created = 0;
    let skipped = 0;

    await prisma.$transaction(async (tx) => {
      let assessment = await tx.riskAssessment.findFirst({
        where: { tenantId, title: assessmentTitle, assessmentYear: currentYear },
        select: { id: true },
      });
      if (!assessment) {
        assessment = await tx.riskAssessment.create({
          data: { tenantId, title: assessmentTitle, assessmentYear: currentYear },
          select: { id: true },
        });
      }

      for (const suggestion of validated.suggestions) {
        const title = suggestion.title.trim();
        if (!title) {
          skipped += 1;
          continue;
        }

        const exists = await tx.risk.findFirst({
          where: { tenantId, title },
          select: { id: true },
        });
        if (exists) {
          skipped += 1;
          continue;
        }

        const severity = mapAiSeverityToValues(suggestion.severity);
        const suggestedMeasures = normalizeAiMeasures(suggestion.suggestedMeasures);
        const createdRisk = await tx.risk.create({
          data: {
            tenantId,
            riskAssessmentId: assessment.id,
            title,
            context:
              suggestion.description?.trim() ||
              `AI-forslag for ${industryLabel}: ${title}`,
            likelihood: severity.likelihood,
            consequence: severity.consequence,
            score: severity.likelihood * severity.consequence,
            ownerId: ownerCandidate.userId,
            category: mapAiCategoryToRiskCategory(suggestion.category),
            description: suggestion.description?.trim() || null,
            existingControls:
              suggestion.existingControls?.trim() ||
              "Vurder tiltak via SJA, vernerunde og opplæringsplan.",
            riskStatement: suggestion.riskStatement?.trim() || title,
          },
        });

        if (suggestedMeasures.length > 0) {
          const dueAt = new Date();
          dueAt.setDate(dueAt.getDate() + 30);
          await tx.measure.createMany({
            data: suggestedMeasures.map((measureTitle) => ({
              tenantId,
              riskId: createdRisk.id,
              title: measureTitle,
              description: "AI-foreslått tiltak. Bekreft ansvarlig, frist og effekt ved oppfølging.",
              dueAt,
              responsibleId: ownerCandidate.userId,
              category: "MITIGATION",
              followUpFrequency: "ANNUAL",
            })),
          });
        }

        created += 1;
      }
    });

    // AI-feedback-logging: sammenlign AI-forslått tittel med det brukeren faktisk lagret. Ren bakgrunnslogging.
    for (const suggestion of validated.suggestions) {
      if (!suggestion.originalTitle) continue;
      void logAiFeedback({
        tenantId,
        feature: "risk_suggestion",
        aiSuggestion: suggestion.originalTitle,
        userFinalValue: suggestion.title.trim(),
      });
    }

    AuditLog.log(tenantId, user.id, "RISK_AI_SUGGESTIONS_APPLIED", "RiskAssessment", tenantId, {
      assessmentTitle: validated.assessmentTitle,
      created,
      skipped,
    }).catch(() => {});

    revalidatePath("/dashboard/risks");
    triggerRealtimeEvent(tenantId, "risk-updated");
    return { success: true, data: { created, skipped } };
  } catch (error: any) {
    return { success: false, error: error.message || "Kunne ikke lagre AI-risikoforslag" };
  }
}

