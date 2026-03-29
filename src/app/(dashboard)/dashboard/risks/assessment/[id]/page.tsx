import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { RiskAssessmentItemForm } from "@/features/risks/components/risk-assessment-item-form";
import { RiskAssessmentItemList } from "@/features/risks/components/risk-assessment-item-list";
import { RiskAssessmentComplianceCard } from "@/features/risks/components/risk-assessment-compliance-card";
import { getPermissions } from "@/lib/permissions";
import { RiskAssessmentDeleteButton } from "@/features/risks/components/risk-assessment-delete-button";
import { RiskAssessmentTitleEditor } from "@/features/risks/components/risk-assessment-title-editor";

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

  const [assessment, userTenants] = await Promise.all([
    prisma.riskAssessment.findFirst({
      where: { id, tenantId },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        risks: {
          orderBy: [{ score: "desc" }, { assessmentDate: "desc" }, { createdAt: "asc" }],
          include: {
            owner: { select: { id: true, name: true, email: true } },
          },
        },
      },
    }),
    prisma.userTenant.findMany({
      where: { tenantId },
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
  ]);

  if (!assessment) {
    notFound();
  }

  const userList = userTenants
    .filter((ut) => ut.user.email)
    .map((ut) => ({
      id: ut.user.id,
      name: ut.user.name,
      email: ut.user.email ?? "",
    }));

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/dashboard/risks">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Tilbake til risikovurdering
          </Link>
        </Button>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <RiskAssessmentTitleEditor
              assessmentId={assessment.id}
              initialTitle={assessment.title}
              canEdit={canEditAssessmentTitle}
            />
          </div>
          {canDeleteRiskAssessments && (
            <RiskAssessmentDeleteButton
              assessmentId={assessment.id}
              assessmentTitle={assessment.title}
            />
          )}
        </div>
        <p className="text-muted-foreground">
          Systematisk risikovurdering i henhold til IK-HMS § 5 og AML § 3-1.
        </p>
        {assessment.project ? (
          <p className="text-sm text-blue-700 mt-2">
            Knyttet til prosjekt: <strong>{assessment.project.name}</strong>
          </p>
        ) : null}
      </div>

      <RiskAssessmentComplianceCard
        assessment={{
          id: assessment.id,
          participants: assessment.participants,
          approvedById: assessment.approvedById,
          approvedAt: assessment.approvedAt,
          reviewedById: assessment.reviewedById,
          reviewedAt: assessment.reviewedAt,
        }}
        users={userList}
      />

      <RiskAssessmentItemForm
        riskAssessmentId={assessment.id}
        tenantId={tenantId}
        ownerId={user.id}
        autoGenerateAi={openAi}
        initialAiRiskType={initialAiRiskType}
        initialIndustryContext={initialIndustryContext}
      />

      <Card>
        <CardHeader>
          <CardTitle>Risikopunkter i denne vurderingen</CardTitle>
        </CardHeader>
        <CardContent>
          <RiskAssessmentItemList risks={assessment.risks} />
        </CardContent>
      </Card>
    </div>
  );
}
