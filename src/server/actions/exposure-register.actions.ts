"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getRequiredTenantContext } from "@/lib/tenant-context";
import { ExposureRegisterStatus, ExposureType } from "@prisma/client";
import { encryptField, decryptField } from "@/lib/field-encryption";

async function getSessionContext() {
  const tenantContext = await getRequiredTenantContext();

  const user = await prisma.user.findUnique({
    where: { id: tenantContext.userId },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  return { user, tenantId: tenantContext.tenantId };
}

type ExposureRelationInput = {
  employeeId?: string | null;
  chemicalId?: string | null;
  ruhReportId?: string | null;
  riskId?: string | null;
};

async function assertTenantScopedExposureRelations(
  tenantId: string,
  relations: ExposureRelationInput
): Promise<void> {
  const { employeeId, chemicalId, ruhReportId, riskId } = relations;

  if (employeeId) {
    const employeeMembership = await prisma.userTenant.findUnique({
      where: {
        userId_tenantId: {
          userId: employeeId,
          tenantId,
        },
      },
      select: { userId: true },
    });
    if (!employeeMembership) {
      throw new Error("Ansatt finnes ikke i valgt tenant");
    }
  }

  if (chemicalId) {
    const chemical = await prisma.chemical.findFirst({
      where: { id: chemicalId, tenantId },
      select: { id: true },
    });
    if (!chemical) {
      throw new Error("Kjemikalie finnes ikke i valgt tenant");
    }
  }

  if (ruhReportId) {
    const ruhReport = await prisma.ruhReport.findFirst({
      where: { id: ruhReportId, tenantId },
      select: { id: true },
    });
    if (!ruhReport) {
      throw new Error("RUH-rapport finnes ikke i valgt tenant");
    }
  }

  if (riskId) {
    const risk = await prisma.risk.findFirst({
      where: { id: riskId, tenantId },
      select: { id: true },
    });
    if (!risk) {
      throw new Error("Risikovurdering finnes ikke i valgt tenant");
    }
  }
}

function computeRetentionUntilDate(retentionYears: number): Date {
  const d = new Date();
  d.setFullYear(d.getFullYear() + retentionYears);
  return d;
}

/**
 * Beregner riktig status basert på sluttdato.
 * Hvis sluttdato er satt og ligger i fortiden → INACTIVE.
 * Ingen sluttdato, eller sluttdato i fremtiden → ACTIVE.
 */
function deriveStatus(
  exposureEndDate: Date | null | undefined,
  explicitStatus?: ExposureRegisterStatus
): ExposureRegisterStatus {
  if (explicitStatus) return explicitStatus;
  if (exposureEndDate && new Date(exposureEndDate) < new Date()) {
    return ExposureRegisterStatus.INACTIVE;
  }
  return ExposureRegisterStatus.ACTIVE;
}

// ============================================================================
// READ
// ============================================================================

export async function getExposureRegisters(_tenantId: string) {
  try {
    const { tenantId } = await getSessionContext();

    const entries = await prisma.exposureRegister.findMany({
      where: { tenantId, status: { not: ExposureRegisterStatus.ARCHIVED } },
      include: {
        employee: { select: { id: true, name: true, email: true } },
        chemical: { select: { id: true, productName: true, casNumber: true } },
        ruhReport: { select: { id: true, ruhNummer: true, title: true, occurredAt: true } },
        risk: {
          select: {
            id: true, title: true, score: true, likelihood: true,
            consequence: true, status: true,
            riskAssessment: { select: { title: true, assessmentYear: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      success: true,
      data: entries.map((e) => ({
        ...e,
        employeeBirthNumber: decryptField(e.employeeBirthNumber),
      })),
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Kunne ikke hente eksponeringsregister" };
  }
}

export async function getExposureRegister(id: string) {
  try {
    const { tenantId } = await getSessionContext();

    const entry = await prisma.exposureRegister.findFirst({
      where: { id, tenantId },
      include: {
        employee: { select: { id: true, name: true, email: true } },
        chemical: { select: { id: true, productName: true, casNumber: true } },
      },
    });

    if (!entry) return { success: false, error: "Ikke funnet" };

    return {
      success: true,
      data: {
        ...entry,
        employeeBirthNumber: decryptField(entry.employeeBirthNumber),
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Kunne ikke hente oppføring" };
  }
}

// ============================================================================
// CREATE
// ============================================================================

export interface CreateExposureRegisterInput {
  employeeId?: string;
  employeeName: string;
  employeeBirthNumber: string;
  department?: string;
  jobTitle: string;
  workLocation: string;
  employmentStartDate?: Date;
  employmentEndDate?: Date;
  chemicalId?: string;
  exposureAgent: string;
  casNumber?: string;
  exposureType: ExposureType;
  exposureStartDate: Date;
  exposureEndDate?: Date;
  duration?: string;
  ppeUsed?: string;
  riskAssessmentDone: boolean;
  healthCheckRequired: boolean;
  healthCheckDone: boolean;
  healthCheckDate?: Date;
  retentionYears: number;
  ruhReportId?: string;
  riskId?: string;
  comment?: string;
}

export async function createExposureRegister(input: CreateExposureRegisterInput) {
  try {
    const { tenantId, user } = await getSessionContext();
    await assertTenantScopedExposureRelations(tenantId, {
      employeeId: input.employeeId,
      chemicalId: input.chemicalId,
      ruhReportId: input.ruhReportId,
      riskId: input.riskId,
    });

    const entry = await prisma.exposureRegister.create({
      data: {
        tenantId,
        employeeId: input.employeeId || null,
        employeeName: input.employeeName,
        employeeBirthNumber: encryptField(input.employeeBirthNumber),
        department: input.department || null,
        jobTitle: input.jobTitle,
        workLocation: input.workLocation,
        employmentStartDate: input.employmentStartDate || null,
        employmentEndDate: input.employmentEndDate || null,
        chemicalId: input.chemicalId || null,
        exposureAgent: input.exposureAgent,
        casNumber: input.casNumber || null,
        exposureType: input.exposureType,
        exposureStartDate: input.exposureStartDate,
        exposureEndDate: input.exposureEndDate || null,
        duration: input.duration || null,
        ppeUsed: input.ppeUsed || null,
        riskAssessmentDone: input.riskAssessmentDone,
        healthCheckRequired: input.healthCheckRequired,
        healthCheckDone: input.healthCheckDone,
        healthCheckDate: input.healthCheckDate || null,
        retentionYears: input.retentionYears,
        retentionUntilDate: computeRetentionUntilDate(input.retentionYears),
        status: deriveStatus(input.exposureEndDate),
        ruhReportId: input.ruhReportId || null,
        riskId: input.riskId || null,
        comment: input.comment || null,
        registeredBy: user.name || user.email,
      },
    });

    revalidatePath("/dashboard/exposure-register");
    return { success: true, data: entry };
  } catch (error: any) {
    return { success: false, error: error.message || "Kunne ikke opprette oppføring" };
  }
}

// ============================================================================
// UPDATE
// ============================================================================

export type UpdateExposureRegisterInput = Partial<CreateExposureRegisterInput> & {
  status?: ExposureRegisterStatus;
};

export async function updateExposureRegister(id: string, input: UpdateExposureRegisterInput) {
  try {
    const { tenantId } = await getSessionContext();

    const existing = await prisma.exposureRegister.findFirst({ where: { id, tenantId } });
    if (!existing) return { success: false, error: "Ikke funnet" };
    if (existing.status === ExposureRegisterStatus.ARCHIVED) {
      return { success: false, error: "Arkiverte oppføringer kan ikke endres" };
    }

    // Finn ut hvilken sluttdato som vil gjelde etter oppdateringen
    const resolvedEndDate =
      input.exposureEndDate !== undefined
        ? (input.exposureEndDate || null)
        : existing.exposureEndDate;

    await assertTenantScopedExposureRelations(tenantId, {
      employeeId: input.employeeId,
      chemicalId: input.chemicalId,
      ruhReportId: input.ruhReportId,
      riskId: input.riskId,
    });

    const updated = await prisma.exposureRegister.update({
      where: { id, tenantId },
      data: {
        ...(input.employeeId !== undefined && { employeeId: input.employeeId || null }),
        ...(input.employeeName && { employeeName: input.employeeName }),
        ...(input.employeeBirthNumber && { employeeBirthNumber: encryptField(input.employeeBirthNumber) }),
        ...(input.department !== undefined && { department: input.department || null }),
        ...(input.jobTitle && { jobTitle: input.jobTitle }),
        ...(input.workLocation && { workLocation: input.workLocation }),
        ...(input.employmentStartDate !== undefined && { employmentStartDate: input.employmentStartDate || null }),
        ...(input.employmentEndDate !== undefined && { employmentEndDate: input.employmentEndDate || null }),
        ...(input.chemicalId !== undefined && { chemicalId: input.chemicalId || null }),
        ...(input.exposureAgent && { exposureAgent: input.exposureAgent }),
        ...(input.casNumber !== undefined && { casNumber: input.casNumber || null }),
        ...(input.exposureType && { exposureType: input.exposureType }),
        ...(input.exposureStartDate && { exposureStartDate: input.exposureStartDate }),
        ...(input.exposureEndDate !== undefined && { exposureEndDate: input.exposureEndDate || null }),
        ...(input.duration !== undefined && { duration: input.duration || null }),
        ...(input.ppeUsed !== undefined && { ppeUsed: input.ppeUsed || null }),
        ...(input.riskAssessmentDone !== undefined && { riskAssessmentDone: input.riskAssessmentDone }),
        ...(input.healthCheckRequired !== undefined && { healthCheckRequired: input.healthCheckRequired }),
        ...(input.healthCheckDone !== undefined && { healthCheckDone: input.healthCheckDone }),
        ...(input.healthCheckDate !== undefined && { healthCheckDate: input.healthCheckDate || null }),
        ...(input.retentionYears !== undefined && {
          retentionYears: input.retentionYears,
          retentionUntilDate: computeRetentionUntilDate(input.retentionYears),
        }),
        ...(input.ruhReportId !== undefined && { ruhReportId: input.ruhReportId || null }),
        ...(input.riskId !== undefined && { riskId: input.riskId || null }),
        ...(input.comment !== undefined && { comment: input.comment || null }),
        // Status: eksplisitt verdi vinner, ellers utlede fra sluttdato
        status: deriveStatus(resolvedEndDate, input.status),
      },
    });

    revalidatePath("/dashboard/exposure-register");
    return { success: true, data: updated };
  } catch (error: any) {
    return { success: false, error: error.message || "Kunne ikke oppdatere oppføring" };
  }
}

// ============================================================================
// ARCHIVE (aldri hard-slett – jf. Arbeidstilsynets krav)
// ============================================================================

export async function archiveExposureRegister(id: string) {
  try {
    const { tenantId } = await getSessionContext();

    const existing = await prisma.exposureRegister.findFirst({ where: { id, tenantId } });
    if (!existing) return { success: false, error: "Ikke funnet" };

    const now = new Date();
    if (existing.retentionUntilDate > now) {
      return {
        success: false,
        error: `Kan ikke arkiveres før oppbevaringsplikten utløper (${existing.retentionUntilDate.toLocaleDateString("nb-NO")})`,
      };
    }

    await prisma.exposureRegister.update({
      where: { id, tenantId },
      data: { status: ExposureRegisterStatus.ARCHIVED, archivedAt: now },
    });

    revalidatePath("/dashboard/exposure-register");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Kunne ikke arkivere oppføring" };
  }
}

// ============================================================================
// MARK INACTIVE (eksponering avsluttet)
// ============================================================================

export async function markExposureInactive(id: string, endDate: Date) {
  try {
    const { tenantId } = await getSessionContext();

    const existing = await prisma.exposureRegister.findFirst({ where: { id, tenantId } });
    if (!existing) return { success: false, error: "Ikke funnet" };

    await prisma.exposureRegister.update({
      where: { id, tenantId },
      data: {
        status: ExposureRegisterStatus.INACTIVE,
        exposureEndDate: endDate,
      },
    });

    revalidatePath("/dashboard/exposure-register");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Kunne ikke oppdatere oppføring" };
  }
}

// ============================================================================
// HELPERS – hent ansatte og kjemikalier for skjema
// ============================================================================

export async function getRisksForTenant(_tenantId: string) {
  try {
    const { tenantId } = await getSessionContext();

    const risks = await prisma.risk.findMany({
      where: { tenantId, status: { not: "CLOSED" } },
      select: {
        id: true,
        title: true,
        score: true,
        likelihood: true,
        consequence: true,
        category: true,
        status: true,
        location: true,
        riskAssessment: { select: { title: true, assessmentYear: true } },
      },
      orderBy: [{ score: "desc" }, { createdAt: "desc" }],
    });

    return { success: true, data: risks };
  } catch (error: any) {
    return { success: false, error: error.message || "Kunne ikke hente risikovurderinger" };
  }
}

export async function getRuhReportsForTenant(_tenantId: string) {
  try {
    const { tenantId } = await getSessionContext();

    const reports = await prisma.ruhReport.findMany({
      where: { tenantId },
      select: { id: true, ruhNummer: true, title: true, occurredAt: true, category: true },
      orderBy: { occurredAt: "desc" },
    });

    return { success: true, data: reports };
  } catch (error: any) {
    return { success: false, error: error.message || "Kunne ikke hente RUH-rapporter" };
  }
}

export async function getEmployeesForTenant(_tenantId: string) {
  try {
    const { tenantId } = await getSessionContext();

    const userTenants = await prisma.userTenant.findMany({
      where: { tenantId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { user: { name: "asc" } },
    });

    return {
      success: true,
      data: userTenants.map((ut) => ({
        id: ut.user.id,
        name: ut.user.name || ut.user.email,
        email: ut.user.email,
        department: ut.department,
        role: ut.role,
        employeeNumber: ut.employeeNumber ?? null,
      })),
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Kunne ikke hente ansatte" };
  }
}
