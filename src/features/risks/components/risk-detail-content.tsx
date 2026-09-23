"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { fetchRiskDetail } from "@/server/queries/risk-register.queries";
import { RiskForm } from "@/features/risks/components/risk-form";
import { MeasureForm } from "@/features/measures/components/measure-form";
import { MeasureList } from "@/features/measures/components/measure-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, HardHat } from "lucide-react";
import Link from "next/link";
import { RiskControlForm } from "@/features/risks/components/risk-control-form";
import { RiskControlList } from "@/features/risks/components/risk-control-list";
import { RiskDocumentLinks } from "@/features/risks/components/risk-document-links";
import { RiskAuditLinks } from "@/features/risks/components/risk-audit-links";
import { RiskRoutineLinker } from "@/features/risks/components/risk-routine-linker";
import { RiskTrainingRequirements } from "@/components/risk-training-requirements";
import { ResourceHistory } from "@/components/shared/resource-history";
import { MocRelatedCard } from "@/features/moc/components/moc-related-card";
import { AiRiskMeasureSuggestions } from "@/features/risks/components/ai-risk-measure-suggestions";

type RiskDetailData = NonNullable<Awaited<ReturnType<typeof fetchRiskDetail>>>;

interface RiskDetailContentProps {
  initialData: RiskDetailData;
  tenantId: string;
  userId: string;
  trainingRequirements: any[];
  history: any[];
  canSuggestMeasures: boolean;
}

export function RiskDetailContent({
  initialData,
  tenantId,
  userId,
  trainingRequirements,
  history,
  canSuggestMeasures,
}: RiskDetailContentProps) {
  const t = useTranslations("dashboardRiskDetailPage");

  const { data } = useQuery({
    queryKey: ["risks", initialData.risk.id],
    queryFn: () => fetchRiskDetail(initialData.risk.id),
    initialData,
  });

  if (!data) return null;

  const { risk, tenantUsers, goals, inspectionTemplates, documents, audits, sjaHazards, linkedRoutines, availableRoutines, mocModuleEnabled } = data;

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/dashboard/risks">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("actions.back")}
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{risk.title}</p>
      </div>

      <RiskForm
        key={`${risk.id}-${String(risk.updatedAt)}-${risk.residualLikelihood ?? ""}-${risk.residualConsequence ?? ""}`}
        tenantId={tenantId}
        userId={userId}
        risk={risk}
        mode="edit"
        owners={tenantUsers}
        goalOptions={goals}
        templateOptions={inspectionTemplates}
        slotBetweenRisikonivaAndResidual={
          <Card id="tiltak">
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle>{t("measures.title")}</CardTitle>
                  <CardDescription>
                    {t("measures.description")}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <AiRiskMeasureSuggestions
                    riskId={risk.id}
                    riskTitle={risk.title}
                    ownerId={risk.ownerId}
                    users={tenantUsers}
                    enabled={canSuggestMeasures}
                  />
                  <MeasureForm tenantId={tenantId} riskId={risk.id} users={tenantUsers} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <MeasureList measures={risk.measures} />
            </CardContent>
          </Card>
        }
      />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t("controls.title")}</CardTitle>
              <CardDescription>{t("controls.description")}</CardDescription>
            </div>
            <RiskControlForm riskId={risk.id} users={tenantUsers} documents={documents} />
          </div>
        </CardHeader>
        <CardContent>
          <RiskControlList riskId={risk.id} controls={risk.controls} />
        </CardContent>
      </Card>

      <RiskRoutineLinker
        riskId={risk.id}
        linkedRoutines={linkedRoutines}
        availableRoutines={availableRoutines}
      />

      {sjaHazards.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardHat className="h-5 w-5 text-orange-500" />
              Koblede SJA-analyser
            </CardTitle>
            <CardDescription>
              SJA-analyser som har farer koblet til denne risikoen
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {sjaHazards.map((hazard: any) => (
                <Link
                  key={hazard.id}
                  href={`/dashboard/sja/${hazard.sjaAnalysis.id}`}
                  className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium">{hazard.sjaAnalysis.title}</p>
                    {hazard.sjaAnalysis.sjaNummer && (
                      <p className="text-xs text-muted-foreground font-mono">
                        {hazard.sjaAnalysis.sjaNummer}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Fare: {hazard.hazard}
                  </span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <RiskTrainingRequirements
        riskId={risk.id}
        requirements={trainingRequirements}
        canEdit={true}
      />

      <Card>
        <CardHeader>
          <CardTitle>{t("documents.title")}</CardTitle>
          <CardDescription>{t("documents.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <RiskDocumentLinks riskId={risk.id} documents={documents} links={risk.documentLinks} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("audits.title")}</CardTitle>
          <CardDescription>{t("audits.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <RiskAuditLinks riskId={risk.id} audits={audits} links={risk.auditLinks} />
        </CardContent>
      </Card>

      <MocRelatedCard links={risk.mocLinks} moduleEnabled={mocModuleEnabled} />

      <ResourceHistory entries={history} />
    </div>
  );
}
