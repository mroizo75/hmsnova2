import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/server-authorization";
import { MessageSquare } from "lucide-react";
import { fetchEmployeeReviews } from "@/server/queries/employee-review.queries";
import { EmployeeReviewsContent } from "@/features/employee-reviews/components/employee-reviews-content";
import { HrWorkspaceNav } from "@/features/hr/components/hr-workspace-nav";

export default async function MedarbeidersamtalePage() {
  const auth = await getAuthContext();

  const canRead =
    auth.permissions.canReadOwnEmployeeReviews ||
    auth.permissions.canReadAllEmployeeReviews;

  if (!canRead) redirect("/dashboard");

  const initialData = await fetchEmployeeReviews();

  return (
    <div className="space-y-6 p-6">
      <HrWorkspaceNav />
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-primary" />
          Samtaler
        </h1>
        <p className="text-muted-foreground mt-1">
          Medarbeidersamtale etter AML § 4-2 og sykefraværssamtale etter AML § 4-6
        </p>
      </div>

      <EmployeeReviewsContent
        initialData={initialData}
        canCreate={auth.permissions.canCreateEmployeeReviews}
      />
    </div>
  );
}
