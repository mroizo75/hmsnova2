import { getCurrentUser } from "@/lib/server-action";
import { redirect } from "next/navigation";
import { getPermissions } from "@/lib/permissions";
import { Building2 } from "lucide-react";
import { fetchOrgChartNodes } from "@/server/queries/org-chart.queries";
import { OrgChartContent } from "@/features/organization/components/org-chart-content";

export default async function OrgChartPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const userTenant = user.tenants.at(0);
  if (!userTenant) {
    return <div>Ingen tilgang til bedrift</div>;
  }

  const permissions = getPermissions(userTenant.role);
  const initialData = await fetchOrgChartNodes();

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-2xl font-bold sm:gap-3 sm:text-3xl">
            <Building2 className="h-6 w-6 shrink-0 text-blue-600 sm:h-8 sm:w-8" />
            Organisasjonskart
          </h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            Hierarkisk oversikt over roller, ansvar og organisering (AML § 3-1)
          </p>
        </div>
      </div>

      <OrgChartContent initialData={initialData} canManage={permissions.canManageUsers} />
    </div>
  );
}
