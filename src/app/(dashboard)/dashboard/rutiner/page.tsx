import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { Plus, Library, CalendarClock, UserCircle2 } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { listTenantRoutines } from "@/server/actions/routine.actions";
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
  const result = await listTenantRoutines(query);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground mt-1">
            {t("description")}
          </p>
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

      <Card>
        <CardHeader>
          <CardTitle>{t("list.title")}</CardTitle>
          <CardDescription>
            {t("list.description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {routines.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              {t("list.empty")}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("table.routine")}</TableHead>
                  <TableHead>{t("table.status")}</TableHead>
                  <TableHead>{t("table.responsible")}</TableHead>
                  <TableHead>{t("table.nextReview")}</TableHead>
                  <TableHead className="text-right">{t("table.action")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {routines.map((routine) => (
                  <TableRow key={routine.id}>
                    <TableCell>
                      <div className="font-medium">{routine.title}</div>
                      {routine.category && (
                        <div className="text-xs text-muted-foreground mt-0.5">{routine.category}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={routine.status === "ACTIVE" ? "default" : "outline"}>
                        {statusLabel(routine.status, t)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="inline-flex items-center gap-1.5 text-sm">
                        <UserCircle2 className="h-4 w-4 text-muted-foreground" />
                        <span>{routine.responsibleUser?.name || routine.responsibleUser?.email || "-"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="inline-flex items-center gap-1.5 text-sm">
                        <CalendarClock className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {routine.nextReviewAt
                            ? new Date(routine.nextReviewAt).toLocaleDateString(
                                locale === "en" ? "en-US" : "nb-NO"
                              )
                            : t("notSet")}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/dashboard/rutiner/${routine.id}`}>
                        <Button variant="ghost" size="sm">
                          {t("actions.viewDetails")}
                        </Button>
                      </Link>
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
