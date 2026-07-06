import { notFound, redirect } from "next/navigation";
import { getAuthContext } from "@/lib/server-authorization";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmployeeReviewDetail } from "@/features/employee-reviews/components/employee-review-detail";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function MedarbeidersamtaleDetaljPage({ params }: Props) {
  const { id } = await params;
  const auth = await getAuthContext();

  const canRead =
    auth.permissions.canReadOwnEmployeeReviews ||
    auth.permissions.canReadAllEmployeeReviews;

  if (!canRead) redirect("/dashboard");

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

  if (!review) notFound();

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/medarbeidersamtale">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Tilbake
          </Link>
        </Button>
      </div>

      <EmployeeReviewDetail
        review={JSON.parse(JSON.stringify(review))}
        currentUserId={auth.userId}
        canConduct={auth.permissions.canConductEmployeeReviews}
        canDelete={auth.permissions.canDeleteEmployeeReviews}
      />
    </div>
  );
}
