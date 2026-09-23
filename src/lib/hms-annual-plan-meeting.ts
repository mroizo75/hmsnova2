import { prisma } from "@/lib/db";

const AMU_STEP_KEY = "meetings_amu_vo";

export function isAmuOrSafetyRepMeeting(type: string): boolean {
  return type === "AMU" || type === "VO";
}

/** AML § 7-1 og § 7-2: gjennomført AMU- eller verneombudsmøte krysser av årshjulet. */
export async function completeAnnualPlanForMeeting(input: {
  tenantId: string;
  meetingTitle: string;
  meetingType: string;
  scheduledDate: Date;
  completedByUserId: string;
}) {
  if (!isAmuOrSafetyRepMeeting(input.meetingType)) return;

  const year = input.scheduledDate.getFullYear();
  const existing = await prisma.hmsAnnualPlanCompletion.findUnique({
    where: {
      tenantId_year_stepKey: {
        tenantId: input.tenantId,
        year,
        stepKey: AMU_STEP_KEY,
      },
    },
    select: { id: true },
  });
  if (existing) return;

  const typeLabel = input.meetingType === "AMU" ? "AMU" : "verneombud";
  await prisma.hmsAnnualPlanCompletion.create({
    data: {
      tenantId: input.tenantId,
      year,
      stepKey: AMU_STEP_KEY,
      completedByUserId: input.completedByUserId,
      note: `Krysset av fordi ${typeLabel}-møtet «${input.meetingTitle}» er gjennomført.`,
    },
  });
}
