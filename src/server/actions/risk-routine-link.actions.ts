"use server";

import { prisma } from "@/lib/db";
import { getActionContext } from "./action-context";
import { revalidatePath } from "next/cache";

export async function linkRoutineToRisk(input: {
  riskId: string;
  routineId: string;
}) {
  const { tenantId } = await getActionContext();

  const risk = await prisma.risk.findFirst({
    where: { id: input.riskId, tenantId },
  });
  if (!risk) {
    return { success: false, error: "Risiko ikke funnet" };
  }

  const routine = await prisma.routine.findFirst({
    where: { id: input.routineId, tenantId },
  });
  if (!routine) {
    return { success: false, error: "Rutine ikke funnet" };
  }

  try {
    const link = await prisma.riskRoutineLink.create({
      data: {
        riskId: input.riskId,
        routineId: input.routineId,
      },
    });

    revalidatePath(`/dashboard/risks/${input.riskId}`);
    revalidatePath(`/dashboard/rutiner/${input.routineId}`);
    return { success: true, data: link };
  } catch (error: any) {
    if (error.code === "P2002") {
      return { success: false, error: "Denne koblingen finnes allerede" };
    }
    return { success: false, error: error.message || "Kunne ikke opprette kobling" };
  }
}

export async function unlinkRoutineFromRisk(input: {
  riskId: string;
  routineId: string;
}) {
  const { tenantId } = await getActionContext();

  const risk = await prisma.risk.findFirst({
    where: { id: input.riskId, tenantId },
  });
  if (!risk) {
    return { success: false, error: "Risiko ikke funnet" };
  }

  try {
    await prisma.riskRoutineLink.deleteMany({
      where: {
        riskId: input.riskId,
        routineId: input.routineId,
      },
    });

    revalidatePath(`/dashboard/risks/${input.riskId}`);
    revalidatePath(`/dashboard/rutiner/${input.routineId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Kunne ikke fjerne kobling" };
  }
}

export async function getLinkedRoutinesForRisk(riskId: string) {
  const { tenantId } = await getActionContext();

  const links = await prisma.riskRoutineLink.findMany({
    where: {
      riskId,
      risk: { tenantId },
    },
    include: {
      routine: {
        select: {
          id: true,
          title: true,
          status: true,
          category: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return links.map((l) => l.routine);
}

export async function getLinkedRisksForRoutine(routineId: string) {
  const { tenantId } = await getActionContext();

  const links = await prisma.riskRoutineLink.findMany({
    where: {
      routineId,
      routine: { tenantId },
    },
    include: {
      risk: {
        select: {
          id: true,
          title: true,
          score: true,
          status: true,
          category: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return links.map((l) => l.risk);
}
