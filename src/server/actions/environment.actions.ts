"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getRequiredTenantContext } from "@/lib/tenant-context";
import {
  createEnvironmentalAspectSchema,
  createEnvironmentalMeasurementSchema,
  updateEnvironmentalAspectSchema,
} from "@/features/environment/schemas/environment.schema";
import {
  EnvironmentalAspectStatus,
  EnvironmentalMeasurementStatus,
} from "@prisma/client";

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

const sanitizeString = (value?: string | null) => {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const parseOptionalDate = (value: any) => {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const parseOptionalNumber = (value: any) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const calculateSignificance = (severity: number, likelihood: number) =>
  severity * likelihood;

const getMeasurementStatus = (
  measuredValue: number,
  limitValue?: number | null,
  targetValue?: number | null
): EnvironmentalMeasurementStatus => {
  if (typeof limitValue === "number" && measuredValue > limitValue) {
    return EnvironmentalMeasurementStatus.NON_COMPLIANT;
  }
  if (typeof targetValue === "number" && measuredValue > targetValue) {
    return EnvironmentalMeasurementStatus.WARNING;
  }
  return EnvironmentalMeasurementStatus.COMPLIANT;
};

export async function createEnvironmentalAspect(input: any) {
  try {
    const { user, tenantId } = await getSessionContext();
    const normalizedInput = {
      ...input,
      tenantId,
      nextReviewDate: parseOptionalDate(input.nextReviewDate),
    };
    const validated = createEnvironmentalAspectSchema.parse(normalizedInput);
    const significanceScore = calculateSignificance(
      validated.severity,
      validated.likelihood
    );

    const aspect = await prisma.environmentalAspect.create({
      data: {
        tenantId: validated.tenantId,
        title: validated.title,
        description: sanitizeString(validated.description),
        process: sanitizeString(validated.process),
        location: sanitizeString(validated.location),
        category: validated.category,
        impactType: validated.impactType,
        severity: validated.severity,
        likelihood: validated.likelihood,
        significanceScore,
        legalRequirement: sanitizeString(validated.legalRequirement),
        controlMeasures: sanitizeString(validated.controlMeasures),
        monitoringMethod: sanitizeString(validated.monitoringMethod),
        monitoringFrequency: validated.monitoringFrequency,
        ownerId: validated.ownerId || null,
        goalId: validated.goalId || null,
        status: validated.status || EnvironmentalAspectStatus.ACTIVE,
        nextReviewDate: validated.nextReviewDate ?? null,
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: user.id,
        action: "ENVIRONMENTAL_ASPECT_CREATED",
        resource: `EnvironmentalAspect:${aspect.id}`,
        metadata: JSON.stringify({
          title: aspect.title,
          category: aspect.category,
          significanceScore: aspect.significanceScore,
        }),
      },
    });

    revalidatePath("/dashboard/environment");
    return { success: true, data: aspect };
  } catch (error: any) {
    console.error("Create environmental aspect error:", error);
    return {
      success: false,
      error: error.message || "Kunne ikke opprette miljøaspekt",
    };
  }
}

export async function updateEnvironmentalAspect(input: any) {
  try {
    const { user, tenantId } = await getSessionContext();
    const normalizedInput = {
      ...input,
      nextReviewDate:
        input.nextReviewDate === null
          ? null
          : parseOptionalDate(input.nextReviewDate),
    };
    const validated = updateEnvironmentalAspectSchema.parse(normalizedInput);

    const existing = await prisma.environmentalAspect.findUnique({
      where: { id: validated.id, tenantId },
    });

    if (!existing) {
      return { success: false, error: "Miljøaspekt ikke funnet" };
    }

    const severity = validated.severity ?? existing.severity;
    const likelihood = validated.likelihood ?? existing.likelihood;
    const significanceScore = calculateSignificance(severity, likelihood);

    const aspect = await prisma.environmentalAspect.update({
      where: { id: validated.id, tenantId },
      data: {
        title: validated.title ?? existing.title,
        description:
          validated.description !== undefined
            ? sanitizeString(validated.description)
            : existing.description,
        process:
          validated.process !== undefined
            ? sanitizeString(validated.process)
            : existing.process,
        location:
          validated.location !== undefined
            ? sanitizeString(validated.location)
            : existing.location,
        category: validated.category ?? existing.category,
        impactType: validated.impactType ?? existing.impactType,
        severity,
        likelihood,
        significanceScore,
        legalRequirement:
          validated.legalRequirement !== undefined
            ? sanitizeString(validated.legalRequirement)
            : existing.legalRequirement,
        controlMeasures:
          validated.controlMeasures !== undefined
            ? sanitizeString(validated.controlMeasures)
            : existing.controlMeasures,
        monitoringMethod:
          validated.monitoringMethod !== undefined
            ? sanitizeString(validated.monitoringMethod)
            : existing.monitoringMethod,
        monitoringFrequency:
          validated.monitoringFrequency ?? existing.monitoringFrequency,
        ownerId:
          validated.ownerId === undefined ? existing.ownerId : validated.ownerId,
        goalId:
          validated.goalId === undefined ? existing.goalId : validated.goalId,
        status: validated.status ?? existing.status,
        nextReviewDate:
          validated.nextReviewDate === undefined
            ? existing.nextReviewDate
            : validated.nextReviewDate,
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: user.id,
        action: "ENVIRONMENTAL_ASPECT_UPDATED",
        resource: `EnvironmentalAspect:${aspect.id}`,
        metadata: JSON.stringify({
          title: aspect.title,
          status: aspect.status,
        }),
      },
    });

    revalidatePath("/dashboard/environment");
    revalidatePath(`/dashboard/environment/${aspect.id}`);
    return { success: true, data: aspect };
  } catch (error: any) {
    console.error("Update environmental aspect error:", error);
    return {
      success: false,
      error: error.message || "Kunne ikke oppdatere miljøaspekt",
    };
  }
}

export async function deleteEnvironmentalAspect(id: string) {
  try {
    const { user, tenantId } = await getSessionContext();
    const aspect = await prisma.environmentalAspect.findUnique({
      where: { id, tenantId },
    });

    if (!aspect) {
      return { success: false, error: "Miljøaspekt ikke funnet" };
    }

    await prisma.environmentalAspect.delete({
      where: { id, tenantId },
    });

    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: user.id,
        action: "ENVIRONMENTAL_ASPECT_DELETED",
        resource: `EnvironmentalAspect:${id}`,
        metadata: JSON.stringify({ title: aspect.title }),
      },
    });

    revalidatePath("/dashboard/environment");
    return { success: true };
  } catch (error: any) {
    console.error("Delete environmental aspect error:", error);
    return {
      success: false,
      error: error.message || "Kunne ikke slette miljøaspekt",
    };
  }
}

