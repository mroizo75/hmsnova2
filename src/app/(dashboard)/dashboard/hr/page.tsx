import { redirect } from "next/navigation";
import { HeartHandshake } from "lucide-react";
import { getAuthContext } from "@/lib/server-authorization";
import { getVisibleNavItems } from "@/lib/permissions";
import { fetchHrOverview } from "@/server/queries/hr-overview.queries";
import { HrWorkspaceNav } from "@/features/hr/components/hr-workspace-nav";
import { HrOverviewContent } from "@/features/hr/components/hr-overview-content";

export default async function HrOverviewPage() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");
  if (!getVisibleNavItems(auth.role).hr) redirect("/dashboard");

  const overview = await fetchHrOverview();
  if (!overview) redirect("/dashboard");

  return (
    <div className="space-y-6 p-6">
      <HrWorkspaceNav />
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <HeartHandshake className="h-6 w-6 text-primary" />
          HR
        </h1>
        <p className="mt-1 text-muted-foreground">
          Ansatte, fravær, sykdom, onboarding og samtaler i samme løp.
        </p>
      </div>
      <HrOverviewContent overview={overview} />
    </div>
  );
}
