"use client";

import { useQuery } from "@tanstack/react-query";
import { FeedbackSummary } from "@/features/feedback/components/feedback-summary";
import { FeedbackList } from "@/features/feedback/components/feedback-list";
import { fetchFeedbackData } from "@/server/queries/feedback.queries";

type FeedbackData = Awaited<ReturnType<typeof fetchFeedbackData>>;

interface FeedbackContentProps {
  initialData: FeedbackData;
}

export function FeedbackContent({ initialData }: FeedbackContentProps) {
  const { data } = useQuery({
    queryKey: ["feedback"],
    queryFn: () => fetchFeedbackData(),
    initialData,
  });

  return (
    <>
      <FeedbackSummary
        total={data.feedbacks.length}
        positiveCount={data.positiveCount}
        averageRating={data.averageRating}
        followUpCount={data.followUpCount}
        sharedCount={data.sharedCount}
      />
      <FeedbackList feedbacks={data.feedbacks} users={data.users} />
    </>
  );
}
