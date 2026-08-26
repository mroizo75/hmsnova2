"use client";

import { useQuery } from "@tanstack/react-query";
import { EmployeeReviewDetail } from "@/features/employee-reviews/components/employee-review-detail";
import { fetchEmployeeReviewDetail } from "@/server/queries/employee-review.queries";

type ReviewDetailData = NonNullable<Awaited<ReturnType<typeof fetchEmployeeReviewDetail>>>;

interface EmployeeReviewDetailContentProps {
  initialData: ReviewDetailData;
  currentUserId: string;
  canConduct: boolean;
  canDelete: boolean;
}

export function EmployeeReviewDetailContent({
  initialData,
  currentUserId,
  canConduct,
  canDelete,
}: EmployeeReviewDetailContentProps) {
  const { data: review } = useQuery({
    queryKey: ["employee-reviews", initialData.id],
    queryFn: () => fetchEmployeeReviewDetail(initialData.id),
    initialData,
  });

  if (!review) return null;

  return (
    <EmployeeReviewDetail
      review={review}
      currentUserId={currentUserId}
      canConduct={canConduct}
      canDelete={canDelete}
    />
  );
}
