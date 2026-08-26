import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import { getPermissions } from "@/lib/permissions";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus, BarChart3 } from "lucide-react";
import { PageHelpDialog } from "@/components/dashboard/page-help-dialog";
import { helpContent } from "@/lib/help-content";
import { getLocale, getTranslations } from "next-intl/server";
import { fetchInspections } from "@/server/queries/inspection.queries";
import { InspectionsContent } from "@/features/inspections/components/inspections-content";

export default async function InspectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const t = await getTranslations("dashboardInspectionsPage");
  const locale = await getLocale();
  const session = await getServerSession(authOptions);

  if (!session?.user?.role || !session.user.tenantId) {
    return notFound();
  }

  const permissions = getPermissions(session.user.role);

  if (!permissions.canReadInspections) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const showAll = params.view === "all";

  const [initialData, tenant] = await Promise.all([
    fetchInspections(),
    db.tenant.findUnique({
      where: { id: session.user.tenantId },
      select: { industry: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div className="flex min-w-0 items-start gap-3">
          <div>
            <h1 className="text-3xl font-bold">{t("title")}</h1>
            <p className="text-muted-foreground mt-1">
              {t("description")}
            </p>
          </div>
          <PageHelpDialog content={helpContent.inspections} />
        </div>
        <div className="page-header-actions">
          <Link href={showAll ? "/dashboard/inspections" : "/dashboard/inspections?view=all"}>
            <Button variant="outline"> {showAll ? t("actions.showIndustry") : t("actions.showAll")} </Button>
          </Link>
          <Link href="/dashboard/inspections/rapport">
            <Button variant="outline">
              <BarChart3 className="h-4 w-4 mr-2" />
              {t("actions.report")}
            </Button>
          </Link>
          {permissions.canCreateInspections && (
            <Link href="/dashboard/inspections/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                {t("actions.new")}
              </Button>
            </Link>
          )}
        </div>
      </div>

      <InspectionsContent
        initialData={initialData}
        locale={locale}
        showAll={showAll}
        tenantIndustry={tenant?.industry ?? null}
        canCreateInspections={permissions.canCreateInspections}
      />
    </div>
  );
}
