import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/server-authorization";
import { fetchBoardings } from "@/server/queries/boarding.queries";
import { BoardingContent } from "@/features/boarding/components/boarding-content";
import { HrWorkspaceNav } from "@/features/hr/components/hr-workspace-nav";

export default async function OnboardingPage() {
  const auth = await getAuthContext();

  if (!auth.permissions.canReadAllBoarding && !auth.permissions.canReadOwnBoarding) {
    redirect("/dashboard");
  }

  const boardings = await fetchBoardings();

  return (
    <div className="space-y-6 p-6">
      <HrWorkspaceNav />
      <BoardingContent
        boardings={boardings}
        canCreate={auth.permissions.canCreateBoarding}
        canManageTemplates={auth.permissions.canManageBoardingTemplates}
      />
    </div>
  );
}
