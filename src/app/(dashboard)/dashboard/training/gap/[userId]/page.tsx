import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getAuthContext } from "@/lib/server-authorization";
import { fetchUserGapAnalysis } from "@/server/queries/competence.queries";
import { GapAnalysisUser } from "@/features/training/components/gap-analysis-user";

interface Props {
  params: Promise<{ userId: string }>;
}

export default async function UserGapPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  const { userId } = await params;
  const auth = await getAuthContext();

  if (!auth.permissions.canReadAllTraining && auth.userId !== userId) {
    redirect("/dashboard/training");
  }

  const gap = await fetchUserGapAnalysis(userId);
  if (!gap) notFound();

  return <GapAnalysisUser gap={gap} />;
}
