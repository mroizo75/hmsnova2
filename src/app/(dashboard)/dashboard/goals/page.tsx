import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, Plus, TrendingUp, TrendingDown, AlertTriangle, CheckCircle } from "lucide-react";
import Link from "next/link";
import { GoalList } from "@/features/goals/components/goal-list";
import { PageHelpDialog } from "@/components/dashboard/page-help-dialog";
import { helpContent } from "@/lib/help-content";
import { getTranslations } from "next-intl/server";

export default async function GoalsPage() {
  const t = await getTranslations("dashboardGoalsPage");
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      tenants: {
        include: {
          tenant: true,
        },
      },
    },
  });

  if (!user || user.tenants.length === 0) {
    return <div>{t("notLinkedTenant")}</div>;
  }

  const selectedMembership = user.tenants.find(
    (membership) => membership.tenantId === session.user.tenantId,
  );
  if (!selectedMembership) {
    return <div>{t("notLinkedTenant")}</div>;
  }

  const tenantId = selectedMembership.tenantId;

  // Hent alle mål
  const goals = await prisma.goal.findMany({
    where: { tenantId },
    include: {
      measurements: {
        orderBy: { measurementDate: "desc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Statistikk
  const stats = {
    total: goals.length,
    active: goals.filter((g) => g.status === "ACTIVE").length,
    achieved: goals.filter((g) => g.status === "ACHIEVED").length,
    atRisk: goals.filter((g) => g.status === "AT_RISK").length,
    failed: goals.filter((g) => g.status === "FAILED").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div className="flex min-w-0 items-start gap-3">
          <div>
            <h1 className="text-3xl font-bold">{t("title")}</h1>
            <p className="text-muted-foreground">
              {t("description")}
            </p>
          </div>
          <PageHelpDialog content={helpContent.goals} />
        </div>
        <Link href="/dashboard/goals/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            {t("actions.newGoal")}
          </Button>
        </Link>
      </div>

      {/* ISO 9001 Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Target className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="font-medium text-blue-900 mb-2">
                {t("iso.title")}
              </p>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>{t("iso.points.p1")}</li>
                <li>{t("iso.points.p2")}</li>
                <li>{t("iso.points.p3")}</li>
                <li>{t("iso.points.p4")}</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.total.title")}</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">{t("stats.total.description")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.active.title")}</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.active}</div>
            <p className="text-xs text-muted-foreground">{t("stats.active.description")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.achieved.title")}</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.achieved}</div>
            <p className="text-xs text-muted-foreground">{t("stats.achieved.description")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.atRisk.title")}</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.atRisk}</div>
            <p className="text-xs text-muted-foreground">{t("stats.atRisk.description")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.failed.title")}</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
            <p className="text-xs text-muted-foreground">{t("stats.failed.description")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Goals List */}
      <Card>
        <CardHeader>
          <CardTitle>{t("list.title")}</CardTitle>
          <CardDescription>{t("list.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <GoalList goals={goals} />
        </CardContent>
      </Card>
    </div>
  );
}
