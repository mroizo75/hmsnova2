"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import {
  createRiskSchema,
  updateRiskSchema,
  createRiskAssessmentSchema,
  updateRiskAssessmentSchema,
  riskLevelToMatrix,
} from "@/features/risks/schemas/risk.schema";
import { ControlFrequency, RiskCategory } from "@prisma/client";
import { calculateNextReviewDate } from "@/lib/document-utils";
import { getActionContext } from "./action-context";

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
    const { user, tenantId } = await getActionContext();
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
    
    // Audit log
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: user.id,
        action: "RISK_CREATED",
        resource: `Risk:${risk.id}`,
        metadata: JSON.stringify({ title: risk.title, score }),
      },
    });
    
    revalidatePath("/dashboard/risks");
    return { success: true, data: risk };
  } catch (error: any) {
    console.error("Create risk error:", error);
    return { success: false, error: error.message || "Kunne ikke opprette risiko" };
  }
}

// Oppdater risiko
export async function updateRisk(input: any) {
  try {
    const { user, tenantId } = await getActionContext();
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
    
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: user.id,
        action: "RISK_UPDATED",
        resource: `Risk:${risk.id}`,
        metadata: JSON.stringify({ title: risk.title, score }),
      },
    });
    
    revalidatePath("/dashboard/risks");
    revalidatePath(`/dashboard/risks/${risk.id}`);
    return { success: true, data: risk };
  } catch (error: any) {
    console.error("Update risk error:", error);
    return { success: false, error: error.message || "Kunne ikke oppdatere risiko" };
  }
}

// Slett risiko
export async function deleteRisk(id: string) {
  try {
    const { user, tenantId } = await getActionContext();
    
    const risk = await prisma.risk.findUnique({
      where: { id, tenantId },
    });
    
    if (!risk) {
      return { success: false, error: "Risiko ikke funnet" };
    }
    
    await prisma.risk.delete({
      where: { id, tenantId },
    });
    
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: user.id,
        action: "RISK_DELETED",
        resource: `Risk:${id}`,
        metadata: JSON.stringify({ title: risk.title }),
      },
    });
    
    revalidatePath("/dashboard/risks");
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

    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: user.id,
        action: "RISK_ASSESSMENT_CREATED",
        resource: `RiskAssessment:${assessment.id}`,
        metadata: JSON.stringify({ title: assessment.title, year: assessment.assessmentYear }),
      },
    });

    revalidatePath("/dashboard/risks");
    revalidatePath(`/dashboard/risks/assessment/${assessment.id}`);
    return { success: true, data: assessment };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Kunne ikke opprette risikovurdering";
    return { success: false, error: message };
  }
}

export async function updateRiskAssessment(input: {
  id: string;
  participants?: string;
  approvedById?: string | null;
  approvedAt?: string | null;
  reviewedById?: string | null;
  reviewedAt?: string | null;
}) {
  try {
    const { user, tenantId } = await getActionContext();
    const validated = updateRiskAssessmentSchema.parse(input);

    const existing = await prisma.riskAssessment.findFirst({
      where: { id: validated.id, tenantId },
    });
    if (!existing) return { success: false, error: "Risikovurdering ikke funnet" };

    const assessment = await prisma.riskAssessment.update({
      where: { id: validated.id },
      data: {
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

    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: user.id,
        action: "RISK_ASSESSMENT_UPDATED",
        resource: `RiskAssessment:${assessment.id}`,
        metadata: JSON.stringify({ title: assessment.title }),
      },
    });

    revalidatePath(`/dashboard/risks/assessment/${assessment.id}`);
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

    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: user.id,
        action: "RISK_ASSESSMENT_DELETED",
        resource: `RiskAssessment:${assessmentId}`,
        metadata: JSON.stringify({ title: assessment.title, risksCount: assessment._count.risks }),
      },
    });

    revalidatePath("/dashboard/risks");
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Kunne ikke slette risikovurdering";
    return { success: false, error: message };
  }
}

/** Legg til risikopunkt i en risikovurdering (tittel, beskrivelse, konsekvens, nivå, kategori, dato) */
export async function addRiskAssessmentItem(input: {
  riskAssessmentId: string;
  tenantId: string;
  ownerId: string;
  title: string;
  level: keyof typeof riskLevelToMatrix;
  category: string;
  assessmentDate?: string | null;
  nextReviewDate?: string | null;
  beskrivelse?: string | null;
  konsekvens?: string | null;
}) {
  try {
    const { tenantId: ctxTenantId } = await getActionContext();
    if (input.tenantId !== ctxTenantId) return { success: false, error: "Ugyldig tenant" };

    const assessment = await prisma.riskAssessment.findFirst({
      where: { id: input.riskAssessmentId, tenantId: input.tenantId },
    });
    if (!assessment) return { success: false, error: "Risikovurdering ikke funnet" };

    const { likelihood, consequence } = riskLevelToMatrix[input.level];
    const score = likelihood * consequence;
    const beskrivelseTrimmed = (input.beskrivelse ?? "").trim();
    const context =
      beskrivelseTrimmed.length >= 10
        ? beskrivelseTrimmed
        : input.title.length >= 10
          ? input.title
          : `${input.title} (risikopunkt)`;
    const riskStatement = (input.konsekvens ?? "").trim() || null;

    const risk = await prisma.risk.create({
      data: {
        tenantId: input.tenantId,
        riskAssessmentId: input.riskAssessmentId,
        title: input.title,
        context,
        riskStatement,
        likelihood,
        consequence,
        score,
        ownerId: input.ownerId,
        status: "OPEN",
        category: input.category as RiskCategory,
        assessmentDate: input.assessmentDate ? new Date(input.assessmentDate) : null,
        nextReviewDate: input.nextReviewDate ? new Date(input.nextReviewDate) : null,
        controlFrequency: input.nextReviewDate ? "ANNUAL" : undefined,
      },
    });

    revalidatePath("/dashboard/risks");
    revalidatePath(`/dashboard/risks/assessment/${input.riskAssessmentId}`);
    return { success: true, data: risk };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Kunne ikke legge til risikopunkt";
    return { success: false, error: message };
  }
}

