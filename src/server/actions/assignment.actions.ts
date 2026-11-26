"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/server-authorization";
import {
  competenceItemsFromRecords,
  deploymentBlocks,
  inductionIsComplete,
  parseInduction,
} from "@/features/assignments/lib/deployment-gate";
import {
  createAssignmentSchema,
  updateAssignmentSchema,
  type CreateAssignmentInput,
  type UpdateAssignmentInput,
} from "@/features/assignments/schemas/assignment.schema";

function fail(message: string, code = "ASSIGNMENT_ERROR") {
  return { success: false as const, error: message, code };
}

function formatActionError(error: unknown, fallback: string): string {
  if (error instanceof ZodError) {
    return error.issues.map((issue) => issue.message).join(". ");
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

function blankToNull(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function dateOrNull(value: string | undefined): Date | null {
  if (!value) return null;
  return new Date(`${value}T00:00:00.000Z`);
}

async function loadCompetenceItems(input: {
  tenantId: string;
  userId: string;
  competenceProfileId: string | null;
}) {
  if (!input.competenceProfileId) return [];
  const requirements = await prisma.competenceRequirement.findMany({
    where: { profileId: input.competenceProfileId, profile: { tenantId: input.tenantId } },
    select: { courseKey: true, requiredLevel: true },
  });
  if (requirements.length === 0) return [];
  const trainings = await prisma.training.findMany({
    where: {
      tenantId: input.tenantId,
      userId: input.userId,
      courseKey: { in: requirements.map((item) => item.courseKey) },
    },
    select: { courseKey: true, completedAt: true, validUntil: true },
  });
  return competenceItemsFromRecords(requirements, trainings, new Date());
}

export async function createAssignment(input: CreateAssignmentInput) {
  const auth = await getAuthContext();
  if (!auth?.permissions.canReadIncidents || !auth.permissions.canCreateIncidents) {
    return fail("Du har ikke tilgang til å opprette oppdrag", "FORBIDDEN");
  }

  try {
    const validated = createAssignmentSchema.parse(input);
    const member = await prisma.userTenant.findUnique({
      where: { userId_tenantId: { userId: validated.userId, tenantId: auth.tenantId } },
      select: { userId: true },
    });
    if (!member) return fail("Medarbeideren er ikke i virksomheten", "USER_NOT_FOUND");

    if (validated.projectId) {
      const project = await prisma.project.findFirst({
        where: { id: validated.projectId, tenantId: auth.tenantId },
        select: { id: true },
      });
      if (!project) return fail("Prosjektet finnes ikke", "PROJECT_NOT_FOUND");
    }

    if (validated.competenceProfileId) {
      const profile = await prisma.competenceProfile.findFirst({
        where: { id: validated.competenceProfileId, tenantId: auth.tenantId },
        select: { id: true },
      });
      if (!profile) return fail("Kompetanseprofilen finnes ikke", "PROFILE_NOT_FOUND");
    }

    const competenceItems = await loadCompetenceItems({
      tenantId: auth.tenantId,
      userId: validated.userId,
      competenceProfileId: validated.competenceProfileId || null,
    });
    const blocks = deploymentBlocks({
      status: validated.status,
      competenceItems,
      induction: validated.induction,
    });
    if (blocks[0]) return fail(blocks[0].message, blocks[0].code);

    let workplaceId = validated.clientWorkplaceId || "";
    if (!workplaceId && validated.newWorkplace) {
      const created = await prisma.clientWorkplace.create({
        data: {
          tenantId: auth.tenantId,
          name: validated.newWorkplace.name.trim(),
          orgNumber: blankToNull(validated.newWorkplace.orgNumber),
          contactName: blankToNull(validated.newWorkplace.contactName),
          contactPhone: blankToNull(validated.newWorkplace.contactPhone),
          contactEmail: blankToNull(validated.newWorkplace.contactEmail),
          address: blankToNull(validated.newWorkplace.address),
          industry: blankToNull(validated.newWorkplace.industry),
          siteLeaderName: blankToNull(validated.newWorkplace.siteLeaderName),
        },
      });
      workplaceId = created.id;
    }

    const existingWorkplace = await prisma.clientWorkplace.findFirst({
      where: { id: workplaceId, tenantId: auth.tenantId },
      select: { id: true },
    });
    if (!existingWorkplace) return fail("Innleier ble ikke funnet", "WORKPLACE_NOT_FOUND");

    const inductionComplete = inductionIsComplete(validated.induction);
    const assignment = await prisma.assignment.create({
      data: {
        tenantId: auth.tenantId,
        userId: validated.userId,
        projectId: validated.projectId || null,
        clientWorkplaceId: existingWorkplace.id,
        competenceProfileId: validated.competenceProfileId || null,
        roleTitle: blankToNull(validated.roleTitle),
        status: validated.status,
        startDate: dateOrNull(validated.startDate) ?? new Date(),
        endDate: dateOrNull(validated.endDate),
        induction: validated.induction,
        inductionCompletedAt: inductionComplete ? new Date() : null,
        coordinationNoted: validated.coordinationNoted,
        coordinationAt: dateOrNull(validated.coordinationAt),
        coordinationContact: blankToNull(validated.coordinationContact),
        clientRiskReceived: validated.clientRiskReceived,
        notes: blankToNull(validated.notes),
        createdById: auth.userId,
      },
      select: { id: true },
    });

    revalidatePath("/dashboard/oppdrag");
    return { success: true as const, data: assignment };
  } catch (error: unknown) {
    return fail(formatActionError(error, "Kunne ikke opprette oppdrag"));
  }
}

export async function updateAssignment(input: UpdateAssignmentInput) {
  const auth = await getAuthContext();
  if (!auth?.permissions.canReadIncidents || !auth.permissions.canCreateIncidents) {
    return fail("Du har ikke tilgang til å endre oppdrag", "FORBIDDEN");
  }

  try {
    const validated = updateAssignmentSchema.parse(input);
    const existing = await prisma.assignment.findFirst({
      where: { id: validated.id, tenantId: auth.tenantId },
      select: { id: true, userId: true, inductionCompletedAt: true },
    });
    if (!existing) return fail("Oppdraget ble ikke funnet", "NOT_FOUND");

    if (validated.competenceProfileId) {
      const profile = await prisma.competenceProfile.findFirst({
        where: { id: validated.competenceProfileId, tenantId: auth.tenantId },
        select: { id: true },
      });
      if (!profile) return fail("Kompetanseprofilen finnes ikke", "PROFILE_NOT_FOUND");
    }

    const competenceItems = await loadCompetenceItems({
      tenantId: auth.tenantId,
      userId: existing.userId,
      competenceProfileId: validated.competenceProfileId || null,
    });
    const blocks = deploymentBlocks({
      status: validated.status,
      competenceItems,
      induction: validated.induction,
    });
    if (blocks[0]) return fail(blocks[0].message, blocks[0].code);

    const inductionComplete = inductionIsComplete(validated.induction);
    await prisma.assignment.update({
      where: { id: existing.id },
      data: {
        status: validated.status,
        roleTitle: blankToNull(validated.roleTitle),
        competenceProfileId: validated.competenceProfileId || null,
        endDate: dateOrNull(validated.endDate),
        induction: validated.induction,
        inductionCompletedAt: inductionComplete ? (existing.inductionCompletedAt ?? new Date()) : null,
        coordinationNoted: validated.coordinationNoted,
        coordinationAt: dateOrNull(validated.coordinationAt),
        coordinationContact: blankToNull(validated.coordinationContact),
        clientRiskReceived: validated.clientRiskReceived,
        notes: blankToNull(validated.notes),
      },
    });

    revalidatePath("/dashboard/oppdrag");
    revalidatePath(`/dashboard/oppdrag/${existing.id}`);
    return { success: true as const, data: { id: existing.id } };
  } catch (error: unknown) {
    return fail(formatActionError(error, "Kunne ikke oppdatere oppdrag"));
  }
}
