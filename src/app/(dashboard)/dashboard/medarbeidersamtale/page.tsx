import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/server-authorization";
import { prisma } from "@/lib/db";
import { MessageSquare } from "lucide-react";
import { EmployeeReviewList } from "@/features/employee-reviews/components/employee-review-list";

export default async function MedarbeidersamtalePage() {
  const auth = await getAuthContext();

  const canRead =
    auth.permissions.canReadOwnEmployeeReviews ||
    auth.permissions.canReadAllEmployeeReviews;

  if (!canRead) redirect("/dashboard");

  const { tenantId, userId } = auth;

  const where = auth.permissions.canReadAllEmployeeReviews
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

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-primary" />
          Medarbeidersamtaler
        </h1>
        <p className="text-muted-foreground mt-1">
          Strukturerte samtaler mellom leder og ansatt – AML § 4-2 og § 4-3
        </p>
      </div>

      <EmployeeReviewList
        reviews={JSON.parse(JSON.stringify(reviews))}
        canCreate={auth.permissions.canCreateEmployeeReviews}
      />
    </div>
  );
}
