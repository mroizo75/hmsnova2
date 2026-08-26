import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { Plus, Library } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { getCurrentUser } from "@/lib/server-action";
import { getPermissions } from "@/lib/permissions";
import { helpContent } from "@/lib/help-content";
import { getRoutineCategoryPresets } from "@/lib/routine-categories";
import { listRoutineUploadedDocumentsForDashboard } from "@/server/actions/routine-upload.actions";
import { RoutineUploadsSection } from "@/features/routines/components/routine-uploads-section";
import { PageHelpDialog } from "@/components/dashboard/page-help-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getTranslations } from "next-intl/server";
import { fetchRoutines } from "@/server/queries/routine.queries";
import { RoutinesListContent } from "@/features/routines/components/routines-list-content";

export default async function RutinerPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; kategori?: string }>;
}) {
  const t = await getTranslations("dashboardRoutinesPage");
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) {
    redirect("/login");
  }

  const params = await searchParams;
  const query = params.q?.trim() || undefined;
  const activeCategory = params.kategori?.trim() || undefined;

  const [initialRoutines, user, uploadsResult] = await Promise.all([
    fetchRoutines(query),
    getCurrentUser(),
    listRoutineUploadedDocumentsForDashboard(),
  ]);

  if (!initialRoutines) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("loadFailed")}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

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

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div className="flex min-w-0 items-start gap-2">
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

      <RoutinesListContent
        initialData={initialRoutines}
        activeCategory={activeCategory}
        categoryLabelMap={categoryLabelMap}
        routinePerms={routinePerms ? { canCreateRoutines: routinePerms.canCreateRoutines, canManageRoutines: routinePerms.canManageRoutines } : null}
        query={query}
      />

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
    </div>
  );
}
