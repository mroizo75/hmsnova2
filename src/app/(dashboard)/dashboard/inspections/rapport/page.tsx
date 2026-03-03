import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import { getPermissions } from "@/lib/permissions";
import { db } from "@/lib/db";
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import { nb } from "date-fns/locale";
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

const TYPE_LABELS: Record<string, string> = {
  VERNERUNDE: "Vernerunde",
  HMS_INSPEKSJON: "HMS-inspeksjon",
  BRANNØVELSE: "Brannøvelse",
  SHA_PLAN: "SHA-plan",
  SIKKERHETSVANDRING: "Sikkerhetsvandring",
  ANDRE: "Annet",
};

const STATUS_LABELS: Record<string, string> = {
  PLANNED: "Planlagt",
  IN_PROGRESS: "Pågår",
  COMPLETED: "Fullført",
  CANCELLED: "Avbrutt",
};

const FINDING_STATUS_LABELS: Record<string, string> = {
  OPEN: "Åpen",
  IN_PROGRESS: "Under arbeid",
  RESOLVED: "Løst",
  CLOSED: "Lukket",
};

const SEVERITY_LABELS: Record<number, string> = {
  1: "Lav",
  2: "Moderat",
  3: "Betydelig",
  4: "Alvorlig",
  5: "Kritisk",
};

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
      ? format(refDate, "MMMM yyyy", { locale: nb }).replace(/^./, (c) => c.toUpperCase())
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
    label: SEVERITY_LABELS[s],
    value: allFindings.filter((f) => f.severity === s).length,
    color: ["#dc2626", "#f97316", "#f59e0b", "#84cc16", "#22c55e"][5 - s],
  }));

  const byStatus = (["COMPLETED", "IN_PROGRESS", "PLANNED", "CANCELLED"] as const).map((s) => ({
    label: STATUS_LABELS[s],
    value: inspections.filter((i) => i.status === s).length,
    color: { COMPLETED: "#22c55e", IN_PROGRESS: "#f59e0b", PLANNED: "#3b82f6", CANCELLED: "#6b7280" }[s],
  }));

  const findingsByStatus = (["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const).map((s) => ({
    label: FINDING_STATUS_LABELS[s],
    value: allFindings.filter((f) => f.status === s).length,
    color: { OPEN: "#dc2626", IN_PROGRESS: "#f59e0b", RESOLVED: "#22c55e", CLOSED: "#6b7280" }[s],
  }));

  const typeKeys = ["VERNERUNDE", "HMS_INSPEKSJON", "BRANNØVELSE", "SHA_PLAN", "SIKKERHETSVANDRING", "ANDRE"];
  const byType = typeKeys
    .map((t) => {
      const ins = inspections.filter((i) => i.type === t);
      return {
        label: TYPE_LABELS[t],
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
            label: format(mo, "MMM", { locale: nb }),
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
              Tilbake
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Inspeksjonsrapport</h1>
            <p className="text-muted-foreground text-sm">
              {monthParam !== null ? periodLabel : `Årsrapport ${periodLabel}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
            <Button className="bg-green-700 hover:bg-green-800">
              <Download className="h-4 w-4 mr-2" />
              Last ned PDF
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
            <CardDescription className="text-xs">Totalt i perioden</CardDescription>
            <CardTitle className="text-3xl">{summary.total}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">
              {completionRate} % gjennomføringssgrad
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Fullført</CardDescription>
            <CardTitle className="text-3xl text-green-700">{summary.completed}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex gap-2 flex-wrap">
              <span className="text-xs text-blue-600">{summary.planned} planlagt</span>
              <span className="text-xs text-yellow-600">{summary.inProgress} pågår</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Åpne funn</CardDescription>
            <CardTitle className="text-3xl text-red-600">{summary.openFindings}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">av {summary.totalFindings} totalt</p>
          </CardContent>
        </Card>

        <Card className={summary.criticalFindings > 0 ? "border-red-300" : ""}>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">Kritiske/alvorlige funn</CardDescription>
            <CardTitle
              className={`text-3xl ${summary.criticalFindings > 0 ? "text-red-600" : "text-gray-600"}`}
            >
              {summary.criticalFindings}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">
              {summary.resolvedFindings} løst totalt
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Grafer */}
      <Card>
        <CardHeader>
          <CardTitle>Analyse og oversikt</CardTitle>
          <CardDescription>Distribusjon av inspeksjoner og funn i perioden</CardDescription>
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
                Åpne tiltak som krever oppfølging ({openFindings.length})
              </CardTitle>
            </div>
            <CardDescription className="text-orange-700">
              Jf. AML § 3-1 og IK-HMS-forskriften § 5 – disse funnene krever at tiltak gjennomføres
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Inspeksjon</TableHead>
                    <TableHead>Funn</TableHead>
                    <TableHead>Alvorlighet</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ansvarlig</TableHead>
                    <TableHead>Frist</TableHead>
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
                            {SEVERITY_LABELS[f.severity] ?? f.severity}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${FINDING_STATUS_BADGE[f.status] ?? ""}`}
                          >
                            {FINDING_STATUS_LABELS[f.status] ?? f.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">{f.responsibleName || "–"}</TableCell>
                        <TableCell className={`text-sm ${overdue ? "text-red-600 font-semibold" : ""}`}>
                          {f.dueDate
                            ? format(new Date(f.dueDate), "d. MMM yyyy", { locale: nb })
                            : "–"}
                          {overdue && " ⚠ Forfalt"}
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
            Ingen åpne funn i valgt periode – alle registrerte tiltak er lukket.
          </p>
        </div>
      )}

      {/* Inspeksjonstabell */}
      <Card>
        <CardHeader>
          <CardTitle>Inspeksjoner i perioden ({inspections.length})</CardTitle>
          <CardDescription>Komplett oversikt over alle inspeksjoner</CardDescription>
        </CardHeader>
        <CardContent>
          {inspections.length === 0 ? (
            <div className="flex items-center gap-3 text-muted-foreground py-8 justify-center">
              <Clock className="h-8 w-8" />
              <p>Ingen inspeksjoner i valgt periode</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tittel</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Planlagt</TableHead>
                    <TableHead>Gjennomført</TableHead>
                    <TableHead>Lokasjon</TableHead>
                    <TableHead>Gjennomført av</TableHead>
                    <TableHead className="text-center">Funn</TableHead>
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
                          {TYPE_LABELS[ins.type] ?? ins.type}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${STATUS_BADGE[ins.status] ?? ""}`}
                          >
                            {STATUS_LABELS[ins.status] ?? ins.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(ins.scheduledDate), "d. MMM yyyy", { locale: nb })}
                        </TableCell>
                        <TableCell className="text-sm">
                          {ins.completedDate
                            ? format(new Date(ins.completedDate), "d. MMM yyyy", { locale: nb })
                            : "–"}
                        </TableCell>
                        <TableCell className="text-sm">{ins.location ?? "–"}</TableCell>
                        <TableCell className="text-sm">
                          {ins.conductedBy ? (userMap[ins.conductedBy] ?? "–") : "–"}
                        </TableCell>
                        <TableCell className="text-center">
                          {ins.findings.length > 0 ? (
                            <span
                              className={`inline-block font-semibold text-sm ${openFnd > 0 ? "text-red-600" : "text-green-700"}`}
                            >
                              {openFnd}/{ins.findings.length}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-sm">–</span>
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
            <CardTitle>Alle funn og tiltak ({allFindings.length})</CardTitle>
            <CardDescription>
              Detaljert oversikt med alvorlighet, ansvarlig og tiltak
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Inspeksjon</TableHead>
                    <TableHead>Funn</TableHead>
                    <TableHead>Alvorlighet</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Lokasjon</TableHead>
                    <TableHead>Ansvarlig</TableHead>
                    <TableHead>Frist</TableHead>
                    <TableHead>Tiltak/Merknad</TableHead>
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
                            {SEVERITY_LABELS[f.severity] ?? f.severity}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${FINDING_STATUS_BADGE[f.status] ?? ""}`}
                          >
                            {FINDING_STATUS_LABELS[f.status] ?? f.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">{f.location ?? "–"}</TableCell>
                        <TableCell className="text-sm">{f.responsibleName || "–"}</TableCell>
                        <TableCell
                          className={`text-sm ${overdue ? "text-red-600 font-semibold" : ""}`}
                        >
                          {f.dueDate
                            ? format(new Date(f.dueDate), "d. MMM yyyy", { locale: nb })
                            : "–"}
                        </TableCell>
                        <TableCell className="text-xs max-w-[160px]">
                          {f.resolutionNotes ? (
                            <span className="text-green-700" title={f.resolutionNotes}>
                              {f.resolutionNotes.slice(0, 80)}
                              {f.resolutionNotes.length > 80 ? "…" : ""}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">–</span>
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
          Jf. Arbeidsmiljøloven § 5-1 (registreringsplikt), § 5-2 (varslingsplikt), § 3-1
          (systematisk HMS-arbeid) og IK-HMS-forskriften § 5. ISO 45001:2018 kap. 9.1.
        </span>
      </div>
    </div>
  );
}
