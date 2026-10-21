import type { FollowUpMilestone } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  confirmationCoversMilestone,
  followUpRequiresEmployeeConfirmation,
  milestonesAwaitingEmployeeConfirmation,
  templateKeyForMilestone,
} from "@/features/employee-reviews/lib/sick-leave-templates";

const OPEN_FOLLOW_UP = ["NOT_STARTED", "IN_PROGRESS"] as const;

/**
 * AML § 4-6: planen og dialogmøtet lages i samråd med arbeidstaker.
 * Bekreftelsen ligger på sykefraværssamtalen. Ett signert dokument lukker ett åpent punkt.
 */
export async function employeeHasConfirmedFollowUp(input: {
  tenantId: string;
  absenceId: string;
  milestone: string;
  followUpId: string;
  dueDate: Date;
}): Promise<boolean> {
  if (!followUpRequiresEmployeeConfirmation(input.milestone)) return true;

  const templateKey = templateKeyForMilestone(input.milestone);
  const milestones = milestonesAwaitingEmployeeConfirmation(templateKey);
  if (!templateKey || milestones.length === 0) return true;

  const [signedConversations, completedSiblings, earlierOpen] = await Promise.all([
    prisma.employeeReview.count({
      where: {
        tenantId: input.tenantId,
        absenceId: input.absenceId,
        kind: "SYKEFRAVAER",
        templateKey,
        status: { not: "AVBRUTT" },
        signertAvAnsatt: true,
      },
    }),
    prisma.sickLeaveFollowUp.count({
      where: {
        tenantId: input.tenantId,
        absenceId: input.absenceId,
        milestone: { in: milestones as FollowUpMilestone[] },
        status: "COMPLETED",
        id: { not: input.followUpId },
      },
    }),
    prisma.sickLeaveFollowUp.count({
      where: {
        tenantId: input.tenantId,
        absenceId: input.absenceId,
        milestone: { in: milestones as FollowUpMilestone[] },
        status: { in: [...OPEN_FOLLOW_UP] },
        id: { not: input.followUpId },
        dueDate: { lt: input.dueDate },
      },
    }),
  ]);

  if (earlierOpen > 0) return false;
  return confirmationCoversMilestone(signedConversations, completedSiblings);
}

export async function closeFollowUpAfterEmployeeConfirmation(input: {
  tenantId: string;
  absenceId: string;
  templateKey: string | null;
  confirmedById: string;
}): Promise<string | null> {
  const milestones = milestonesAwaitingEmployeeConfirmation(input.templateKey);
  if (!input.templateKey || milestones.length === 0) return null;

  const open = await prisma.sickLeaveFollowUp.findFirst({
    where: {
      tenantId: input.tenantId,
      absenceId: input.absenceId,
      milestone: { in: milestones as FollowUpMilestone[] },
      status: { in: [...OPEN_FOLLOW_UP] },
    },
    orderBy: { dueDate: "asc" },
  });
  if (!open) return null;

  const covered = await employeeHasConfirmedFollowUp({
    tenantId: input.tenantId,
    absenceId: input.absenceId,
    milestone: open.milestone,
    followUpId: open.id,
    dueDate: open.dueDate,
  });
  if (!covered) return null;

  await prisma.sickLeaveFollowUp.update({
    where: { id: open.id },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
      completedById: input.confirmedById,
    },
  });

  return open.id;
}
