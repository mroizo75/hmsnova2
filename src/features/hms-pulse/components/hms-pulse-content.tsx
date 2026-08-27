"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { HmsPulseBuilder } from "@/features/dashboard/components/hms-pulse-builder";
import { fetchHmsPulseData } from "@/server/queries/hms-pulse.queries";

type PulseData = NonNullable<Awaited<ReturnType<typeof fetchHmsPulseData>>>;

interface HmsPulseContentProps {
  initialData: PulseData;
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

export function HmsPulseContent({ initialData }: HmsPulseContentProps) {
  const { data } = useQuery({
    queryKey: ["hms-pulse"],
    queryFn: () => fetchHmsPulseData(),
    initialData,
  });

  if (!data) return null;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">HMS-puls</h1>
          <p className="text-muted-foreground">
            Rask statusoversikt for ledelse, tilsyn og revisjon.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={data.pulseBadgeClassName}>
            Puls: {data.pulseScore}/100 · {data.pulseLevel}
          </Badge>
          <Button asChild variant="outline" size="sm">
            <Link href="/api/hms-pulse/export">Eksporter PDF</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <PulseStatCard
          title="Kritiske risikoer"
          value={data.criticalRisks}
          href="/dashboard/risks"
          severity={data.criticalRisks > 0 ? "critical" : "ok"}
        />
        <PulseStatCard
          title="Åpne avvik"
          value={data.openIncidents}
          href="/dashboard/incidents"
          severity={data.openIncidents > 0 ? "warning" : "ok"}
        />
        <PulseStatCard
          title="Forfalte tiltak"
          value={data.overdueMeasures}
          href="/dashboard/actions"
          severity={data.overdueMeasures > 0 ? "critical" : "ok"}
        />
        <PulseStatCard
          title="Utgått opplæring"
          value={data.expiredTraining}
          href="/dashboard/training"
          severity={data.expiredTraining > 0 ? "warning" : "ok"}
        />
      </div>

      <HmsPulseBuilder
        complianceStatus={data.complianceStatus}
        functionOptions={data.functionOptions}
        formOptions={data.formOptions}
        itemCountByHref={data.itemCountByHref}
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
              detail={`${data.completedMeasures} av ${data.measuresTotal} tiltak fullført`}
              value={`${data.measureCompletionRate}%`}
              href="/dashboard/actions"
            />
            <StatusRow
              title="Dokumentstatus"
              detail={`${data.approvedDocuments} av ${data.documentsTotal} dokumenter godkjent`}
              value={`${data.documentComplianceRate}%`}
              href="/dashboard/documents"
            />
            <StatusRow
              title="Kommende revisjoner (7 dager)"
              detail="Sikre planlegging og tilgjengelig dokumentasjon"
              value={String(data.upcomingAudits)}
              href="/dashboard/audits"
            />
            <StatusRow
              title="Åpne vernerunder"
              detail="Oppfølging av funn og frister"
              value={String(data.openInspections)}
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
            {data.recentFormSubmissions.map((submission: any) => (
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
            {data.recentFormSubmissions.length === 0 && (
              <div className="text-muted-foreground">Ingen skjemaer fylt ut ennå.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
