import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { HmsPulseBuilder } from "@/features/dashboard/components/hms-pulse-builder";
import { WIDGET_REGISTRY } from "@/features/dashboard/lib/widget-registry";
import { UserTenant } from "@prisma/client";

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function resolveActiveTenantId(
  tenantMemberships: UserTenant[],
  sessionTenantId?: string
): string | null {
  if (sessionTenantId) {
    const hasMembership = tenantMemberships.some((membership) => membership.tenantId === sessionTenantId);
    if (!hasMembership) return null;
    return sessionTenantId;
  }
  return tenantMemberships[0]?.tenantId ?? null;
}

export default async function HmsPulsePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { tenants: true },
  });

  if (!user || user.tenants.length === 0) {
    return <div>Ingen tilgang til tenant.</div>;
  }

  const tenantId = resolveActiveTenantId(
    user.tenants,
    (session.user as { tenantId?: string }).tenantId
  );
  if (!tenantId) {
    return <div>Ingen gyldig tenant-kontekst.</div>;
  }
  const now = new Date();
  const sevenDaysFromNow = new Date(now);
  sevenDaysFromNow.setDate(now.getDate() + 7);

  const [
    risks,
    incidents,
    measures,
    trainings,
    documents,
    audits,
    inspections,
    formTemplates,
    formSubmissionCounts,
    recentFormSubmissions,
  ] = await Promise.all([
    prisma.risk.findMany({ where: { tenantId } }),
    prisma.incident.findMany({ where: { tenantId } }),
    prisma.measure.findMany({ where: { tenantId } }),
    prisma.training.findMany({ where: { tenantId } }),
    prisma.document.findMany({ where: { tenantId } }),
    prisma.audit.findMany({ where: { tenantId } }),
    prisma.inspection.findMany({ where: { tenantId } }),
    prisma.formTemplate.findMany({
      where: {
        OR: [{ tenantId }, { isGlobal: true }],
        isActive: true,
      },
      select: {
        id: true,
        title: true,
        description: true,
      },
      orderBy: { title: "asc" },
      take: 200,
    }),
    prisma.formSubmission.groupBy({
      by: ["formTemplateId"],
      where: { tenantId },
      _count: { _all: true },
    }),
    prisma.formSubmission.findMany({
      where: { tenantId },
      include: {
        formTemplate: {
          select: { title: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  const criticalRisks = risks.filter((risk) => (risk.score ?? 0) >= 15).length;
  const openIncidents = incidents.filter(
    (incident) => incident.status === "OPEN" || incident.status === "INVESTIGATING"
  ).length;
  const overdueMeasures = measures.filter(
    (measure) => measure.status !== "DONE" && new Date(measure.dueAt) < now
  ).length;
  const completedMeasures = measures.filter((measure) => measure.status === "DONE").length;
  const measureCompletionRate =
    measures.length > 0 ? Math.round((completedMeasures / measures.length) * 100) : 100;

  const expiredTraining = trainings.filter(
    (training) => training.validUntil && new Date(training.validUntil) < now && !training.completedAt
  ).length;

  const approvedDocuments = documents.filter((document) => document.status === "APPROVED").length;
  const documentComplianceRate =
    documents.length > 0 ? Math.round((approvedDocuments / documents.length) * 100) : 100;

  const upcomingAudits = audits.filter(
    (audit) =>
      audit.status !== "COMPLETED" &&
      new Date(audit.scheduledDate) >= now &&
      new Date(audit.scheduledDate) <= sevenDaysFromNow
  ).length;
  const openInspections = inspections.filter((inspection) => inspection.status !== "COMPLETED").length;
  const recentFormsCount = recentFormSubmissions.length;

  // HMS-puls (0-100): vekting for rask tilsyns-/revisjonsvurdering
  // AML § 3-1, AML § 5-1 og Internkontrollforskriften § 5.
  const pulseScore = clamp(
    Math.round(
      100 -
        criticalRisks * 4 -
        openIncidents * 3 -
        overdueMeasures * 4 -
        expiredTraining * 3 -
        Math.max(0, 80 - measureCompletionRate) * 0.4 -
        Math.max(0, 80 - documentComplianceRate) * 0.2
    )
  );

  const pulseLevel =
    pulseScore >= 80 ? "god" : pulseScore >= 60 ? "må følges opp" : "kritisk oppfølging";
  const pulseBadgeClassName =
    pulseScore >= 80
      ? "bg-green-100 text-green-700 border-green-200"
      : pulseScore >= 60
      ? "bg-amber-100 text-amber-700 border-amber-200"
      : "bg-red-100 text-red-700 border-red-200";

  const functionOptions = WIDGET_REGISTRY.filter((item) => item.href.trim().length > 0).map((item) => ({
    label: item.label,
    href: item.href,
  }));
  const formOptions = formTemplates.map((template) => ({
    label: template.title,
    href: `/dashboard/wellbeing`,
  }));

  const complianceStatus = [
    {
      key: "riskAssessment" as const,
      label: "Kritiske",
      value: String(criticalRisks),
      severity: criticalRisks > 0 ? ("critical" as const) : ("ok" as const),
    },
    {
      key: "incidents" as const,
      label: "Åpne avvik",
      value: String(openIncidents),
      severity: openIncidents > 0 ? ("warning" as const) : ("ok" as const),
    },
    {
      key: "formsLatest" as const,
      label: "Siste innsendinger",
      value: String(recentFormsCount),
      severity: recentFormsCount > 0 ? ("ok" as const) : ("warning" as const),
    },
    {
      key: "inspections" as const,
      label: "Åpne",
      value: String(openInspections),
      severity: openInspections > 0 ? ("warning" as const) : ("ok" as const),
    },
    {
      key: "measures" as const,
      label: "Forfalte",
      value: String(overdueMeasures),
      severity: overdueMeasures > 0 ? ("critical" as const) : ("ok" as const),
    },
    {
      key: "training" as const,
      label: "Utgått",
      value: String(expiredTraining),
      severity: expiredTraining > 0 ? ("warning" as const) : ("ok" as const),
    },
    {
      key: "documents" as const,
      label: "Godkjente",
      value: `${approvedDocuments}/${documents.length}`,
      severity: documentComplianceRate < 80 ? ("warning" as const) : ("ok" as const),
    },
    {
      key: "audits" as const,
      label: "Neste 7 dager",
      value: String(upcomingAudits),
      severity: upcomingAudits > 0 ? ("warning" as const) : ("ok" as const),
    },
  ];

  const formSubmissionCountByTemplateId = new Map<string, number>(
    formSubmissionCounts.map((entry) => [entry.formTemplateId, entry._count._all])
  );
  const activeMeasures = measures.filter((measure) => measure.status !== "DONE").length;
  const activeAudits = audits.filter((audit) => audit.status !== "COMPLETED").length;

  const itemCountByHref: Record<string, number> = {
    "/dashboard/risks": risks.length,
    "/dashboard/incidents": openIncidents,
    "/dashboard/actions": activeMeasures,
    "/dashboard/training": trainings.filter((training) => !training.completedAt).length,
    "/dashboard/documents": documents.length,
    "/dashboard/audits": activeAudits,
    "/dashboard/inspections": openInspections,
    "/dashboard/wellbeing": formTemplates.length,
  };

  for (const form of formTemplates) {
    itemCountByHref[`/dashboard/wellbeing`] =
      (itemCountByHref[`/dashboard/wellbeing`] ?? 0) + (formSubmissionCountByTemplateId.get(form.id) ?? 0);
  }

  for (const option of functionOptions) {
    if (itemCountByHref[option.href] !== undefined) {
      continue;
    }
    if (option.href.startsWith("/dashboard/wellbeing")) {
      continue;
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">HMS-puls</h1>
          <p className="text-muted-foreground">
            Rask statusoversikt for ledelse, tilsyn og revisjon.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={pulseBadgeClassName}>
            Puls: {pulseScore}/100 · {pulseLevel}
          </Badge>
          <Button asChild variant="outline" size="sm">
            <Link href="/api/hms-pulse/export">Eksporter PDF</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <PulseStatCard
          title="Kritiske risikoer"
          value={criticalRisks}
          href="/dashboard/risks"
          severity={criticalRisks > 0 ? "critical" : "ok"}
        />
        <PulseStatCard
          title="Åpne avvik"
          value={openIncidents}
          href="/dashboard/incidents"
          severity={openIncidents > 0 ? "warning" : "ok"}
        />
        <PulseStatCard
          title="Forfalte tiltak"
          value={overdueMeasures}
          href="/dashboard/actions"
          severity={overdueMeasures > 0 ? "critical" : "ok"}
        />
        <PulseStatCard
          title="Utgått opplæring"
          value={expiredTraining}
          href="/dashboard/training"
          severity={expiredTraining > 0 ? "warning" : "ok"}
        />
      </div>

      <HmsPulseBuilder
        complianceStatus={complianceStatus}
        functionOptions={functionOptions}
        formOptions={formOptions}
        itemCountByHref={itemCountByHref}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Tilsynsberedskap</CardTitle>
            <CardDescription>
              Dokumentasjon av systematisk HMS-arbeid (AML § 3-1, AML § 5-1, IK-HMS § 5).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <StatusRow
              title="Tiltaksgjennomføring"
              detail={`${completedMeasures} av ${measures.length} tiltak fullført`}
              value={`${measureCompletionRate}%`}
              href="/dashboard/actions"
            />
            <StatusRow
              title="Dokumentstatus"
              detail={`${approvedDocuments} av ${documents.length} dokumenter godkjent`}
              value={`${documentComplianceRate}%`}
              href="/dashboard/documents"
            />
            <StatusRow
              title="Kommende revisjoner (7 dager)"
              detail="Sikre planlegging og tilgjengelig dokumentasjon"
              value={String(upcomingAudits)}
              href="/dashboard/audits"
            />
            <StatusRow
              title="Åpne vernerunder"
              detail="Oppfølging av funn og frister"
              value={String(openInspections)}
              href="/dashboard/inspections"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Siste utfylte skjemaer</CardTitle>
            <CardDescription>Brukes ofte i tilsyn og revisjoner</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {recentFormSubmissions.map((submission) => (
              <Link
                key={submission.id}
                href={`/dashboard/wellbeing`}
                className="flex items-center justify-between rounded-md border p-2 hover:bg-muted/40 transition-colors"
              >
                <span className="truncate pr-2">{submission.formTemplate.title}</span>
                <Badge variant="outline" className="shrink-0">
                  {new Date(submission.createdAt).toLocaleDateString("nb-NO")}
                </Badge>
              </Link>
            ))}
            {recentFormSubmissions.length === 0 && (
              <div className="text-muted-foreground">Ingen skjemaer fylt ut ennå.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function PulseStatCard({
  title,
  value,
  href,
  severity,
}: {
  title: string;
  value: number;
  href: string;
  severity: "ok" | "warning" | "critical";
}) {
  const className =
    severity === "critical"
      ? "border-red-200 bg-red-50"
      : severity === "warning"
      ? "border-amber-200 bg-amber-50"
      : "border-green-200 bg-green-50";
  const icon =
    severity === "critical" ? (
      <AlertTriangle className="h-4 w-4 text-red-600" />
    ) : severity === "warning" ? (
      <ShieldAlert className="h-4 w-4 text-amber-600" />
    ) : (
      <CheckCircle2 className="h-4 w-4 text-green-600" />
    );

  return (
    <Link href={href}>
      <Card className={`transition-colors hover:bg-muted/40 ${className}`}>
        <CardContent className="pt-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{title}</p>
            {icon}
          </div>
          <p className="mt-2 text-3xl font-bold">{value}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

function StatusRow({
  title,
  detail,
  value,
  href,
}: {
  title: string;
  detail: string;
  value: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-md border p-3 hover:bg-muted/40 transition-colors"
    >
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </div>
      <Badge variant="outline">{value}</Badge>
    </Link>
  );
}
