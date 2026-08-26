"use server";

import { db } from "@/lib/db";
import { getAuthContext } from "@/lib/server-authorization";

export async function fetchManagementReviews() {
  const auth = await getAuthContext();
  const { tenantId } = auth;

  const reviews = await db.managementReview.findMany({
    where: { tenantId },
    orderBy: { reviewDate: "desc" },
  });

  return JSON.parse(JSON.stringify(reviews));
}

export async function fetchManagementReviewDetail(id: string) {
  const auth = await getAuthContext();
  const { tenantId } = auth;

  const review = await db.managementReview.findFirst({
    where: { id, tenantId },
  });

  if (!review) return null;

  const conductedByUser = review.conductedBy
    ? await db.user.findUnique({
        where: { id: review.conductedBy },
        select: { name: true, email: true },
      })
    : null;

  const approvedByUser = review.approvedBy
    ? await db.user.findUnique({
        where: { id: review.approvedBy },
        select: { name: true, email: true },
      })
    : null;

  const reviewDate = new Date(review.reviewDate);
  const documentsToReview = await db.document.findMany({
    where: {
      tenantId,
      nextReviewDate: {
        lte: reviewDate,
      },
    },
    orderBy: {
      nextReviewDate: "asc",
    },
  });

  return JSON.parse(JSON.stringify({
    ...review,
    conductedByName: conductedByUser?.name || conductedByUser?.email || "Ukjent",
    approvedByName: approvedByUser?.name || approvedByUser?.email || null,
    documentsToReview,
  }));
}
