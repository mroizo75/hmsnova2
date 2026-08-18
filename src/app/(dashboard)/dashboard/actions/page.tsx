import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MeasureForm } from "@/features/measures/components/measure-form";
import { MeasureList } from "@/features/measures/components/measure-list";
import { ListTodo, Clock, CheckCircle, AlertTriangle } from "lucide-react";
import { PageHelpDialog } from "@/components/dashboard/page-help-dialog";
import { helpContent } from "@/lib/help-content";
import { getTranslations } from "next-intl/server";

interface ActionsPageProps {
  searchParams: Promise<{ projectId?: string }>;
}

export default async function ActionsPage({ searchParams }: ActionsPageProps) {
  const t = await getTranslations("dashboardActionsPage");
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
  const { projectId } = await searchParams;
  const selectedProject = projectId
    ? await prisma.project.findFirst({
        where: {
          id: projectId,
          tenantId,
        },
        select: {
          id: true,
          name: true,
        },
      })
    : null;

  const measures = await prisma.measure.findMany({
    where: { tenantId },
    include: {
      risk: { select: { id: true, title: true } },
    },
    orderBy: [
      { status: "asc" },
      { dueAt: "asc" },
    ],
  });

  const tenantUsers = await prisma.user.findMany({
    where: {
      tenants: {
        some: { tenantId },
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  const now = new Date();
  const stats = {
    total: measures.length,
    pending: measures.filter((m: any) => m.status === "PENDING").length,
    inProgress: measures.filter((m: any) => m.status === "IN_PROGRESS").length,
    done: measures.filter((m: any) => m.status === "DONE").length,
    overdue: measures.filter((m: any) => m.status !== "DONE" && new Date(m.dueAt) < now).length,
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
          <PageHelpDialog content={helpContent.actions} />
        </div>
        <MeasureForm tenantId={tenantId} projectId={selectedProject?.id} users={tenantUsers} />
      </div>
      {selectedProject ? (
        <div className="rounded border border-blue-300 bg-blue-50 p-3 text-sm text-blue-900">
          {t("projectInfo")} <strong>{selectedProject.name}</strong>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.total.title")}</CardTitle>
            <ListTodo className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">{t("stats.total.description")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.inProgress.title")}</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {stats.pending + stats.inProgress}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("stats.inProgress.description", {
                pending: stats.pending,
                inProgress: stats.inProgress,
              })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.done.title")}</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.done}</div>
            <p className="text-xs text-muted-foreground">{t("stats.done.description")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.overdue.title")}</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
            <p className="text-xs text-muted-foreground">{t("stats.overdue.description")}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("list.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <MeasureList measures={measures} />
        </CardContent>
      </Card>

      <div className="rounded-lg bg-blue-50 border border-blue-200 p-6">
        <h3 className="font-semibold text-blue-900 mb-3">{t("iso.title")}</h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm text-blue-800">
          <div>
            <h4 className="font-medium mb-2">{t("iso.planningTitle")}</h4>
            <ul className="space-y-1 list-disc list-inside">
              <li>{t("iso.planningList.i1")}</li>
              <li>{t("iso.planningList.i2")}</li>
              <li>{t("iso.planningList.i3")}</li>
              <li>{t("iso.planningList.i4")}</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">{t("iso.followUpTitle")}</h4>
            <ul className="space-y-1 list-disc list-inside">
              <li>{t("iso.followUpList.i1")}</li>
              <li>{t("iso.followUpList.i2")}</li>
              <li>{t("iso.followUpList.i3")}</li>
              <li>{t("iso.followUpList.i4")}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
