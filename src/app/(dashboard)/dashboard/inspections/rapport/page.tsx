import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import { getPermissions } from "@/lib/permissions";
import { db } from "@/lib/db";
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import { enUS, nb } from "date-fns/locale";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Download, AlertTriangle, CheckCircle2, Clock, XCircle } from "lucide-react";
import { RapportCharts } from "@/components/inspections/rapport-charts";
import { PeriodSelector } from "@/components/inspections/period-selector";
import { getLocale, getTranslations } from "next-intl/server";

const SEVERITY_COLORS: Record<number, string> = {
  1: "bg-green-100 text-green-800 border-green-200",
  2: "bg-lime-100 text-lime-800 border-lime-200",
  3: "bg-yellow-100 text-yellow-800 border-yellow-200",
  4: "bg-orange-100 text-orange-800 border-orange-200",
  5: "bg-red-100 text-red-800 border-red-200",
};

const STATUS_BADGE: Record<string, string> = {
  PLANNED: "bg-blue-100 text-blue-800 border-blue-200",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800 border-yellow-200",
  COMPLETED: "bg-green-100 text-green-800 border-green-200",
  CANCELLED: "bg-gray-100 text-gray-600 border-gray-200",
};

const FINDING_STATUS_BADGE: Record<string, string> = {
  OPEN: "bg-red-100 text-red-800 border-red-200",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800 border-yellow-200",
  RESOLVED: "bg-green-100 text-green-800 border-green-200",
  CLOSED: "bg-gray-100 text-gray-600 border-gray-200",
};

interface PageProps {
  searchParams: Promise<{ year?: string; month?: string }>;
}

