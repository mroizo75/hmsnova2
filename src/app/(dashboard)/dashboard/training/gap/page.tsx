import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getAuthContext } from "@/lib/server-authorization";
import { fetchGapDashboard } from "@/server/queries/competence.queries";
import { GapAnalysisDashboard } from "@/features/training/components/gap-analysis-dashboard";

export default async function GapPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  const auth = await getAuthContext();
  if (!auth.permissions.canReadAllTraining) redirect("/dashboard/training");

  const data = await fetchGapDashboard();
  if (!data) redirect("/dashboard/training");

  return <GapAnalysisDashboard data={data} />;
}
