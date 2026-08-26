import { redirect } from "next/navigation";
import { FileCheck2 } from "lucide-react";
import { getCurrentUser } from "@/lib/server-action";
import { getPermissions } from "@/lib/permissions";
import { helpContent } from "@/lib/help-content";
import { PageHelpDialog } from "@/components/dashboard/page-help-dialog";
import { fetchSamsvarserklaringer } from "@/server/queries/samsvarserklaringer.queries";
import { SamsvarserklaringerContent } from "@/features/samsvarserklaringer/components/samsvarserklaringer-content";

export default async function ComplianceDashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const membership = user.tenants.at(0);
  if (!membership) {
    return <div className="p-6">Ingen tilgang til virksomhet.</div>;
  }

  const permissions = getPermissions(membership.role);
  if (!permissions.canReadDocuments) {
    redirect("/dashboard");
  }

  const initialData = await fetchSamsvarserklaringer();
  if (!initialData) {
    return (
      <div className="p-6">
        <p className="text-destructive">Kunne ikke hente samsvarserklæringer.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 sm:text-3xl">
            <FileCheck2 className="h-7 w-7 text-blue-600" />
            Samsvarserklæringer
          </h1>
          <p className="text-muted-foreground mt-1 max-w-2xl">
            Samle samsvarserklæringer fra elektro, rørlegger, ventilasjon og andre fag. Synlig for alle ansatte.
          </p>
        </div>
        {helpContent.electrical && <PageHelpDialog content={helpContent.electrical} />}
      </div>

      <SamsvarserklaringerContent initialData={initialData} />
    </div>
  );
}
