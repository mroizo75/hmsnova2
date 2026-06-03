"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getRequiredTenantContext } from "@/lib/tenant-context";
import {
  createFireDrillSchema,
  completeFireDrillSchema,
  evaluateFireDrillSchema,
  updateFireDrillSchema,
  type CreateFireDrillInput,
  type CompleteFireDrillInput,
  type EvaluateFireDrillInput,
  type UpdateFireDrillInput,
} from "@/features/fire-drills/schemas/fire-drill.schema";

const REVALIDATE_PATH = "/dashboard/fire-drills";

export async function createFireDrill(input: CreateFireDrillInput) {
  const { tenantId, userId } = await getRequiredTenantContext();

  const validated = createFireDrillSchema.parse(input);

  const drill = await prisma.fireDrill.create({
    data: {
      tenantId,
      title: validated.title,
      drillType: validated.drillType,
      isAnnounced: validated.isAnnounced,
      plannedDate: validated.plannedDate,
      location: validated.location,
      responsibleId: validated.responsibleId,
      objectives: validated.objectives,
      scenario: validated.scenario ?? null,
      riskAssessment: validated.riskAssessment ?? null,
      participantIds: validated.participantIds
        ? JSON.stringify(validated.participantIds)
        : null,
      status: "PLANNED",
    },
  });

  revalidatePath(REVALIDATE_PATH);
  return drill;
}

export async function updateFireDrill(id: string, input: UpdateFireDrillInput) {
  const { tenantId } = await getRequiredTenantContext();

  await assertOwnership(id, tenantId);

  const validated = updateFireDrillSchema.parse(input);

  const drill = await prisma.fireDrill.update({
    where: { id },
    data: {
      ...(validated.title !== undefined && { title: validated.title }),
      ...(validated.drillType !== undefined && { drillType: validated.drillType }),
      ...(validated.isAnnounced !== undefined && { isAnnounced: validated.isAnnounced }),
      ...(validated.plannedDate !== undefined && { plannedDate: validated.plannedDate }),
      ...(validated.location !== undefined && { location: validated.location }),
      ...(validated.responsibleId !== undefined && { responsibleId: validated.responsibleId }),
      ...(validated.objectives !== undefined && { objectives: validated.objectives }),
      ...(validated.scenario !== undefined && { scenario: validated.scenario }),
      ...(validated.riskAssessment !== undefined && { riskAssessment: validated.riskAssessment }),
      ...(validated.participantIds !== undefined && {
        participantIds: JSON.stringify(validated.participantIds),
      }),
      ...(validated.status !== undefined && { status: validated.status }),
    },
  });

  revalidatePath(REVALIDATE_PATH);
  revalidatePath(`${REVALIDATE_PATH}/${id}`);
  return drill;
}

// § 13: registrer gjennomføring med lovpålagte felt
export async function completeFireDrill(id: string, input: CompleteFireDrillInput) {
  const { tenantId } = await getRequiredTenantContext();

  await assertOwnership(id, tenantId);

  const validated = completeFireDrillSchema.parse(input);

  const drill = await prisma.fireDrill.update({
    where: { id },
    data: {
      status: "COMPLETED",
      completedAt: validated.completedAt,
      actualParticipantCount: validated.actualParticipantCount,
      evacuationTimeSeconds: validated.evacuationTimeSeconds ?? null,
      observations: validated.observations,
    },
  });

  revalidatePath(REVALIDATE_PATH);
  revalidatePath(`${REVALIDATE_PATH}/${id}`);
  return drill;
}

// § 12e + § 13: evaluer og dokumenter — fullfører lovkravet
export async function evaluateFireDrill(id: string, input: EvaluateFireDrillInput, evaluatedByUserId: string) {
  const { tenantId } = await getRequiredTenantContext();

  await assertOwnership(id, tenantId);

  const validated = evaluateFireDrillSchema.parse(input);

  const drill = await prisma.fireDrill.update({
    where: { id },
    data: {
      status: "EVALUATED",
      objectivesAchieved: validated.objectivesAchieved,
      evaluation: validated.evaluation,
      improvementPoints: validated.improvementPoints,
      procedureChangesNeeded: validated.procedureChangesNeeded,
      procedureChangesDesc: validated.procedureChangesDesc ?? null,
      evaluatedBy: evaluatedByUserId,
      evaluatedAt: new Date(),
    },
  });

  revalidatePath(REVALIDATE_PATH);
  revalidatePath(`${REVALIDATE_PATH}/${id}`);
  return drill;
}

export async function deleteFireDrill(id: string) {
  const { tenantId } = await getRequiredTenantContext();

  await assertOwnership(id, tenantId);

  await prisma.fireDrill.delete({ where: { id } });

  revalidatePath(REVALIDATE_PATH);
}

export async function getFireDrills() {
  const { tenantId } = await getRequiredTenantContext();

  return prisma.fireDrill.findMany({
    where: { tenantId },
    include: {
      measures: {
        select: { id: true, status: true },
      },
    },
    orderBy: { plannedDate: "desc" },
  });
}

export async function getFireDrillById(id: string) {
  const { tenantId } = await getRequiredTenantContext();

  return prisma.fireDrill.findFirst({
    where: { id, tenantId },
    include: {
      measures: {
        include: {
          responsible: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { dueAt: "asc" },
      },
    },
  });
}

async function assertOwnership(id: string, tenantId: string) {
  const drill = await prisma.fireDrill.findFirst({
    where: { id, tenantId },
    select: { id: true },
  });
  if (!drill) {
    throw new Error("Brannøvelse ikke funnet");
  }
}
