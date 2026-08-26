"use server";

import { prisma } from "@/lib/db";
import { getActionContext } from "@/server/actions/action-context";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const confirmRequirementSchema = z.object({
  requirementId: z.string().min(1),
  manualStatus: z.enum(["COMPLIANT", "PARTIAL"]),
  statusNote: z.string().optional(),
  documentUrl: z.string().optional(),
  documentName: z.string().optional(),
});

export async function confirmRequirement(
  input: z.infer<typeof confirmRequirementSchema>,
) {
  const { user, tenantId } = await getActionContext();
  const data = confirmRequirementSchema.parse(input);

  const override = await prisma.tenantRequirementOverride.upsert({
    where: {
      tenantId_regulatoryRequirementId: {
        tenantId,
        regulatoryRequirementId: data.requirementId,
      },
    },
    create: {
      tenantId,
      regulatoryRequirementId: data.requirementId,
      manualStatus: data.manualStatus,
      statusNote: data.statusNote ?? null,
      documentUrl: data.documentUrl ?? null,
      documentName: data.documentName ?? null,
      verifiedAt: new Date(),
      verifiedById: user.id,
    },
    update: {
      manualStatus: data.manualStatus,
      statusNote: data.statusNote ?? null,
      documentUrl: data.documentUrl ?? null,
      documentName: data.documentName ?? null,
      verifiedAt: new Date(),
      verifiedById: user.id,
    },
  });

  revalidatePath("/dashboard/juridisk-register");
  return { success: true, data: override };
}

const markNotApplicableSchema = z.object({
  requirementId: z.string().min(1),
  statusNote: z.string().min(5, "Begrunnelse er påkrevd (minst 5 tegn)"),
});

export async function markRequirementNotApplicable(
  input: z.infer<typeof markNotApplicableSchema>,
) {
  const { user, tenantId } = await getActionContext();
  const data = markNotApplicableSchema.parse(input);

  const override = await prisma.tenantRequirementOverride.upsert({
    where: {
      tenantId_regulatoryRequirementId: {
        tenantId,
        regulatoryRequirementId: data.requirementId,
      },
    },
    create: {
      tenantId,
      regulatoryRequirementId: data.requirementId,
      manualStatus: "NOT_APPLICABLE",
      statusNote: data.statusNote,
      verifiedAt: new Date(),
      verifiedById: user.id,
    },
    update: {
      manualStatus: "NOT_APPLICABLE",
      statusNote: data.statusNote,
      verifiedAt: new Date(),
      verifiedById: user.id,
    },
  });

  revalidatePath("/dashboard/juridisk-register");
  return { success: true, data: override };
}

const createCustomRequirementSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  legalBasis: z.string().optional(),
  manualStatus: z.enum(["COMPLIANT", "PARTIAL", "MISSING"]).default("MISSING"),
});

export async function createCustomRequirement(
  input: z.infer<typeof createCustomRequirementSchema>,
) {
  const { user, tenantId, role } = await getActionContext();

  if (!["ADMIN", "HMS", "LEDER"].includes(role)) {
    throw new Error("Kun admin/HMS-ansvarlig kan opprette egne krav");
  }

  const data = createCustomRequirementSchema.parse(input);

  const override = await prisma.tenantRequirementOverride.create({
    data: {
      tenantId,
      isCustomRequirement: true,
      customTitle: data.title,
      customDescription: data.description ?? null,
      customLegalBasis: data.legalBasis ?? null,
      manualStatus: data.manualStatus,
      verifiedAt: new Date(),
      verifiedById: user.id,
    },
  });

  revalidatePath("/dashboard/juridisk-register");
  return { success: true, data: override };
}

export async function removeOverride(requirementId: string) {
  const { tenantId } = await getActionContext();

  await prisma.tenantRequirementOverride.deleteMany({
    where: { tenantId, regulatoryRequirementId: requirementId },
  });

  revalidatePath("/dashboard/juridisk-register");
  return { success: true };
}

export async function removeCustomRequirement(overrideId: string) {
  const { tenantId, role } = await getActionContext();

  if (!["ADMIN", "HMS", "LEDER"].includes(role)) {
    throw new Error("Kun admin/HMS-ansvarlig kan slette egne krav");
  }

  await prisma.tenantRequirementOverride.deleteMany({
    where: { id: overrideId, tenantId, isCustomRequirement: true },
  });

  revalidatePath("/dashboard/juridisk-register");
  return { success: true };
}

export async function getOverridesForTenant() {
  const { tenantId } = await getActionContext();

  return prisma.tenantRequirementOverride.findMany({
    where: { tenantId },
    include: { verifiedBy: { select: { name: true, email: true } } },
  });
}
