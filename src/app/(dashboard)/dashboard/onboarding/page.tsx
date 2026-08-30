import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/server-authorization";
import { fetchBoardings } from "@/server/queries/boarding.queries";
import { BoardingContent } from "@/features/boarding/components/boarding-content";

export default async function OnboardingPage() {
  const auth = await getAuthContext();

  if (!auth.permissions.canReadAllBoarding && !auth.permissions.canReadOwnBoarding) {
    redirect("/dashboard");
  }

  const boardings = await fetchBoardings();

  return (
    <div className="p-6">
      <BoardingContent
        boardings={boardings}
        canCreate={auth.permissions.canCreateBoarding}
        canManageTemplates={auth.permissions.canManageBoardingTemplates}
      />
    </div>
  );
}
