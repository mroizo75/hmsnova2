"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { generateSequenceNumber } from "@/lib/sequence";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import {
  createSjaSchema,
  updateSjaSchema,
  createSjaTemplateSchema,
} from "@/features/sja/schemas/sja.schema";
import { SjaStatus, SjaConclusion } from "@prisma/client";

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

export async function getSjaAnalyses(tenantId: string) {
  try {
    await getSessionContext();

    const analyses = await prisma.sjaAnalysis.findMany({
      where: { tenantId },
      include: {
        hazards: { orderBy: { sortOrder: "asc" } },
      },
      orderBy: [{ plannedDate: "desc" }],
    });

    return { success: true, data: analyses };
  } catch (error: any) {
    return { success: false, error: error.message || "Kunne ikke hente SJA-analyser" };
  }
}

export async function getSjaAnalysis(id: string) {
  try {
    const { tenantId } = await getSessionContext();

    const analysis = await prisma.sjaAnalysis.findUnique({
      where: { id, tenantId },
      include: {
        hazards: { orderBy: { sortOrder: "asc" } },
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
    const { user, tenantId } = await getSessionContext();
    const normalizedInput = {
      ...input,
      tenantId,
      plannedDate: new Date(input.plannedDate),
    };
    const validated = createSjaSchema.parse(normalizedInput);
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
          })),
        },
      },
      include: { hazards: true },
    });

    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: user.id,
        action: "SJA_CREATED",
        resource: `SjaAnalysis:${analysis.id}`,
        metadata: JSON.stringify({ title: analysis.title }),
      },
    });

    revalidatePath("/dashboard/sja");
    if (validated.projectId) {
      revalidatePath(`/dashboard/projects/${validated.projectId}`);
    }
    revalidatePath("/ansatt/sja");
    return { success: true, data: analysis };
  } catch (error: any) {
    return { success: false, error: error.message || "Kunne ikke opprette SJA" };
  }
}

export async function updateSjaAnalysis(input: any) {
  try {
    const { user, tenantId } = await getSessionContext();
    const normalizedInput = {
      ...input,
      plannedDate: input.plannedDate ? new Date(input.plannedDate) : undefined,
    };
    const validated = updateSjaSchema.parse(normalizedInput);

    const existing = await prisma.sjaAnalysis.findUnique({
      where: { id: validated.id, tenantId },
    });

    if (!existing) {
      return { success: false, error: "SJA ikke funnet" };
    }

    const updateData: Record<string, any> = { updatedAt: new Date() };

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
        })),
      });
    }

    const analysis = await prisma.sjaAnalysis.update({
      where: { id: validated.id, tenantId },
      data: updateData,
      include: { hazards: { orderBy: { sortOrder: "asc" } } },
    });

    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: user.id,
        action: "SJA_UPDATED",
        resource: `SjaAnalysis:${analysis.id}`,
        metadata: JSON.stringify({ title: analysis.title, status: analysis.status }),
      },
    });

    revalidatePath("/dashboard/sja");
    revalidatePath(`/dashboard/sja/${analysis.id}`);
    revalidatePath("/ansatt/sja");
    return { success: true, data: analysis };
  } catch (error: any) {
    return { success: false, error: error.message || "Kunne ikke oppdatere SJA" };
  }
}

export async function deleteSjaAnalysis(id: string) {
  try {
    const { user, tenantId } = await getSessionContext();

    const analysis = await prisma.sjaAnalysis.findUnique({
      where: { id, tenantId },
    });

    if (!analysis) {
      return { success: false, error: "SJA ikke funnet" };
    }

    await prisma.sjaAnalysis.delete({ where: { id, tenantId } });

    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: user.id,
        action: "SJA_DELETED",
        resource: `SjaAnalysis:${id}`,
        metadata: JSON.stringify({ title: analysis.title }),
      },
    });

    revalidatePath("/dashboard/sja");
    revalidatePath("/ansatt/sja");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Kunne ikke slette SJA" };
  }
}

// ============================================
// SJA Maler (Templates)
// ============================================

export async function getSjaTemplates(tenantId: string) {
  try {
    await getSessionContext();

    const templates = await prisma.sjaTemplate.findMany({
      where: { tenantId, isActive: true },
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
    const { user, tenantId } = await getSessionContext();
    const normalizedInput = { ...input, tenantId };
    const validated = createSjaTemplateSchema.parse(normalizedInput);

    const template = await prisma.sjaTemplate.create({
      data: {
        tenantId: validated.tenantId,
        name: validated.name,
        description: validated.description ?? null,
        workLocation: validated.workLocation ?? null,
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

    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: user.id,
        action: "SJA_TEMPLATE_CREATED",
        resource: `SjaTemplate:${template.id}`,
        metadata: JSON.stringify({ name: template.name }),
      },
    });

    revalidatePath("/dashboard/sja");
    revalidatePath("/ansatt/sja");
    return { success: true, data: template };
  } catch (error: any) {
    return { success: false, error: error.message || "Kunne ikke opprette SJA-mal" };
  }
}

export async function deleteSjaTemplate(id: string) {
  try {
    const { user, tenantId } = await getSessionContext();

    const template = await prisma.sjaTemplate.findUnique({
      where: { id, tenantId },
    });

    if (!template) {
      return { success: false, error: "SJA-mal ikke funnet" };
    }

    await prisma.sjaTemplate.update({
      where: { id, tenantId },
      data: { isActive: false },
    });

    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: user.id,
        action: "SJA_TEMPLATE_DELETED",
        resource: `SjaTemplate:${id}`,
        metadata: JSON.stringify({ name: template.name }),
      },
    });

    revalidatePath("/dashboard/sja");
    revalidatePath("/ansatt/sja");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Kunne ikke slette SJA-mal" };
  }
}

export async function getSjaStats(tenantId: string) {
  try {
    await getSessionContext();

    const analyses = await prisma.sjaAnalysis.findMany({
      where: { tenantId },
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
