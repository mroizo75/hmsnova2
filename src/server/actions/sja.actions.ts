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
} from "@/features/sja/schemas/sja.schema";
import { SjaStatus, SjaConclusion } from "@prisma/client";
import { AuditLog } from "@/lib/audit-log";
import { triggerRealtimeEvent } from "@/lib/pusher-server";

async function getSessionContext() {
  const context = await getRequiredTenantContext();

  const user = await prisma.user.findUnique({
    where: { id: context.userId },
    include: { tenants: true },
  });

  if (!user || user.tenants.length === 0) {
    throw new Error("User not associated with a tenant");
  }

  return { user, tenantId: context.tenantId };
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
    const { user, tenantId } = await getSessionContext();

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

    const normalizedInput = {
      ...input,
      tenantId,
      plannedDate: new Date(input.plannedDate),
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
            linkedRiskId: h.linkedRiskId ?? null,
          })),
        },
      },
      include: { hazards: true },
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
    const { user, tenantId } = await getSessionContext();

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
          projectId: input.projectId || null,
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
    const { user, tenantId } = await getSessionContext();

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
          linkedRiskId: h.linkedRiskId ?? null,
        })),
      });
    }

    const analysis = await prisma.sjaAnalysis.update({
      where: { id: validated.id, tenantId },
      data: updateData,
      include: { hazards: { orderBy: { sortOrder: "asc" } } },
    });

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
    const { user, tenantId } = await getSessionContext();

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

// ============================================
// SJA Maler (Templates)
// ============================================

export async function getSjaTemplates(_tenantId: string) {
  try {
    const context = await getSessionContext();

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

    AuditLog.log(tenantId, user.id, "SJA_TEMPLATE_CREATED", "SjaTemplate", template.id, { name: template.name }).catch(() => {});

    revalidatePath("/dashboard/sja");
    revalidatePath("/ansatt/sja");
    triggerRealtimeEvent(tenantId, "sja-updated");
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

    AuditLog.log(tenantId, user.id, "SJA_TEMPLATE_DELETED", "SjaTemplate", id, { name: template.name }).catch(() => {});

    revalidatePath("/dashboard/sja");
    revalidatePath("/ansatt/sja");
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