export default async function InspeksjonRapportPage({ searchParams }: PageProps) {
  const t = await getTranslations("dashboardInspectionsReportPage");
  const typeLabels: Record<string, string> = {
    VERNERUNDE: t("labels.types.vernerunde"),
    HMS_INSPEKSJON: t("labels.types.hmsInspection"),
    SHA_PLAN: t("labels.types.shaPlan"),
    SIKKERHETSVANDRING: t("labels.types.safetyWalk"),
    ANDRE: t("labels.types.other"),
  };
  const statusLabels: Record<string, string> = {
    PLANNED: t("labels.status.planned"),
    IN_PROGRESS: t("labels.status.inProgress"),
    COMPLETED: t("labels.status.completed"),
    CANCELLED: t("labels.status.cancelled"),
  };
  const findingStatusLabels: Record<string, string> = {
    OPEN: t("labels.findingStatus.open"),
    IN_PROGRESS: t("labels.findingStatus.inProgress"),
    RESOLVED: t("labels.findingStatus.resolved"),
    CLOSED: t("labels.findingStatus.closed"),
  };
  const severityLabels: Record<number, string> = {
    1: t("labels.severity.low"),
    2: t("labels.severity.moderate"),
    3: t("labels.severity.significant"),
    4: t("labels.severity.serious"),
    5: t("labels.severity.critical"),
  };
  const locale = await getLocale();
  const dateLocale = locale === "en" ? enUS : nb;
  const session = await getServerSession(authOptions);

  if (!session?.user?.role || !session.user.tenantId) return notFound();

  const permissions = getPermissions(session.user.role);
  if (!permissions.canReadInspections) redirect("/dashboard");

  const sp = await searchParams;
  const year = parseInt(sp.year ?? String(new Date().getFullYear()), 10);
  const monthParam = sp.month ? parseInt(sp.month, 10) : null;

  const refDate = new Date(year, monthParam !== null ? monthParam - 1 : 0, 1);
  const startDate = monthParam !== null ? startOfMonth(refDate) : startOfYear(refDate);
  const endDate = monthParam !== null ? endOfMonth(refDate) : endOfYear(refDate);

  const periodLabel =
    monthParam !== null
      ? format(refDate, "MMMM yyyy", { locale: dateLocale }).replace(/^./, (c) => c.toUpperCase())
      : `${year}`;

  const { tenantId } = session.user;

  const inspections = await db.inspection.findMany({
    where: {
      tenantId,
      scheduledDate: { gte: startDate, lte: endDate },
    },
    include: {
      findings: {
        orderBy: { severity: "desc" },
      },
    },
    orderBy: { scheduledDate: "asc" },
  });

  const allUserIds = [
    ...new Set([
      ...inspections.map((i) => i.conductedBy).filter(Boolean),
      ...inspections.flatMap((i) => i.findings.map((f) => f.responsibleId).filter(Boolean)),
    ]),
  ] as string[];

  const users = await db.user.findMany({
    where: { id: { in: allUserIds } },
    select: { id: true, name: true },
  });
  const userMap = Object.fromEntries(users.map((u) => [u.id, u.name ?? ""]));

  const allFindings = inspections.flatMap((ins) =>
    ins.findings.map((f) => ({
      ...f,
      inspectionTitle: ins.title,
      inspectionId: ins.id,
      responsibleName: f.responsibleId ? (userMap[f.responsibleId] ?? "") : "",
    }))
  );

  const summary = {
    total: inspections.length,
    completed: inspections.filter((i) => i.status === "COMPLETED").length,
    planned: inspections.filter((i) => i.status === "PLANNED").length,
    inProgress: inspections.filter((i) => i.status === "IN_PROGRESS").length,
    cancelled: inspections.filter((i) => i.status === "CANCELLED").length,
    totalFindings: allFindings.length,
    openFindings: allFindings.filter((f) => f.status === "OPEN").length,
    criticalFindings: allFindings.filter((f) => f.severity >= 4).length,
    resolvedFindings: allFindings.filter(
      (f) => f.status === "RESOLVED" || f.status === "CLOSED"
    ).length,
  };

  const completionRate =
    summary.total > 0 ? Math.round((summary.completed / summary.total) * 100) : 0;

  const bySeverity = [5, 4, 3, 2, 1].map((s) => ({
    label: severityLabels[s],
    value: allFindings.filter((f) => f.severity === s).length,
    color: ["#dc2626", "#f97316", "#f59e0b", "#84cc16", "#22c55e"][5 - s],
  }));

  const byStatus = (["COMPLETED", "IN_PROGRESS", "PLANNED", "CANCELLED"] as const).map((s) => ({
    label: statusLabels[s],
    value: inspections.filter((i) => i.status === s).length,
    color: { COMPLETED: "#22c55e", IN_PROGRESS: "#f59e0b", PLANNED: "#3b82f6", CANCELLED: "#6b7280" }[s],
  }));

  const findingsByStatus = (["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const).map((s) => ({
    label: findingStatusLabels[s],
    value: allFindings.filter((f) => f.status === s).length,
    color: { OPEN: "#dc2626", IN_PROGRESS: "#f59e0b", RESOLVED: "#22c55e", CLOSED: "#6b7280" }[s],
  }));

  const typeKeys = ["VERNERUNDE", "HMS_INSPEKSJON", "SHA_PLAN", "SIKKERHETSVANDRING", "ANDRE"];
  const byType = typeKeys
    .map((t) => {
      const ins = inspections.filter((i) => i.type === t);
      return {
        label: typeLabels[t],
        inspections: ins.length,
        findings: ins.reduce((s, i) => s + i.findings.length, 0),
      };
    })
    .filter((t) => t.inspections > 0);

  const monthlyTrend =
    monthParam === null
      ? Array.from({ length: 12 }, (_, i) => {
          const mo = new Date(year, i, 1);
          const moInsp = inspections.filter(
            (ins) => new Date(ins.scheduledDate).getMonth() === i
          );
          return {
            label: format(mo, "MMM", { locale: dateLocale }),
            inspections: moInsp.length,
            findings: moInsp.reduce((s, ins) => s + ins.findings.length, 0),
          };
        })
      : [];

  const pdfUrl = `/api/inspections/rapport?year=${year}${monthParam !== null ? `&month=${monthParam}` : ""}`;

  const openFindings = allFindings.filter(
    (f) => f.status === "OPEN" || f.status === "IN_PROGRESS"
  );

  return (
    <div className="space-y-6">
      {/* Topplinje */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/inspections">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              {t("actions.back")}
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{t("title")}</h1>
            <p className="text-muted-foreground text-sm">
              {monthParam !== null ? periodLabel : t("yearReport", { year: periodLabel })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
            <Button className="bg-green-700 hover:bg-green-800">
              <Download className="h-4 w-4 mr-2" />
              {t("actions.downloadPdf")}
            </Button>
          </a>
        </div>
      </div>

      {/* Periodevalg */}
      <PeriodSelector currentYear={year} currentMonth={monthParam} />

      {/* Nøkkeltall */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">{t("summary.totalInPeriod")}</CardDescription>
            <CardTitle className="text-3xl">{summary.total}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">
              {t("summary.completionRate", { percent: completionRate })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">{t("summary.completed")}</CardDescription>
            <CardTitle className="text-3xl text-green-700">{summary.completed}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex gap-2 flex-wrap">
              <span className="text-xs text-blue-600">{t("summary.plannedCount", { count: summary.planned })}</span>
              <span className="text-xs text-yellow-600">{t("summary.inProgressCount", { count: summary.inProgress })}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">{t("summary.openFindings")}</CardDescription>
            <CardTitle className="text-3xl text-red-600">{summary.openFindings}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">{t("summary.ofTotalFindings", { count: summary.totalFindings })}</p>
          </CardContent>
        </Card>

        <Card className={summary.criticalFindings > 0 ? "border-red-300" : ""}>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">{t("summary.criticalOrSevere")}</CardDescription>
            <CardTitle
              className={`text-3xl ${summary.criticalFindings > 0 ? "text-red-600" : "text-gray-600"}`}
            >
              {summary.criticalFindings}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">
              {t("summary.resolvedTotal", { count: summary.resolvedFindings })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Grafer */}
      <Card>
        <CardHeader>
          <CardTitle>{t("analysis.title")}</CardTitle>
          <CardDescription>{t("analysis.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <RapportCharts
            bySeverity={bySeverity}
            byStatus={byStatus}
            byType={byType}
            findingsByStatus={findingsByStatus}
            monthlyTrend={monthlyTrend}
          />
        </CardContent>
      </Card>

      {/* Åpne funn – varselboks */}
      {openFindings.length > 0 && (
        <Card className="border-orange-300 bg-orange-50">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <CardTitle className="text-orange-800">
                {t("openActions.title", { count: openFindings.length })}
              </CardTitle>
            </div>
            <CardDescription className="text-orange-700">
              {t("openActions.description")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("table.inspection")}</TableHead>
                    <TableHead>{t("table.finding")}</TableHead>
                    <TableHead>{t("table.severity")}</TableHead>
                    <TableHead>{t("table.status")}</TableHead>
                    <TableHead>{t("table.responsible")}</TableHead>
                    <TableHead>{t("table.deadline")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {openFindings.map((f) => {
                    const overdue =
                      f.dueDate && new Date(f.dueDate) < new Date() && f.status !== "RESOLVED";
                    return (
                      <TableRow key={f.id} className={overdue ? "bg-red-50" : ""}>
                        <TableCell className="text-sm">
                          <Link
                            href={`/dashboard/inspections/${f.inspectionId}`}
                            className="text-blue-600 hover:underline"
                          >
                            {f.inspectionTitle}
                          </Link>
                        </TableCell>
                        <TableCell className="font-medium text-sm">{f.title}</TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${SEVERITY_COLORS[f.severity] ?? ""}`}
                          >
                            {severityLabels[f.severity] ?? f.severity}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${FINDING_STATUS_BADGE[f.status] ?? ""}`}
                          >
                            {findingStatusLabels[f.status] ?? f.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">{f.responsibleName || t("dash")}</TableCell>
                        <TableCell className={`text-sm ${overdue ? "text-red-600 font-semibold" : ""}`}>
                          {f.dueDate
                            ? format(new Date(f.dueDate), "d. MMM yyyy", { locale: dateLocale })
                            : t("dash")}
                          {overdue && t("overdue")}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {openFindings.length === 0 && summary.total > 0 && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg p-4">
          <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
          <p className="text-green-800 text-sm font-medium">
            {t("noneOpenInPeriod")}
          </p>
        </div>
      )}

      {/* Inspeksjonstabell */}
      <Card>
        <CardHeader>
          <CardTitle>{t("inspectionsInPeriod", { count: inspections.length })}</CardTitle>
          <CardDescription>{t("inspectionsDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          {inspections.length === 0 ? (
            <div className="flex items-center gap-3 text-muted-foreground py-8 justify-center">
              <Clock className="h-8 w-8" />
              <p>{t("noInspections")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("table.title")}</TableHead>
                    <TableHead>{t("table.type")}</TableHead>
                    <TableHead>{t("table.status")}</TableHead>
                    <TableHead>{t("table.planned")}</TableHead>
                    <TableHead>{t("table.completed")}</TableHead>
                    <TableHead>{t("table.location")}</TableHead>
                    <TableHead>{t("table.performedBy")}</TableHead>
                    <TableHead className="text-center">{t("table.findings")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inspections.map((ins) => {
                    const openFnd = ins.findings.filter(
                      (f) => f.status === "OPEN" || f.status === "IN_PROGRESS"
                    ).length;
                    return (
                      <TableRow key={ins.id}>
                        <TableCell className="font-medium">
                          <Link
                            href={`/dashboard/inspections/${ins.id}`}
                            className="text-blue-600 hover:underline"
                          >
                            {ins.title}
                          </Link>
                        </TableCell>
                        <TableCell className="text-sm">
                          {typeLabels[ins.type] ?? ins.type}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${STATUS_BADGE[ins.status] ?? ""}`}
                          >
                            {statusLabels[ins.status] ?? ins.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(ins.scheduledDate), "d. MMM yyyy", { locale: dateLocale })}
                        </TableCell>
                        <TableCell className="text-sm">
                          {ins.completedDate
                            ? format(new Date(ins.completedDate), "d. MMM yyyy", { locale: dateLocale })
                            : t("dash")}
                        </TableCell>
                        <TableCell className="text-sm">{ins.location ?? t("dash")}</TableCell>
                        <TableCell className="text-sm">
                          {ins.conductedBy ? (userMap[ins.conductedBy] ?? t("dash")) : t("dash")}
                        </TableCell>
                        <TableCell className="text-center">
                          {ins.findings.length > 0 ? (
                            <span
                              className={`inline-block font-semibold text-sm ${openFnd > 0 ? "text-red-600" : "text-green-700"}`}
                            >
                              {openFnd}/{ins.findings.length}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-sm">{t("dash")}</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alle funn */}
      {allFindings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("allFindingsAndMeasures", { count: allFindings.length })}</CardTitle>
            <CardDescription>
              {t("allFindingsDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("table.inspection")}</TableHead>
                    <TableHead>{t("table.finding")}</TableHead>
                    <TableHead>{t("table.severity")}</TableHead>
                    <TableHead>{t("table.status")}</TableHead>
                    <TableHead>{t("table.location")}</TableHead>
                    <TableHead>{t("table.responsible")}</TableHead>
                    <TableHead>{t("table.deadline")}</TableHead>
                    <TableHead>{t("table.measureNote")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allFindings.map((f) => {
                    const overdue =
                      f.dueDate && new Date(f.dueDate) < new Date() && f.status !== "RESOLVED" && f.status !== "CLOSED";
                    return (
                      <TableRow key={f.id}>
                        <TableCell className="text-sm">
                          <Link
                            href={`/dashboard/inspections/${f.inspectionId}`}
                            className="text-blue-600 hover:underline text-xs"
                          >
                            {f.inspectionTitle}
                          </Link>
                        </TableCell>
                        <TableCell className="font-medium text-sm max-w-[180px]">
                          <p className="truncate" title={f.title}>{f.title}</p>
                          {f.description && (
                            <p className="text-xs text-muted-foreground truncate" title={f.description}>
                              {f.description}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${SEVERITY_COLORS[f.severity] ?? ""}`}
                          >
                            {severityLabels[f.severity] ?? f.severity}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${FINDING_STATUS_BADGE[f.status] ?? ""}`}
                          >
                            {findingStatusLabels[f.status] ?? f.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">{f.location ?? t("dash")}</TableCell>
                        <TableCell className="text-sm">{f.responsibleName || t("dash")}</TableCell>
                        <TableCell
                          className={`text-sm ${overdue ? "text-red-600 font-semibold" : ""}`}
                        >
                          {f.dueDate
                            ? format(new Date(f.dueDate), "d. MMM yyyy", { locale: dateLocale })
                            : t("dash")}
                        </TableCell>
                        <TableCell className="text-xs max-w-[160px]">
                          {f.resolutionNotes ? (
                            <span className="text-green-700" title={f.resolutionNotes}>
                              {f.resolutionNotes.slice(0, 80)}
                              {f.resolutionNotes.length > 80 ? "…" : ""}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">{t("dash")}</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bunntekst – lovhenvisning */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground border-t pt-4">
        <XCircle className="h-3 w-3 shrink-0" />
        <span>
          {t("legal")}
        </span>
      </div>
    </div>
  );
}
