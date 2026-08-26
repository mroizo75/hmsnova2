import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import { getPermissions } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHelpDialog } from "@/components/dashboard/page-help-dialog";
import { helpContent } from "@/lib/help-content";
import { fetchManagementReviews } from "@/server/queries/management-review.queries";
import { ManagementReviewsContent } from "@/features/management-reviews/components/management-reviews-content";

export default async function ManagementReviewsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.role || !session.user.tenantId) {
    return notFound();
  }

  const permissions = getPermissions(session.user.role);

  if (!permissions.canReadManagementReviews) {
    redirect("/dashboard");
  }

  const initialData = await fetchManagementReviews();

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div className="flex min-w-0 items-start gap-3">
          <div>
            <h1 className="text-3xl font-bold">Ledelsens Gjennomgang</h1>
            <p className="text-muted-foreground mt-1">
              Årlig/periodisk gjennomgang av HMS-systemet
            </p>
          </div>
          <PageHelpDialog content={helpContent["management-reviews"]} />
        </div>
        {permissions.canCreateManagementReviews && (
          <Link href="/dashboard/management-reviews/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Ny gjennomgang
            </Button>
          </Link>
        )}
      </div>

      <ManagementReviewsContent
        initialData={initialData}
        canCreateManagementReviews={permissions.canCreateManagementReviews}
      />
    </div>
  );
}
