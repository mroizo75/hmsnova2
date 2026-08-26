"use server";

import { prisma } from "@/lib/db";
import { getRequiredTenantContext } from "@/lib/tenant-context";

export async function fetchFeedbackData() {
  const { tenantId } = await getRequiredTenantContext();

  const [feedbacks, users] = await Promise.all([
    prisma.customerFeedback.findMany({
      where: { tenantId },
      include: {
        recordedBy: { select: { name: true, email: true } },
        followUpOwner: { select: { name: true, email: true } },
      },
      orderBy: { recordedAt: "desc" },
    }),
    prisma.user.findMany({
      where: {
        tenants: {
          some: { tenantId },
        },
      },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const positiveCount = feedbacks.filter((f) => f.sentiment === "POSITIVE").length;
  const followUpCount = feedbacks.filter((f) => f.followUpStatus === "FOLLOW_UP").length;
  const sharedCount = feedbacks.filter(
    (f) => f.followUpStatus === "ACKNOWLEDGED" || f.followUpStatus === "SHARED",
  ).length;
  const ratings = feedbacks
    .map((f) => f.rating)
    .filter((value): value is number => typeof value === "number");
  const averageRating =
    ratings.length > 0
      ? ratings.reduce((sum, current) => sum + current, 0) / ratings.length
      : null;

  return JSON.parse(JSON.stringify({
    feedbacks,
    users,
    positiveCount,
    followUpCount,
    sharedCount,
    averageRating,
  }));
}
