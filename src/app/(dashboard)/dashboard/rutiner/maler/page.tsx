import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { ArrowLeft, Filter } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getTranslations } from "next-intl/server";
import { fetchRoutineTemplates } from "@/server/queries/routine.queries";
import { RoutineTemplatesContent } from "@/features/routines/components/routine-templates-content";

export default async function RoutineTemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; q?: string }>;
}) {
  const t = await getTranslations("dashboardRoutineTemplatesPage");
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) {
    redirect("/login");
  }

  const params = await searchParams;
  const query = params.q?.trim() || undefined;
  const showAll = params.view === "all";

  const initialData = await fetchRoutineTemplates({ showAll, query });

  if (!initialData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Maler</CardTitle>
          <CardDescription>{t("loadFailed")}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/rutiner">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{t("title")}</h1>
            <p className="text-muted-foreground mt-1">
              {showAll ? t("descriptionAll") : t("descriptionRecommended")}
            </p>
          </div>
        </div>
        <Link href={showAll ? "/dashboard/rutiner/maler" : "/dashboard/rutiner/maler?view=all"}>
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            {showAll ? t("actions.showRecommended") : t("actions.showAll")}
          </Button>
        </Link>
      </div>

      <RoutineTemplatesContent initialData={initialData} showAll={showAll} query={query} />
    </div>
  );
}
