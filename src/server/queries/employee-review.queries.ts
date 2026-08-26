"use server";

import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/server-authorization";

export async function fetchEmployeeReviews() {
  const auth = await getAuthContext();
  const { tenantId, userId, permissions } = auth;

  const canReadAll = permissions.canReadAllEmployeeReviews;

  const where = canReadAll
    ? { tenantId }
    : { tenantId, OR: [{ employeeId: userId }, { reviewerId: userId }] };

  const reviews = await prisma.employeeReview.findMany({
    where,
    include: {
      employee: { select: { id: true, name: true, email: true, image: true } },
      reviewer: { select: { id: true, name: true, email: true, image: true } },
      _count: { select: { goals: true, actions: true } },
    },
    orderBy: { scheduledDate: "desc" },
  });

  return JSON.parse(JSON.stringify(reviews));
}

export async function fetchEmployeeReviewDetail(id: string) {
  const auth = await getAuthContext();

  const review = await prisma.employeeReview.findFirst({
    where: {
      id,
      tenantId: auth.tenantId,
      ...(auth.permissions.canReadAllEmployeeReviews
        ? {}
        : {
            OR: [
              { employeeId: auth.userId },
              { reviewerId: auth.userId },
            ],
          }),
    },
    include: {
      employee: { select: { id: true, name: true, email: true, image: true } },
      reviewer: { select: { id: true, name: true, email: true, image: true } },
      goals: { orderBy: { createdAt: "asc" } },
      actions: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!review) return null;

  return JSON.parse(JSON.stringify(review));
}
