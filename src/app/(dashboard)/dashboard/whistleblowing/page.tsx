import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import { getPermissions } from "@/lib/permissions";
import { db } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { enUS, nb } from "date-fns/locale";
import { Shield, AlertCircle, MessageSquare, Eye } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { WhistleblowStatus, WhistleblowCategory, WhistleblowSeverity } from "@prisma/client";
import { PageHelpDialog } from "@/components/dashboard/page-help-dialog";
import { helpContent } from "@/lib/help-content";
import { getLocale, getTranslations } from "next-intl/server";

async function getWhistleblowings(tenantId: string) {
  return await db.whistleblowing.findMany({
    where: { tenantId },
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { receivedAt: "desc" },
  });
}

function getStatusBadge(status: WhistleblowStatus, t: Awaited<ReturnType<typeof getTranslations>>) {
  switch (status) {
    case "RECEIVED":
      return <Badge variant="secondary">{t("status.received")}</Badge>;
    case "ACKNOWLEDGED":
      return <Badge className="bg-blue-500 hover:bg-blue-500">{t("status.acknowledged")}</Badge>;
    case "UNDER_INVESTIGATION":
      return <Badge className="bg-purple-500 hover:bg-purple-500">{t("status.underInvestigation")}</Badge>;
    case "ACTION_TAKEN":
      return <Badge className="bg-yellow-500 hover:bg-yellow-500">{t("status.actionTaken")}</Badge>;
    case "RESOLVED":
      return <Badge className="bg-green-600 hover:bg-green-600">{t("status.resolved")}</Badge>;
    case "CLOSED":
      return <Badge variant="outline">{t("status.closed")}</Badge>;
    case "DISMISSED":
      return <Badge variant="destructive">{t("status.dismissed")}</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function getSeverityBadge(severity: WhistleblowSeverity, t: Awaited<ReturnType<typeof getTranslations>>) {
  switch (severity) {
    case "LOW":
      return <Badge variant="outline">{t("severity.low")}</Badge>;
    case "MEDIUM":
      return <Badge className="bg-yellow-500 hover:bg-yellow-500">{t("severity.medium")}</Badge>;
    case "HIGH":
      return <Badge className="bg-orange-500 hover:bg-orange-500">{t("severity.high")}</Badge>;
    case "CRITICAL":
      return <Badge variant="destructive">{t("severity.critical")}</Badge>;
    default:
      return <Badge variant="secondary">{severity}</Badge>;
  }
}

function getCategoryLabel(category: WhistleblowCategory, t: Awaited<ReturnType<typeof getTranslations>>) {
  switch (category) {
    case "HARASSMENT":
      return t("categories.harassment");
    case "DISCRIMINATION":
      return t("categories.discrimination");
    case "WORK_ENVIRONMENT":
      return t("categories.workEnvironment");
    case "SAFETY":
      return t("categories.safety");
    case "CORRUPTION":
      return t("categories.corruption");
    case "ETHICS":
      return t("categories.ethics");
    case "LEGAL":
      return t("categories.legal");
    case "OTHER":
      return t("categories.other");
    default:
      return category;
  }
}

export default async function WhistleblowingListPage() {
  const t = await getTranslations("dashboardWhistleblowingPage");
  const locale = await getLocale();
  const dateLocale = locale === "en" ? enUS : nb;
  const session = await getServerSession(authOptions);

  if (!session?.user?.role || !session.user.tenantId) {
    return notFound();
  }

  const permissions = getPermissions(session.user.role);

  if (!permissions.canViewWhistleblowing) {
    redirect("/dashboard");
  }

  const cases = await getWhistleblowings(session.user.tenantId);

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div className="flex min-w-0 items-start gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
            <p className="text-muted-foreground">
              {t("description")}
            </p>
          </div>
          <PageHelpDialog content={helpContent.whistleblowing} />
        </div>
        <Button asChild variant="outline">
          <Link href="/varsling">
            <Shield className="mr-2 h-4 w-4" />
            {t("actions.publicPage")}
          </Link>
        </Button>
      </div>

      {/* Statistikk */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.total")}</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cases.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.new")}</CardTitle>
            <AlertCircle className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {cases.filter((c) => c.status === "RECEIVED").length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.inProgress")}</CardTitle>
            <MessageSquare className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {
                cases.filter(
                  (c) =>
                    c.status === "ACKNOWLEDGED" ||
                    c.status === "UNDER_INVESTIGATION" ||
                    c.status === "ACTION_TAKEN"
                ).length
              }
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("stats.closed")}</CardTitle>
            <Shield className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {cases.filter((c) => c.status === "RESOLVED" || c.status === "CLOSED").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {cases.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <Shield className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-semibold">{t("empty.title")}</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            {t("empty.description")}
          </p>
        </div>
      ) : (
        <div className="hidden rounded-lg border md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("table.caseNumber")}</TableHead>
                <TableHead>{t("table.title")}</TableHead>
                <TableHead>{t("table.category")}</TableHead>
                <TableHead>{t("table.severity")}</TableHead>
                <TableHead>{t("table.status")}</TableHead>
                <TableHead>{t("table.received")}</TableHead>
                <TableHead className="text-right">{t("table.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cases.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-sm">{c.caseNumber}</TableCell>
                  <TableCell className="max-w-xs truncate font-medium">{c.title}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{getCategoryLabel(c.category, t)}</Badge>
                  </TableCell>
                  <TableCell>{getSeverityBadge(c.severity, t)}</TableCell>
                  <TableCell>{getStatusBadge(c.status, t)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(c.receivedAt), "dd. MMM yyyy", { locale: dateLocale })}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/dashboard/whistleblowing/${c.id}`}>
                      <Button variant="ghost" size="sm">
                        <Eye className="mr-2 h-4 w-4" />
                        {t("actions.process")}
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="space-y-3 md:hidden">
          {cases.map((c) => (
            <div key={c.id} className="space-y-3 rounded-lg border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-mono text-xs text-muted-foreground">{c.caseNumber}</p>
                  <h3 className="font-medium">{c.title}</h3>
                </div>
                {getStatusBadge(c.status, t)}
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{getCategoryLabel(c.category, t)}</Badge>
                {getSeverityBadge(c.severity, t)}
                <span className="text-sm text-muted-foreground">
                  {format(new Date(c.receivedAt), "dd. MMM yyyy", { locale: dateLocale })}
                </span>
              </div>
              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link href={`/dashboard/whistleblowing/${c.id}`}>
                  <Eye className="mr-2 h-4 w-4" />
                  {t("actions.process")}
                </Link>
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