export async function createEnvironmentalMeasurement(input: any) {
  try {
    const { user, tenantId } = await getSessionContext();
    const normalizedInput = {
      ...input,
      tenantId,
      measuredValue: Number(input.measuredValue),
      limitValue: parseOptionalNumber(input.limitValue),
      targetValue: parseOptionalNumber(input.targetValue),
      measurementDate: parseOptionalDate(input.measurementDate) ?? new Date(),
    };
    const validated = createEnvironmentalMeasurementSchema.parse(
      normalizedInput
    );

    const status = getMeasurementStatus(
      validated.measuredValue,
      validated.limitValue,
      validated.targetValue
    );

    const measurement = await prisma.environmentalMeasurement.create({
      data: {
        tenantId: validated.tenantId,
        aspectId: validated.aspectId,
        parameter: validated.parameter,
        unit: sanitizeString(validated.unit),
        method: sanitizeString(validated.method),
        limitValue: validated.limitValue ?? null,
        targetValue: validated.targetValue ?? null,
        measuredValue: validated.measuredValue,
        measurementDate: validated.measurementDate,
        status,
        notes: sanitizeString(validated.notes),
        responsibleId: validated.responsibleId || null,
      },
    });

    await prisma.environmentalAspect.update({
      where: { id: validated.aspectId, tenantId },
      data: {
        lastMeasurementDate: validated.measurementDate,
        status:
          status === EnvironmentalMeasurementStatus.NON_COMPLIANT
            ? EnvironmentalAspectStatus.MONITORED
            : undefined,
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: user.id,
        action: "ENVIRONMENTAL_MEASUREMENT_RECORDED",
        resource: `EnvironmentalMeasurement:${measurement.id}`,
        metadata: JSON.stringify({
          parameter: measurement.parameter,
          value: measurement.measuredValue,
          status: measurement.status,
        }),
      },
    });

    revalidatePath("/dashboard/environment");
    revalidatePath(`/dashboard/environment/${validated.aspectId}`);
    return { success: true, data: measurement };
  } catch (error: any) {
    console.error("Create environmental measurement error:", error);
    return {
      success: false,
      error: error.message || "Kunne ikke registrere måling",
    };
  }
}

