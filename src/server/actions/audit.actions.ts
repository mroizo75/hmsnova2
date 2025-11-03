"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import {
  createAuditSchema,
  updateAuditSchema,
  createFindingSchema,
  updateFindingSchema,
} from "@/features/audits/schemas/audit.schema";
import { AuditLog } from "@/lib/audit-log";

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

// ============================================================================
// AUDITS (ISO 9001 - 9.2 Internrevisjon)
// ============================================================================

// Hent alle revisjoner
export async function getAudits(tenantId: string) {
  try {
    const { user } = await getSessionContext();

    const audits = await prisma.audit.findMany({
      where: { tenantId },
      include: {
        findings: {
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { scheduledDate: "desc" },
    });

    return { success: true, data: audits };
  } catch (error: any) {
    console.error("Get audits error:", error);
    return { success: false, error: error.message || "Kunne ikke hente revisjoner" };
  }
}

// Hent en spesifikk revisjon
export async function getAudit(auditId: string) {
  try {
    const { user, tenantId } = await getSessionContext();

    const audit = await prisma.audit.findUnique({
      where: { id: auditId, tenantId },
      include: {
        findings: {
          orderBy: { createdAt: "desc" },
        },
        measures: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!audit) {
      return { success: false, error: "Revisjon ikke funnet" };
    }

    return { success: true, data: audit };
  } catch (error: any) {
    console.error("Get audit error:", error);
    return { success: false, error: error.message || "Kunne ikke hente revisjon" };
  }
}

// Opprett ny revisjon (ISO 9001: Planlegging)
export async function createAudit(input: any) {
  try {
    const { user, tenantId } = await getSessionContext();
    const validated = createAuditSchema.parse({
      ...input,
      tenantId,
      scheduledDate: new Date(input.scheduledDate),
    });

    const audit = await prisma.audit.create({
      data: {
        tenantId: validated.tenantId,
        title: validated.title,
        auditType: validated.auditType,
        scope: validated.scope,
        criteria: validated.criteria,
        leadAuditorId: validated.leadAuditorId,
        teamMemberIds: validated.teamMemberIds
          ? JSON.stringify(validated.teamMemberIds)
          : null,
        scheduledDate: validated.scheduledDate,
        area: validated.area,
        department: validated.department,
        status: validated.status,
      },
    });

    await AuditLog.log(
      tenantId,
      user.id,
      "AUDIT_CREATED",
      "Audit",
      audit.id,
      { title: audit.title, scheduledDate: audit.scheduledDate }
    );

    revalidatePath("/dashboard/audits");
    return { success: true, data: audit };
  } catch (error: any) {
    console.error("Create audit error:", error);
    return { success: false, error: error.message || "Kunne ikke opprette revisjon" };
  }
}

// Oppdater revisjon
export async function updateAudit(input: any) {
  try {
    const { user, tenantId } = await getSessionContext();
    const validated = updateAuditSchema.parse({
      ...input,
      scheduledDate: input.scheduledDate ? new Date(input.scheduledDate) : undefined,
      completedAt: input.completedAt ? new Date(input.completedAt) : undefined,
    });

    const existingAudit = await prisma.audit.findFirst({
      where: { id: validated.id, tenantId },
    });

    if (!existingAudit) {
      return { success: false, error: "Revisjon ikke funnet" };
    }

    const audit = await prisma.audit.update({
      where: { id: validated.id },
      data: {
        ...validated,
        teamMemberIds:
          validated.teamMemberIds !== undefined
            ? JSON.stringify(validated.teamMemberIds)
            : undefined,
        updatedAt: new Date(),
      },
    });

    await AuditLog.log(
      tenantId,
      user.id,
      "AUDIT_UPDATED",
      "Audit",
      audit.id,
      { title: audit.title }
    );

    revalidatePath("/dashboard/audits");
    revalidatePath(`/dashboard/audits/${audit.id}`);
    return { success: true, data: audit };
  } catch (error: any) {
    console.error("Update audit error:", error);
    return { success: false, error: error.message || "Kunne ikke oppdatere revisjon" };
  }
}

// Slett revisjon
export async function deleteAudit(auditId: string) {
  try {
    const { user, tenantId } = await getSessionContext();

    const audit = await prisma.audit.findFirst({
      where: { id: auditId, tenantId },
    });

    if (!audit) {
      return { success: false, error: "Revisjon ikke funnet" };
    }

    // Slett rapport fra storage hvis den finnes
    if (audit.reportKey) {
      const storage = await import("@/lib/storage").then((m) => m.getStorage());
      await storage.delete(audit.reportKey);
    }

    await prisma.audit.delete({
      where: { id: auditId },
    });

    await AuditLog.log(
      tenantId,
      user.id,
      "AUDIT_DELETED",
      "Audit",
      auditId,
      { title: audit.title }
    );

    revalidatePath("/dashboard/audits");
    return { success: true };
  } catch (error: any) {
    console.error("Delete audit error:", error);
    return { success: false, error: error.message || "Kunne ikke slette revisjon" };
  }
}

// Få statistikk over revisjoner
export async function getAuditStats(tenantId: string) {
  try {
    const { user } = await getSessionContext();

    const audits = await prisma.audit.findMany({
      where: { tenantId },
      include: { findings: true },
    });

    const stats = {
      total: audits.length,
      planned: audits.filter((a) => a.status === "PLANNED").length,
      inProgress: audits.filter((a) => a.status === "IN_PROGRESS").length,
      completed: audits.filter((a) => a.status === "COMPLETED").length,
      totalFindings: audits.reduce((sum, a) => sum + a.findings.length, 0),
      majorNCs: audits.reduce(
        (sum, a) => sum + a.findings.filter((f) => f.findingType === "MAJOR_NC").length,
        0
      ),
      minorNCs: audits.reduce(
        (sum, a) => sum + a.findings.filter((f) => f.findingType === "MINOR_NC").length,
        0
      ),
      observations: audits.reduce(
        (sum, a) => sum + a.findings.filter((f) => f.findingType === "OBSERVATION").length,
        0
      ),
      strengths: audits.reduce(
        (sum, a) => sum + a.findings.filter((f) => f.findingType === "STRENGTH").length,
        0
      ),
    };

    return { success: true, data: stats };
  } catch (error: any) {
    console.error("Get audit stats error:", error);
    return { success: false, error: error.message || "Kunne ikke hente statistikk" };
  }
}

// ============================================================================
// AUDIT FINDINGS (Revisjonsfunn)
// ============================================================================

// Opprett nytt funn (ISO 9001: Dokumentere funn)
export async function createFinding(input: any) {
  try {
    const { user, tenantId } = await getSessionContext();
    const validated = createFindingSchema.parse({
      ...input,
      dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
    });

    // Sjekk at revisjonen finnes
    const audit = await prisma.audit.findFirst({
      where: { id: validated.auditId, tenantId },
    });

    if (!audit) {
      return { success: false, error: "Revisjon ikke funnet" };
    }

    const finding = await prisma.auditFinding.create({
      data: {
        auditId: validated.auditId,
        findingType: validated.findingType,
        clause: validated.clause,
        description: validated.description,
        evidence: validated.evidence,
        requirement: validated.requirement,
        responsibleId: validated.responsibleId,
        dueDate: validated.dueDate,
      },
    });

    await AuditLog.log(
      tenantId,
      user.id,
      "AUDIT_FINDING_CREATED",
      "AuditFinding",
      finding.id,
      { auditId: audit.id, findingType: finding.findingType }
    );

    revalidatePath("/dashboard/audits");
    revalidatePath(`/dashboard/audits/${audit.id}`);
    return { success: true, data: finding };
  } catch (error: any) {
    console.error("Create finding error:", error);
    return { success: false, error: error.message || "Kunne ikke opprette funn" };
  }
}

// Oppdater funn (ISO 9001: Korrigerende tiltak)
export async function updateFinding(input: any) {
  try {
    const { user, tenantId } = await getSessionContext();
    const validated = updateFindingSchema.parse({
      ...input,
      dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
    });

    const existingFinding = await prisma.auditFinding.findUnique({
      where: { id: validated.id },
      include: { audit: true },
    });

    if (!existingFinding || existingFinding.audit.tenantId !== tenantId) {
      return { success: false, error: "Funn ikke funnet" };
    }

    const finding = await prisma.auditFinding.update({
      where: { id: validated.id },
      data: {
        ...validated,
        updatedAt: new Date(),
      },
    });

    await AuditLog.log(
      tenantId,
      user.id,
      "AUDIT_FINDING_UPDATED",
      "AuditFinding",
      finding.id,
      { status: finding.status }
    );

    revalidatePath("/dashboard/audits");
    revalidatePath(`/dashboard/audits/${existingFinding.auditId}`);
    return { success: true, data: finding };
  } catch (error: any) {
    console.error("Update finding error:", error);
    return { success: false, error: error.message || "Kunne ikke oppdatere funn" };
  }
}

// Verifiser lukking av funn (ISO 9001: Verifikasjon)
export async function verifyFinding(findingId: string) {
  try {
    const { user, tenantId } = await getSessionContext();

    const finding = await prisma.auditFinding.findUnique({
      where: { id: findingId },
      include: { audit: true },
    });

    if (!finding || finding.audit.tenantId !== tenantId) {
      return { success: false, error: "Funn ikke funnet" };
    }

    if (finding.status !== "RESOLVED") {
      return {
        success: false,
        error: "Funnet må være løst før det kan verifiseres",
      };
    }

    const updatedFinding = await prisma.auditFinding.update({
      where: { id: findingId },
      data: {
        status: "VERIFIED",
        verifiedById: user.id,
        verifiedAt: new Date(),
        closedAt: new Date(),
      },
    });

    await AuditLog.log(
      tenantId,
      user.id,
      "AUDIT_FINDING_VERIFIED",
      "AuditFinding",
      updatedFinding.id,
      { verifiedBy: user.id }
    );

    revalidatePath("/dashboard/audits");
    revalidatePath(`/dashboard/audits/${finding.auditId}`);
    return { success: true, data: updatedFinding };
  } catch (error: any) {
    console.error("Verify finding error:", error);
    return { success: false, error: error.message || "Kunne ikke verifisere funn" };
  }
}

// Slett funn
export async function deleteFinding(findingId: string) {
  try {
    const { user, tenantId } = await getSessionContext();

    const finding = await prisma.auditFinding.findUnique({
      where: { id: findingId },
      include: { audit: true },
    });

    if (!finding || finding.audit.tenantId !== tenantId) {
      return { success: false, error: "Funn ikke funnet" };
    }

    await prisma.auditFinding.delete({
      where: { id: findingId },
    });

    await AuditLog.log(
      tenantId,
      user.id,
      "AUDIT_FINDING_DELETED",
      "AuditFinding",
      findingId,
      { auditId: finding.auditId }
    );

    revalidatePath("/dashboard/audits");
    revalidatePath(`/dashboard/audits/${finding.auditId}`);
    return { success: true };
  } catch (error: any) {
    console.error("Delete finding error:", error);
    return { success: false, error: error.message || "Kunne ikke slette funn" };
  }
}

