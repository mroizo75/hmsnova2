import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrainingHeaderActions } from "@/features/training/components/training-header-actions";
import { TrainingList } from "@/features/training/components/training-list";
import { TrainingExpiryAlertButton } from "@/features/training/components/training-expiry-alert-button";
import {
  GraduationCap,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
} from "lucide-react";
import { PageHelpDialog } from "@/components/dashboard/page-help-dialog";
import { helpContent } from "@/lib/help-content";
import { hasTenantFeature } from "@/lib/tenant-features";
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

  const tenantId = user.tenants[0].tenantId;
  const isHealthcareTenant = hasTenantFeature(
    user.tenants[0]?.tenant?.industry,
    "helseforetak",
  );

  // Hent all opplæring med brukerinformasjon
  const trainings = await prisma.training.findMany({
    where: { tenantId },
    include: {
      tenant: {
        select: {
          users: {
            select: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Map trainings to include user info directly
  const trainingsWithUser = (await Promise.all(
    trainings.map(async (training) => {
      const user = await prisma.user.findUnique({
        where: { id: training.userId },
        select: { id: true, name: true, email: true },
      });
      return user ? { ...training, user } : null;
    })
  )).filter((t): t is NonNullable<typeof t> => t !== null);

  // Hent alle brukere for tenant
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

  // Hent kursmaler (globale + tenant-spesifikke)
  const courseTemplates = await prisma.courseTemplate.findMany({
    where: {
      OR: [
        { tenantId, isActive: true },
        { isGlobal: true, isActive: true },
      ],
    },
    orderBy: { title: "asc" },
  });

  // Calculate statistics
  const now = new Date();
  const completed = trainings.filter((t) => t.completedAt).length;
  const notStarted = trainings.filter((t) => !t.completedAt).length;

  const expiringSoon = trainings.filter((t) => {
    if (!t.validUntil) return false;
    const daysUntilExpiry = Math.ceil(
      (new Date(t.validUntil).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
  }).length;

  const expired = trainings.filter((t) => {
    if (!t.validUntil) return false;
    return new Date(t.validUntil) < now;
  }).length;
  const healthcareExpiringTrainings = trainingsWithUser
    .filter((training) => {
      if (!training.validUntil || !training.isRequired) {
        return false;
      }
      const daysUntilExpiry = Math.ceil(
        (new Date(training.validUntil).getTime() - now.getTime()) /
          (1000 * 60 * 60 * 24),
      );
      return daysUntilExpiry <= 30;
    })
    .sort((a, b) => {
      const aDate = a.validUntil ? new Date(a.validUntil).getTime() : Number.MAX_SAFE_INTEGER;
      const bDate = b.validUntil ? new Date(b.validUntil).getTime() : Number.MAX_SAFE_INTEGER;
      return aDate - bDate;
    })
    .slice(0, 8);

  const evaluated = trainings.filter((t) => t.effectiveness).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.total.title")}</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{trainings.length}</div>
            <p className="text-xs text-muted-foreground">{t("stats.total.description")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.completed.title")}</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completed}</div>
            <p className="text-xs text-muted-foreground">
              {trainings.length > 0
                ? t("stats.completed.percentOfTotal", {
                    percent: Math.round((completed / trainings.length) * 100),
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
            <CardTitle className="text-sm font-medium">{t("stats.evaluated.title")}</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{evaluated}</div>
            <p className="text-xs text-muted-foreground">
              {completed > 0
                ? t("stats.evaluated.percentOfCompleted", {
                    percent: Math.round((evaluated / completed) * 100),
                  })
                : t("stats.evaluated.zero")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ISO 9001 Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">{t("iso.title")}</CardTitle>
          <CardDescription className="text-blue-800">
            {t("iso.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-blue-800 space-y-2">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="font-semibold mb-1">{t("iso.points.a.title")}</p>
              <p>{t("iso.points.a.description")}</p>
            </div>
            <div>
              <p className="font-semibold mb-1">{t("iso.points.b.title")}</p>
              <p>{t("iso.points.b.description")}</p>
            </div>
            <div>
              <p className="font-semibold mb-1">{t("iso.points.c.title")}</p>
              <p>{t("iso.points.c.description")}</p>
            </div>
            <div>
              <p className="font-semibold mb-1">{t("iso.points.d.title")}</p>
              <p>{t("iso.points.d.description")}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {isHealthcareTenant && healthcareExpiringTrainings.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-amber-900">
              {t("healthcareAlerts.title")}
            </CardTitle>
            <CardDescription className="text-amber-800">
              {t("healthcareAlerts.description")}
            </CardDescription>
            <div className="pt-2">
              <TrainingExpiryAlertButton />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {healthcareExpiringTrainings.map((training) => {
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
                        {training.user?.name || training.user?.email || t("healthcareAlerts.unknownEmployee")}
                      </p>
                    </div>
                    <Badge variant={isExpired ? "destructive" : "outline"}>
                      {isExpired
                        ? t("healthcareAlerts.expired")
                        : t("healthcareAlerts.daysLeft", { days: daysUntilExpiry })}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Training List */}
      <Card>
        <CardHeader>
          <CardTitle>{t("list.title")}</CardTitle>
          <CardDescription>
            {t("list.description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TrainingList trainings={trainingsWithUser} />
        </CardContent>
      </Card>
    </div>
  );
}
