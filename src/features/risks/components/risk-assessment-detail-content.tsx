"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchRiskAssessmentDetail } from "@/server/queries/risk-register.queries";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { RiskAssessmentItemForm } from "@/features/risks/components/risk-assessment-item-form";
import { RiskAssessmentItemList } from "@/features/risks/components/risk-assessment-item-list";
import { RiskAssessmentComplianceCard } from "@/features/risks/components/risk-assessment-compliance-card";
import { RiskAssessmentDeleteButton } from "@/features/risks/components/risk-assessment-delete-button";
import { RiskAssessmentTitleEditor } from "@/features/risks/components/risk-assessment-title-editor";

type AssessmentDetailData = NonNullable<Awaited<ReturnType<typeof fetchRiskAssessmentDetail>>>;

interface RiskAssessmentDetailContentProps {
  initialData: AssessmentDetailData;
  tenantId: string;
  userId: string;
  canDeleteRiskAssessments: boolean;
  canEditAssessmentTitle: boolean;
  openAi: boolean;
  initialAiRiskType?: string;
  initialIndustryContext?: string;
}

export function RiskAssessmentDetailContent({
  initialData,
  tenantId,
  userId,
  canDeleteRiskAssessments,
  canEditAssessmentTitle,
  openAi,
  initialAiRiskType,
  initialIndustryContext,
}: RiskAssessmentDetailContentProps) {
  const { data } = useQuery({
    queryKey: ["risks", "assessment", initialData.assessment.id],
    queryFn: () => fetchRiskAssessmentDetail(initialData.assessment.id),
    initialData,
  });

  if (!data) return null;

  const { assessment, userList } = data;

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
        ownerId={userId}
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
