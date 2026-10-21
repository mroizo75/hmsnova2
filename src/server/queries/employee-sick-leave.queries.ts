"use server";

import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/server-authorization";
import { templateKeyForMilestone } from "@/features/employee-reviews/lib/sick-leave-templates";

export type MySickLeaveMilestone = {
  id: string;
  milestone: string;
  status: string;
  dueDate: string;
  overdue: boolean;
  templateKey: string | null;
  reviewId: string | null;
};

export type MySickLeaveCase = {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  percentage: number;
  milestones: MySickLeaveMilestone[];
};

const SICK_TYPES = ["SICK_LEAVE", "SELF_CERTIFIED"] as const;

/**
 * Egen sykefraværsoppfølging for innlogget ansatt.
 * AML § 4-6: arbeidstaker skal være med på planen og dialogmøtet.
 * Ingen andres fravær, HR-notat eller diagnose (GDPR art. 9).
 */
export async function fetchMySickLeaveOverview(): Promise<MySickLeaveCase[]> {
  const auth = await getAuthContext();
  if (!auth) return [];

  const now = new Date();
  const absences = await prisma.absence.findMany({
    where: {
      tenantId: auth.tenantId,
      userId: auth.userId,
      status: "APPROVED",
      type: { in: [...SICK_TYPES] },
      OR: [
        { endDate: { gte: now } },
        { followUps: { some: { status: { in: ["NOT_STARTED", "IN_PROGRESS"] } } } },
      ],
    },
    orderBy: { startDate: "desc" },
    take: 5,
    select: {
      id: true,
      type: true,
      startDate: true,
      endDate: true,
      percentage: true,
      followUps: {
        orderBy: { dueDate: "asc" },
        select: { id: true, milestone: true, status: true, dueDate: true },
      },
    },
  });

  if (absences.length === 0) return [];

  const reviews = await prisma.employeeReview.findMany({
    where: {
      tenantId: auth.tenantId,
      employeeId: auth.userId,
      kind: "SYKEFRAVAER",
      status: { not: "AVBRUTT" },
      absenceId: { in: absences.map((absence) => absence.id) },
    },
    select: { id: true, absenceId: true, templateKey: true, scheduledDate: true },
    orderBy: { scheduledDate: "desc" },
  });

  return absences.map((absence) => ({
    id: absence.id,
    type: absence.type,
    startDate: absence.startDate.toISOString(),
    endDate: absence.endDate.toISOString(),
    percentage: absence.percentage,
    milestones: absence.followUps.map((followUp) => {
      const templateKey = templateKeyForMilestone(followUp.milestone);
      const review = reviews.find(
        (item) => item.absenceId === absence.id && item.templateKey === templateKey,
      );
      return {
        id: followUp.id,
        milestone: followUp.milestone,
        status: followUp.status,
        dueDate: followUp.dueDate.toISOString(),
        overdue:
          followUp.dueDate < now &&
          followUp.status !== "COMPLETED" &&
          followUp.status !== "SKIPPED",
        templateKey,
        reviewId: review?.id ?? null,
      };
    }),
  }));
}
