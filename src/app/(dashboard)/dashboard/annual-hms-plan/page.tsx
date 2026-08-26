import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getPermissions } from "@/lib/permissions";
import { PageHelpDialog } from "@/components/dashboard/page-help-dialog";
import { helpContent } from "@/lib/help-content";
import { fetchAnnualHmsPlan } from "@/server/queries/annual-hms-plan.queries";
import { AnnualHmsPlanContent } from "@/features/annual-hms-plan/components/annual-hms-plan-content";

export default async function AnnualHmsPlanPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.tenantId || !session.user.role) {
    redirect("/login");
  }

  const permissions = getPermissions(session.user.role);

  if (!permissions.canReadManagementReviews && !permissions.canReadDocuments) {
    redirect("/dashboard");
  }

  const initialData = await fetchAnnualHmsPlan();
  if (!initialData) {
    redirect("/dashboard");
  }

  const canEdit =
    permissions.canCreateManagementReviews ||
    permissions.canUpdateSettings ||
    permissions.canApproveManagementReviews;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div className="flex min-w-0 items-start gap-3">
          <div>
            <h1 className="text-3xl font-bold">Årlig HMS-plan</h1>
            <p className="text-muted-foreground mt-1">
              Steg-for-steg sjekkliste for årets HMS-krav. Huk av når hvert steg er fullført – når listen er komplett,
              har dere dokumentert at kravene er oppfylt.
            </p>
          </div>
          <PageHelpDialog content={helpContent["annual-hms-plan"]} />
        </div>
      </div>

      <AnnualHmsPlanContent
        initialData={initialData}
        tenantId={session.user.tenantId}
        userId={session.user.id ?? null}
        canEdit={canEdit}
      />
    </div>
  );
}
