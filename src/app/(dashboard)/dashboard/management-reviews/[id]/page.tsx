import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import { getPermissions } from "@/lib/permissions";
import { fetchManagementReviewDetail } from "@/server/queries/management-review.queries";
import { ManagementReviewDetailContent } from "@/features/management-reviews/components/management-review-detail-content";

export default async function ManagementReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.role || !session.user.tenantId) {
    return notFound();
  }

  const permissions = getPermissions(session.user.role);

  if (!permissions.canReadManagementReviews) {
    redirect("/dashboard");
  }

  const initialData = await fetchManagementReviewDetail(id);

  if (!initialData) {
    return notFound();
  }

  return (
    <ManagementReviewDetailContent
      initialData={initialData}
      reviewId={id}
      canCreateManagementReviews={permissions.canCreateManagementReviews}
    />
  );
}
