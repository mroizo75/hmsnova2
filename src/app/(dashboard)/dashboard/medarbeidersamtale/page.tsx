import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/server-authorization";
import { MessageSquare } from "lucide-react";
import { fetchEmployeeReviews } from "@/server/queries/employee-review.queries";
import { EmployeeReviewsContent } from "@/features/employee-reviews/components/employee-reviews-content";

export default async function MedarbeidersamtalePage() {
  const auth = await getAuthContext();

  const canRead =
    auth.permissions.canReadOwnEmployeeReviews ||
    auth.permissions.canReadAllEmployeeReviews;

  if (!canRead) redirect("/dashboard");

  const initialData = await fetchEmployeeReviews();

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

      <EmployeeReviewsContent
        initialData={initialData}
        canCreate={auth.permissions.canCreateEmployeeReviews}
      />
    </div>
  );
}
