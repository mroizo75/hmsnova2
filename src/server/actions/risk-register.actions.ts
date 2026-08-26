"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { z } from "zod";
import {
  ControlFrequency,
  RiskAuditRelation,
  RiskControlEffectiveness,
  RiskControlStatus,
  RiskControlType,
  RiskDocumentRelation,
} from "@prisma/client";
import { getActionContext } from "./action-context";
import { triggerRealtimeEvent } from "@/lib/pusher-server";

const sanitizeText = (value?: string | null) => {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const parseOptionalDate = (value: string | null | undefined) => {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date;
};

const baseRevalidate = (riskId: string) => {
  revalidatePath("/dashboard/risks");
  revalidatePath(`/dashboard/risks/${riskId}`);
  revalidatePath("/dashboard/risk-register");
};

const controlSchema = z.object({
  riskId: z.string().cuid(),
  title: z.string().min(3),
  description: z.string().max(2000).optional().nullable(),
  controlType: z.nativeEnum(RiskControlType),
  ownerId: z.string().cuid().optional().nullable(),
  frequency: z.nativeEnum(ControlFrequency).optional().nullable(),
  effectiveness: z.nativeEnum(RiskControlEffectiveness).default("NOT_TESTED"),
  status: z.nativeEnum(RiskControlStatus).default("ACTIVE"),
  monitoringMethod: z.string().max(250).optional().nullable(),
  evidenceDocumentId: z.string().cuid().optional().nullable(),
  nextTestDate: z.string().optional().nullable(),
  lastTestedAt: z.string().optional().nullable(),
});

const updateControlSchema = z.object({
  id: z.string().cuid(),
  riskId: z.string().cuid(),
  title: z.string().min(3).optional(),
  description: z.string().max(2000).optional().nullable(),
  controlType: z.nativeEnum(RiskControlType).optional(),
  ownerId: z.string().cuid().optional().nullable(),
  frequency: z.nativeEnum(ControlFrequency).optional().nullable(),
  effectiveness: z.nativeEnum(RiskControlEffectiveness).optional(),
  status: z.nativeEnum(RiskControlStatus).optional(),
  monitoringMethod: z.string().max(250).optional().nullable(),
  evidenceDocumentId: z.string().cuid().optional().nullable(),
  nextTestDate: z.string().optional().nullable(),
  lastTestedAt: z.string().optional().nullable(),
});

const documentLinkSchema = z.object({
  riskId: z.string().cuid(),
  documentId: z.string().cuid(),
  relation: z.nativeEnum(RiskDocumentRelation).default("SUPPORTING"),
  note: z.string().max(500).optional().nullable(),
});

const auditLinkSchema = z.object({
  riskId: z.string().cuid(),
  auditId: z.string().cuid(),
  relation: z.nativeEnum(RiskAuditRelation).default("CONTROL_TEST"),
  summary: z.string().max(500).optional().nullable(),
});

export async function createRiskControl(input: z.infer<typeof controlSchema>) {
  try {
    const { tenantId, user } = await getActionContext();
    const validated = controlSchema.parse(input);

    const control = await prisma.riskControl.create({
      data: {
        tenantId,
        riskId: validated.riskId,
        title: validated.title,
        description: sanitizeText(validated.description),
        controlType: validated.controlType,
        ownerId: validated.ownerId,
        frequency: validated.frequency ?? null,
        effectiveness: validated.effectiveness,
        status: validated.status,
        monitoringMethod: sanitizeText(validated.monitoringMethod),
        evidenceDocumentId: validated.evidenceDocumentId ?? null,
        nextTestDate: parseOptionalDate(validated.nextTestDate) ?? null,
        lastTestedAt: parseOptionalDate(validated.lastTestedAt) ?? null,
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: user.id,
        action: "RISK_CONTROL_CREATED",
        resource: `RiskControl:${control.id}`,
        metadata: JSON.stringify({
          title: control.title,
          riskId: control.riskId,
        }),
      },
    });

    baseRevalidate(validated.riskId);
    triggerRealtimeEvent(tenantId, "risk-updated");
    return { success: true, data: control };
  } catch (error: any) {
    console.error("Create risk control error:", error);
    return { success: false, error: error.message || "Kunne ikke opprette kontroll" };
  }
}

export async function updateRiskControl(input: z.infer<typeof updateControlSchema>) {
  try {
    const { tenantId, user } = await getActionContext();
    const validated = updateControlSchema.parse(input);

    const existing = await prisma.riskControl.findFirst({
      where: { id: validated.id, tenantId },
    });

    if (!existing) {
      return { success: false, error: "Kontrollen finnes ikke" };
    }

    const data: Record<string, any> = {};
    if (validated.title) data.title = validated.title;
    if (validated.description !== undefined) data.description = sanitizeText(validated.description);
    if (validated.controlType) data.controlType = validated.controlType;
    if (validated.ownerId !== undefined) data.ownerId = validated.ownerId ?? null;
    if (validated.frequency !== undefined) data.frequency = validated.frequency ?? null;
    if (validated.effectiveness) data.effectiveness = validated.effectiveness;
    if (validated.status) data.status = validated.status;
    if (validated.monitoringMethod !== undefined) {
      data.monitoringMethod = sanitizeText(validated.monitoringMethod);
    }
    if (validated.evidenceDocumentId !== undefined) {
      data.evidenceDocumentId = validated.evidenceDocumentId ?? null;
    }
    if (validated.nextTestDate !== undefined) {
      data.nextTestDate = parseOptionalDate(validated.nextTestDate) ?? null;
    }
    if (validated.lastTestedAt !== undefined) {
      data.lastTestedAt = parseOptionalDate(validated.lastTestedAt) ?? null;
    }

    const control = await prisma.riskControl.update({
      where: { id: validated.id },
      data,
    });

    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: user.id,
        action: "RISK_CONTROL_UPDATED",
        resource: `RiskControl:${control.id}`,
        metadata: JSON.stringify({
          title: control.title,
          riskId: control.riskId,
          status: control.status,
        }),
      },
    });

    baseRevalidate(control.riskId);
    triggerRealtimeEvent(tenantId, "risk-updated");
    return { success: true, data: control };
  } catch (error: any) {
    console.error("Update risk control error:", error);
    return { success: false, error: error.message || "Kunne ikke oppdatere kontroll" };
  }
}

