import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { ArrowLeft, Filter } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { listAllRoutineTemplates, listRecommendedRoutineTemplates } from "@/server/actions/routine.actions";
import { CopyRoutineTemplateButton } from "@/components/routines/copy-routine-template-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getTranslations } from "next-intl/server";

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
  const templatesResult = showAll
    ? await listAllRoutineTemplates({ query })
    : await listRecommendedRoutineTemplates({ query });

  if (!templatesResult.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Maler</CardTitle>
          <CardDescription>{t("loadFailed")}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const templates = templatesResult.data;

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
              {showAll
                ? t("descriptionAll")
                : t("descriptionRecommended")}
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

      <Card className="border-l-4 border-l-blue-500 bg-blue-50">
        <CardContent className="p-4 text-sm text-blue-900">
          {t("info")}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("list.title")}</CardTitle>
          <CardDescription>{t("list.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">{t("list.empty")}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("table.template")}</TableHead>
                  <TableHead>{t("table.category")}</TableHead>
                  <TableHead>{t("table.legalReference")}</TableHead>
                  <TableHead className="text-right">{t("table.action")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell>
                      <div className="font-medium">{template.title}</div>
                      {template.description && (
                        <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {template.description}
                        </div>
                      )}
                      <div className="mt-1.5">
                        <Badge variant={template.isGlobal ? "secondary" : "outline"}>
                          {template.isGlobal ? t("badges.global") : t("badges.tenant")}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>{template.category || "-"}</TableCell>
                    <TableCell>{template.legalReference || "-"}</TableCell>
                    <TableCell className="text-right">
                      <CopyRoutineTemplateButton
                        templateId={template.id}
                        templateTitle={template.title}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
