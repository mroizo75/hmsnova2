import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fetchRiskDetail } from "@/server/queries/risk-register.queries";
import { getTrainingRequirementsForRisk } from "@/server/actions/risk-training.actions";
import { getResourceHistory } from "@/server/actions/activity-history.actions";
import { RiskDetailContent } from "@/features/risks/components/risk-detail-content";

export default async function EditRiskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { tenants: true },
  });

  if (!user || user.tenants.length === 0) {
    return <div>Ingen tilgang til tenant</div>;
  }

  const selectedMembership = user.tenants.find(
    (membership) => membership.tenantId === session.user.tenantId,
  );
  if (!selectedMembership) {
    return <div>Ingen tilgang til tenant</div>;
  }

  const tenantId = selectedMembership.tenantId;

  const [initialData, history, trainingResult] = await Promise.all([
    fetchRiskDetail(id),
    getResourceHistory(id),
    getTrainingRequirementsForRisk(id),
  ]);

  if (!initialData) {
    return <div>Risiko ikke funnet</div>;
  }

  const trainingRequirements = trainingResult.success ? trainingResult.data ?? [] : [];

  return (
    <RiskDetailContent
      initialData={initialData}
      tenantId={tenantId}
      userId={user.id}
      trainingRequirements={trainingRequirements}
      history={history}
    />
  );
}