export async function deleteRiskControl(controlId: string) {
  try {
    const { tenantId, user } = await getActionContext();
    const control = await prisma.riskControl.findFirst({
      where: { id: controlId, tenantId },
    });

    if (!control) {
      return { success: false, error: "Kontrollen finnes ikke" };
    }

    await prisma.riskControl.delete({
      where: { id: controlId },
    });

    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: user.id,
        action: "RISK_CONTROL_DELETED",
        resource: `RiskControl:${controlId}`,
        metadata: JSON.stringify({ riskId: control.riskId }),
      },
    });

    baseRevalidate(control.riskId);
    triggerRealtimeEvent(tenantId, "risk-updated");
    return { success: true };
  } catch (error: any) {
    console.error("Delete risk control error:", error);
    return { success: false, error: error.message || "Kunne ikke slette kontroll" };
  }
}

export async function linkDocumentToRisk(input: z.infer<typeof documentLinkSchema>) {
  try {
    const { tenantId, user } = await getActionContext();
    const validated = documentLinkSchema.parse(input);

    const document = await prisma.document.findFirst({
      where: { id: validated.documentId, tenantId },
    });

    if (!document) {
      throw new Error("Dokumentet finnes ikke");
    }

    const link = await prisma.riskDocumentLink.upsert({
      where: {
        riskId_documentId: {
          riskId: validated.riskId,
          documentId: validated.documentId,
        },
      },
      update: {
        relation: validated.relation,
        note: sanitizeText(validated.note),
      },
      create: {
        tenantId,
        riskId: validated.riskId,
        documentId: validated.documentId,
        relation: validated.relation,
        note: sanitizeText(validated.note),
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: user.id,
        action: "RISK_DOCUMENT_LINKED",
        resource: `Risk:${validated.riskId}`,
        metadata: JSON.stringify({
          documentId: validated.documentId,
          relation: validated.relation,
        }),
      },
    });

    baseRevalidate(validated.riskId);
    triggerRealtimeEvent(tenantId, "risk-updated");
    return { success: true, data: link };
  } catch (error: any) {
    console.error("Link document error:", error);
    return { success: false, error: error.message || "Kunne ikke koble dokument" };
  }
}

export async function unlinkDocumentFromRisk(linkId: string) {
  try {
    const { tenantId } = await getActionContext();
    const link = await prisma.riskDocumentLink.findFirst({
      where: { id: linkId, tenantId },
    });
    if (!link) {
      return { success: false, error: "Dokumentkoblingen finnes ikke" };
    }

    await prisma.riskDocumentLink.delete({ where: { id: linkId } });
    baseRevalidate(link.riskId);
    triggerRealtimeEvent(tenantId, "risk-updated");
    return { success: true };
  } catch (error: any) {
    console.error("Unlink document error:", error);
    return { success: false, error: error.message || "Kunne ikke fjerne kobling" };
  }
}

export async function linkAuditToRisk(input: z.infer<typeof auditLinkSchema>) {
  try {
    const { tenantId, user } = await getActionContext();
    const validated = auditLinkSchema.parse(input);

    const audit = await prisma.audit.findFirst({
      where: { id: validated.auditId, tenantId },
    });

    if (!audit) {
      throw new Error("Revisjonen finnes ikke");
    }

    const link = await prisma.riskAuditLink.upsert({
      where: {
        riskId_auditId: {
          riskId: validated.riskId,
          auditId: validated.auditId,
        },
      },
      update: {
        relation: validated.relation,
        summary: sanitizeText(validated.summary),
      },
      create: {
        tenantId,
        riskId: validated.riskId,
        auditId: validated.auditId,
        relation: validated.relation,
        summary: sanitizeText(validated.summary),
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: user.id,
        action: "RISK_AUDIT_LINKED",
        resource: `Risk:${validated.riskId}`,
        metadata: JSON.stringify({
          auditId: validated.auditId,
          relation: validated.relation,
        }),
      },
    });

    baseRevalidate(validated.riskId);
    triggerRealtimeEvent(tenantId, "risk-updated");
    return { success: true, data: link };
  } catch (error: any) {
    console.error("Link audit error:", error);
    return { success: false, error: error.message || "Kunne ikke koble revisjon" };
  }
}

export async function unlinkAuditFromRisk(linkId: string) {
  try {
    const { tenantId } = await getActionContext();
    const link = await prisma.riskAuditLink.findFirst({
      where: { id: linkId, tenantId },
    });

    if (!link) {
      return { success: false, error: "Revisjonskoblingen finnes ikke" };
    }

    await prisma.riskAuditLink.delete({ where: { id: linkId } });
    baseRevalidate(link.riskId);
    triggerRealtimeEvent(tenantId, "risk-updated");
    return { success: true };
  } catch (error: any) {
    console.error("Unlink audit error:", error);
    return { success: false, error: error.message || "Kunne ikke fjerne kobling" };
  }
}

