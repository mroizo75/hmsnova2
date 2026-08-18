import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrainingHeaderActions } from "@/features/training/components/training-header-actions";
import { TrainingList } from "@/features/training/components/training-list";
import { IsoCompetenceInfo } from "@/features/training/components/iso-competence-info";
import {
  GraduationCap,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Users,
} from "lucide-react";
import { PageHelpDialog } from "@/components/dashboard/page-help-dialog";
import { helpContent } from "@/lib/help-content";
import { getTranslations } from "next-intl/server";

export default async function TrainingPage() {
  const t = await getTranslations("dashboardTrainingPage");
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      tenants: {
        include: {
          tenant: {
            select: {
              industry: true,
            },
          },
        },
      },
    },
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

  // Hent opplæring med brukerdata i én query (unngår N+1)
  const [trainingsRaw, tenantUsers, courseTemplates] = await Promise.all([
    prisma.training.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({
      where: { tenants: { some: { tenantId } } },
      select: { id: true, name: true, email: true },
    }),
    prisma.courseTemplate.findMany({
      where: {
        OR: [
          { tenantId, isActive: true },
          { isGlobal: true, isActive: true },
        ],
      },
      orderBy: { title: "asc" },
    }),
  ]);

  const userMap = new Map(tenantUsers.map((u) => [u.id, u]));
  const trainingsWithUser = trainingsRaw
    .map((t) => ({ ...t, user: userMap.get(t.userId) }))
    .filter((t): t is typeof t & { user: NonNullable<typeof t.user> } => !!t.user);

  const requiredCourseKeys = courseTemplates
    .filter((c) => c.isRequired)
    .map((c) => c.courseKey);

  // Statistikk
  const now = new Date();
  const completed = trainingsRaw.filter((t) => t.completedAt).length;

  const expiringSoon = trainingsRaw.filter((t) => {
    if (!t.validUntil) return false;
    const days = Math.ceil(
      (new Date(t.validUntil).getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );
    return days > 0 && days <= 30;
  }).length;

  const expired = trainingsRaw.filter((t) => {
    if (!t.validUntil) return false;
    return new Date(t.validUntil) < now;
  }).length;

  // Ansatte med manglende obligatoriske kurs
  const employeesWithGaps = tenantUsers.filter((u) => {
    const userCourseKeys = new Set(
      trainingsRaw
        .filter((t) => t.userId === u.id && t.completedAt)
        .filter((t) => {
          if (!t.validUntil) return true;
          return new Date(t.validUntil) >= now;
        })
        .map((t) => t.courseKey),
    );
    return requiredCourseKeys.some((key) => !userCourseKeys.has(key));
  }).length;

  // Utløpsvarsler – for alle bedrifter, ikke bare helse
  const expiringTrainings = trainingsWithUser
    .filter((training) => {
      if (!training.validUntil) return false;
      const days = Math.ceil(
        (new Date(training.validUntil).getTime() - now.getTime()) /
          (1000 * 60 * 60 * 24),
      );
      return days <= 30;
    })
    .sort((a, b) => {
      const aDate = a.validUntil ? new Date(a.validUntil).getTime() : Number.MAX_SAFE_INTEGER;
      const bDate = b.validUntil ? new Date(b.validUntil).getTime() : Number.MAX_SAFE_INTEGER;
      return aDate - bDate;
    })
    .slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div className="flex min-w-0 items-start gap-3">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <GraduationCap className="h-8 w-8" />
              {t("title")}
            </h1>
            <p className="text-muted-foreground">
              {t("description")}
            </p>
          </div>
          <PageHelpDialog content={helpContent.training} />
        </div>
        <TrainingHeaderActions
          tenantId={tenantId}
          users={tenantUsers}
          courseTemplates={courseTemplates}
        />
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.completed.title")}</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completed}</div>
            <p className="text-xs text-muted-foreground">
              {trainingsRaw.length > 0
                ? t("stats.completed.percentOfTotal", {
                    percent: Math.round((completed / trainingsRaw.length) * 100),
                  })
                : t("stats.completed.zero")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.expiringSoon.title")}</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{expiringSoon}</div>
            <p className="text-xs text-muted-foreground">{t("stats.expiringSoon.description")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.expired.title")}</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{expired}</div>
            <p className="text-xs text-muted-foreground">{t("stats.expired.description")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.employeesWithGaps.title")}</CardTitle>
            <Users className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{employeesWithGaps}</div>
            <p className="text-xs text-muted-foreground">
              {t("stats.employeesWithGaps.description", { total: tenantUsers.length })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Utløpsvarsler – for alle bedrifter */}
      {expiringTrainings.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-amber-900">
              {t("expiryAlerts.title")}
            </CardTitle>
            <CardDescription className="text-amber-800">
              {t("expiryAlerts.description")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {expiringTrainings.map((training) => {
                const daysUntilExpiry = training.validUntil
                  ? Math.ceil(
                      (new Date(training.validUntil).getTime() - now.getTime()) /
                        (1000 * 60 * 60 * 24),
                    )
                  : null;
                const isExpired = (daysUntilExpiry ?? 1) <= 0;
                return (
                  <div
                    key={training.id}
                    className="flex items-center justify-between rounded-md border border-amber-200 bg-white p-3"
                  >
                    <div>
                      <p className="font-medium">{training.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {training.user?.name || training.user?.email || t("expiryAlerts.unknownEmployee")}
                      </p>
                    </div>
                    <Badge variant={isExpired ? "destructive" : "outline"}>
                      {isExpired
                        ? t("expiryAlerts.expired")
                        : t("expiryAlerts.daysLeft", { days: daysUntilExpiry })}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ISO 9001 – kollapset som standard */}
      <IsoCompetenceInfo />

      {/* Training List */}
      <Card>
        <CardHeader>
          <CardTitle>{t("list.title")}</CardTitle>
          <CardDescription>
            {t("list.description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TrainingList
            trainings={trainingsWithUser}
            tenantUsers={tenantUsers}
            requiredCourseKeys={requiredCourseKeys}
          />
        </CardContent>
      </Card>
    </div>
  );
}
