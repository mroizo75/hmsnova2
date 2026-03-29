import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { Plus, Library, CalendarClock, UserCircle2, Tag, ChevronRight } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { getCurrentUser } from "@/lib/server-action";
import { getPermissions } from "@/lib/permissions";
import { helpContent } from "@/lib/help-content";
import { getRoutineCategoryPresets } from "@/lib/routine-categories";
import { listTenantRoutines } from "@/server/actions/routine.actions";
import { listRoutineUploadedDocumentsForDashboard } from "@/server/actions/routine-upload.actions";
import { RoutineUploadsSection } from "@/features/routines/components/routine-uploads-section";
import { PageHelpDialog } from "@/components/dashboard/page-help-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getLocale, getTranslations } from "next-intl/server";

function statusLabel(status: string, t: Awaited<ReturnType<typeof getTranslations>>): string {
  const labels: Record<string, string> = {
    ACTIVE: t("status.active"),
    DRAFT: t("status.draft"),
    NEEDS_REVIEW: t("status.needsReview"),
    ARCHIVED: t("status.archived"),
  };
  return labels[status] || status;
}

function statusVariant(status: string): "default" | "outline" | "secondary" | "destructive" {
  switch (status) {
    case "ACTIVE":
      return "default";
    case "NEEDS_REVIEW":
      return "destructive";
    case "DRAFT":
      return "secondary";
    default:
      return "outline";
  }
}

export default async function RutinerPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const t = await getTranslations("dashboardRoutinesPage");
  const locale = await getLocale();
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) {
    redirect("/login");
  }

  const params = await searchParams;
  const query = params.q?.trim() || undefined;
  const [result, user, uploadsResult] = await Promise.all([
    listTenantRoutines(query),
    getCurrentUser(),
    listRoutineUploadedDocumentsForDashboard(),
  ]);

  if (!result.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("loadFailed")}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const routines = result.data;
  const categoryPresets = getRoutineCategoryPresets();
  const categoryLabelMap = new Map(categoryPresets.map((p) => [p.value, p.label]));

  const membership = user?.tenants.at(0);
  const routinePerms = membership ? getPermissions(membership.role) : null;
  const serializedUploads =
    uploadsResult.success === true
      ? uploadsResult.data.map((u) => ({
          id: u.id,
          title: u.title,
          description: u.description,
          documentType: u.documentType,
          originalFileName: u.originalFileName,
          fileKey: u.fileKey,
          mime: u.mime,
          createdAt: u.createdAt.toISOString(),
          createdById: u.createdById,
        }))
      : [];

  const needsReviewCount = routines.filter((r) => r.status === "NEEDS_REVIEW").length;
  const activeCount = routines.filter((r) => r.status === "ACTIVE").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div>
            <h1 className="text-3xl font-bold">{t("title")}</h1>
            <p className="text-muted-foreground mt-1">{t("description")}</p>
          </div>
          <PageHelpDialog content={helpContent.routines} />
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/rutiner/maler">
            <Button variant="outline">
              <Library className="h-4 w-4 mr-2" />
              {t("actions.templateLibrary")}
            </Button>
          </Link>
          <Link href="/dashboard/rutiner/maler">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {t("actions.createFromTemplate")}
            </Button>
          </Link>
        </div>
      </div>

      {/* Oppsummering */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Totalt</CardDescription>
            <CardTitle className="text-2xl">{routines.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">registrerte rutiner</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Gjeldende</CardDescription>
            <CardTitle className="text-2xl text-green-600 dark:text-green-400">{activeCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">aktive og oppdaterte</p>
          </CardContent>
        </Card>
        <Card className={needsReviewCount > 0 ? "border-amber-300 dark:border-amber-700" : ""}>
          <CardHeader className="pb-2">
            <CardDescription>Krever revisjon</CardDescription>
            <CardTitle className={`text-2xl ${needsReviewCount > 0 ? "text-amber-600 dark:text-amber-400" : ""}`}>
              {needsReviewCount}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {needsReviewCount > 0 ? "bør gjennomgås snarest" : "ingen utestående"}
            </p>
          </CardContent>
        </Card>
      </div>

      {user && routinePerms && uploadsResult.success === true && (
        <RoutineUploadsSection
          uploads={serializedUploads}
          currentUserId={user.id}
          canCreate={routinePerms.canCreateRoutines}
          canManageAny={routinePerms.canManageRoutines}
        />
      )}
      {uploadsResult.success === false && (
        <Card>
          <CardHeader>
            <CardTitle>Opplastede rutiner</CardTitle>
            <CardDescription className="text-destructive">{uploadsResult.error}</CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t("list.title")}</CardTitle>
          <CardDescription>{t("list.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          {routines.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">{t("list.empty")}</div>
          ) : (
            <div className="space-y-3">
              {routines.map((routine) => (
                <Link
                  key={routine.id}
                  href={`/dashboard/rutiner/${routine.id}`}
                  className="group block rounded-lg border bg-card p-4 transition-colors hover:bg-accent/50"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
                          {routine.title}
                        </span>
                        <Badge variant={statusVariant(routine.status)}>
                          {statusLabel(routine.status, t)}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        {routine.category && (
                          <span className="inline-flex items-center gap-1">
                            <Tag className="h-3.5 w-3.5" />
                            {categoryLabelMap.get(routine.category) ?? routine.category}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1">
                          <UserCircle2 className="h-3.5 w-3.5" />
                          {routine.responsibleUser?.name || routine.responsibleUser?.email || t("notSet")}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <CalendarClock className="h-3.5 w-3.5" />
                          {routine.nextReviewAt
                            ? new Date(routine.nextReviewAt).toLocaleDateString(
                                locale === "en" ? "en-US" : "nb-NO"
                              )
                            : t("notSet")}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
