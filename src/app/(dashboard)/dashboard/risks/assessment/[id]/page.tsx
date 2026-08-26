import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPermissions } from "@/lib/permissions";
import { fetchRiskAssessmentDetail } from "@/server/queries/risk-register.queries";
import { RiskAssessmentDetailContent } from "@/features/risks/components/risk-assessment-detail-content";

export default async function RiskAssessmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const openAiParam = resolvedSearchParams.openAi;
  const aiRiskTypeParam = resolvedSearchParams.aiRiskType;
  const industryContextParam = resolvedSearchParams.industryContext;
  const openAi = Array.isArray(openAiParam) ? openAiParam[0] === "1" : openAiParam === "1";
  const initialAiRiskType = Array.isArray(aiRiskTypeParam) ? aiRiskTypeParam[0] : aiRiskTypeParam;
  const initialIndustryContext = Array.isArray(industryContextParam)
    ? industryContextParam[0]
    : industryContextParam;
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
  const permissions = getPermissions(selectedMembership.role);
  const canDeleteRiskAssessments = permissions.canDeleteRisks;
  const canEditAssessmentTitle = permissions.canCreateRisks;

  const initialData = await fetchRiskAssessmentDetail(id);

  if (!initialData) {
    notFound();
  }

  return (
    <RiskAssessmentDetailContent
      initialData={initialData}
      tenantId={tenantId}
      userId={user.id}
      canDeleteRiskAssessments={canDeleteRiskAssessments}
      canEditAssessmentTitle={canEditAssessmentTitle}
      openAi={openAi}
      initialAiRiskType={initialAiRiskType}
      initialIndustryContext={initialIndustryContext}
    />
  );
}
