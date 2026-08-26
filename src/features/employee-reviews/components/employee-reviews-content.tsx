"use client";

import { useQuery } from "@tanstack/react-query";
import { EmployeeReviewList } from "@/features/employee-reviews/components/employee-review-list";
import { fetchEmployeeReviews } from "@/server/queries/employee-review.queries";

type ReviewsData = Awaited<ReturnType<typeof fetchEmployeeReviews>>;

interface EmployeeReviewsContentProps {
  initialData: ReviewsData;
  canCreate: boolean;
}

export function EmployeeReviewsContent({ initialData, canCreate }: EmployeeReviewsContentProps) {
  const { data: reviews } = useQuery({
    queryKey: ["employee-reviews"],
    queryFn: () => fetchEmployeeReviews(),
    initialData,
  });

  return (
    <EmployeeReviewList
      reviews={reviews}
      canCreate={canCreate}
    />
  );
}
