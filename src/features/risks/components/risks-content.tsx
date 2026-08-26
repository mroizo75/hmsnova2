"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RiskList } from "@/features/risks/components/risk-list";
import { RiskMatrix } from "@/features/risks/components/risk-matrix";
import { RiskAssessmentDeleteButton } from "@/features/risks/components/risk-assessment-delete-button";
import { AlertTriangle, CheckCircle, Clock, Shield, FileText } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { fetchRisks, fetchRiskAssessments } from "@/server/queries/risk.queries";

type RiskData = Awaited<ReturnType<typeof fetchRisks>>;
type AssessmentData = Awaited<ReturnType<typeof fetchRiskAssessments>>;

interface RisksContentProps {
  initialRisks: RiskData;
  initialAssessments: AssessmentData;
  canDeleteRiskAssessments: boolean;
}

export function RisksContent({ initialRisks, initialAssessments, canDeleteRiskAssessments }: RisksContentProps) {
  const t = useTranslations("dashboardRisksPage");

  const { data: risks } = useQuery({
    queryKey: ["risks"],
    queryFn: () => fetchRisks(),
    initialData: initialRisks,
  });

  const { data: riskAssessments } = useQuery({
    queryKey: ["risks", "assessments"],
    queryFn: () => fetchRiskAssessments(),
    initialData: initialAssessments,
  });

  const getActiveScore = (risk: (typeof risks)[number]) => (risk as any).residualScore ?? (risk as any).score;
  const risksImprovedCount = risks.filter(
    (risk: any) => risk.residualScore != null && risk.residualScore < risk.score
  ).length;

  const stats = {
    total: risks.length,
    critical: risks.filter((risk: any) => getActiveScore(risk) >= 20).length,
    high: risks.filter((risk: any) => getActiveScore(risk) >= 12 && getActiveScore(risk) < 20).length,
    medium: risks.filter((risk: any) => getActiveScore(risk) >= 6 && getActiveScore(risk) < 12).length,
    low: risks.filter((risk: any) => getActiveScore(risk) < 6).length,
    open: risks.filter((risk: any) => risk.status === "OPEN").length,
    mitigating: risks.filter((risk: any) => risk.status === "MITIGATING").length,
  };

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.totalRiskPoints.title")}</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">{t("stats.totalRiskPoints.description")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.criticalHigh.title")}</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats.critical + stats.high}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("stats.criticalHigh.description", { critical: stats.critical, high: stats.high })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.open.title")}</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.open}</div>
            <p className="text-xs text-muted-foreground">{t("stats.open.description")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.improved.title")}</CardTitle>
            <CheckCircle className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{risksImprovedCount}</div>
            <p className="text-xs text-muted-foreground">{t("stats.improved.description")}</p>
          </CardContent>
        </Card>
      </div>

      {riskAssessments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {t("annualAssessments.title")}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {t("annualAssessments.description")}
            </p>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {riskAssessments.map((a: any) => (
                <li key={a.id}>
                  <div className="flex items-center gap-2 rounded-md border p-3 hover:bg-muted/50">
                    <Link
                      href={`/dashboard/risks/assessment/${a.id}`}
                      className="flex min-w-0 flex-1 items-center justify-between gap-3"
                    >
                      <span className="font-medium truncate">{a.title}</span>
                      <span className="text-muted-foreground text-sm whitespace-nowrap">
                        {t("annualAssessments.riskPoints", { count: a._count.risks })}
                      </span>
                    </Link>
                    {canDeleteRiskAssessments && (
                      <RiskAssessmentDeleteButton
                        assessmentId={a.id}
                        assessmentTitle={a.title}
                      />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        <RiskMatrix risks={risks} viewMode="initial" />
        <RiskMatrix risks={risks} viewMode="residual" />
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-1">{t("registry.title")}</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          {t("registry.description")}
        </p>
        <RiskList risks={risks} />
      </div>
    </>
  );
}
