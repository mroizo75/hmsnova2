import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RiskList } from "@/features/risks/components/risk-list";
import { RiskMatrix } from "@/features/risks/components/risk-matrix";
import { Plus, AlertTriangle, CheckCircle, Clock, Shield, FileText } from "lucide-react";
import Link from "next/link";
import { PageHelpDialog } from "@/components/dashboard/page-help-dialog";
import { helpContent } from "@/lib/help-content";
import { getPermissions } from "@/lib/permissions";
import { AiRiskSuggestionsCard } from "@/features/risks/components/ai-risk-suggestions-card";
import { RiskAssessmentDeleteButton } from "@/features/risks/components/risk-assessment-delete-button";
import { getTranslations } from "next-intl/server";

export default async function RisksPage() {
  const t = await getTranslations("dashboardRisksPage");
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { tenants: true },
  });

  if (!user || user.tenants.length === 0) {
    return <div>{t("noTenantAccess")}</div>;
  }

  const selectedMembership = user.tenants.find(
    (membership) => membership.tenantId === session.user.tenantId,
  );
  if (!selectedMembership) {
    return <div>{t("noTenantAccess")}</div>;
  }

  const tenantId = selectedMembership.tenantId;
  const tenantRole = selectedMembership.role;
  const permissions = getPermissions(tenantRole);
  const canUseAiSuggestions = permissions.canCreateRisks;
  const canDeleteRiskAssessments = permissions.canDeleteRisks;

  const riskAssessments = await prisma.riskAssessment.findMany({
    where: { tenantId },
    include: { _count: { select: { risks: true } } },
    orderBy: [{ assessmentYear: "desc" }, { createdAt: "desc" }],
  });

  const risks = await prisma.risk.findMany({
    where: { tenantId },
    include: {
      measures: true,
      owner: {
        select: { id: true, name: true, email: true },
      },
      inspectionTemplate: {
        select: { id: true, name: true },
      },
      kpi: {
        select: { id: true, title: true },
      },
    },
    orderBy: [
      { score: "desc" },
      { createdAt: "desc" },
    ],
  });

  const getActiveScore = (risk: (typeof risks)[number]) => risk.residualScore ?? risk.score;
  const risksImprovedCount = risks.filter(
    (risk) => risk.residualScore != null && risk.residualScore < risk.score
  ).length;

  const stats = {
    total: risks.length,
    critical: risks.filter((risk) => getActiveScore(risk) >= 20).length,
    high: risks.filter((risk) => getActiveScore(risk) >= 12 && getActiveScore(risk) < 20).length,
    medium: risks.filter((risk) => getActiveScore(risk) >= 6 && getActiveScore(risk) < 12).length,
    low: risks.filter((risk) => getActiveScore(risk) < 6).length,
    open: risks.filter((risk) => risk.status === "OPEN").length,
    mitigating: risks.filter((risk) => risk.status === "MITIGATING").length,
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div className="flex min-w-0 items-start gap-3">
          <div>
            <h1 className="text-3xl font-bold">{t("title")}</h1>
            <p className="text-muted-foreground">
              {t("description")}
            </p>
          </div>
          <PageHelpDialog content={helpContent.risks} />
        </div>
        <Button asChild>
          <Link href="/dashboard/risks/new">
            <Plus className="mr-2 h-4 w-4" />
            {t("actions.newRisk")}
          </Link>
        </Button>
      </div>

      {canUseAiSuggestions && <AiRiskSuggestionsCard />}

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
              {riskAssessments.map((a) => (
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
    </div>
  );
}
