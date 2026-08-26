"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Info } from "lucide-react";
import { HseStatisticsTable } from "@/features/incidents/components/hse-statistics-table";
import { fetchIncidentStatistics } from "@/server/queries/incident-statistics.queries";

type StatisticsData = Awaited<ReturnType<typeof fetchIncidentStatistics>>;

interface IncidentStatisticsContentProps {
  initialData: StatisticsData;
  locale: string;
}

function StatCard({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub: string;
  highlight: "red" | "green" | "amber" | "gray";
}) {
  const colors = {
    red: "border-red-200 bg-red-50",
    green: "border-green-200 bg-green-50",
    amber: "border-amber-200 bg-amber-50",
    gray: "bg-card",
  };
  const valueColors = {
    red: "text-red-700",
    green: "text-green-700",
    amber: "text-amber-700",
    gray: "text-foreground",
  };

  return (
    <div className={`rounded-xl border p-4 ${colors[highlight]}`}>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
        {label}
      </p>
      <p className={`text-3xl font-bold ${valueColors[highlight]}`}>{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{sub}</p>
    </div>
  );
}

export function IncidentStatisticsContent({ initialData, locale }: IncidentStatisticsContentProps) {
  const t = useTranslations("dashboardIncidentStatisticsPage");

  const { data: yearData } = useQuery({
    queryKey: ["incidents", "statistics"],
    queryFn: () => fetchIncidentStatistics(),
    initialData,
  });

  const hasTimeRegistration = yearData.some((y: any) => y.manHours > 0);
  const ytd = yearData[yearData.length - 1];

  return (
    <>
      {!hasTimeRegistration && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <div className="text-sm text-amber-900">
            <p className="font-semibold">{t("missingHours.title")}</p>
            <p className="mt-0.5">
              {t("missingHours.descriptionStart")}{" "}
              <Link href="/dashboard/time-registration" className="underline font-medium">
                {t("missingHours.timeRegistration")}
              </Link>{" "}
              {t("missingHours.descriptionEnd")}
            </p>
          </div>
        </div>
      )}

      <div>
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          {t("ytd", { year: ytd.year })}
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="TRIR"
            value={ytd.trir !== null ? ytd.trir.toString() : "—"}
            sub={t("cards.trirSubtitle")}
            highlight={ytd.trir !== null && ytd.trir > 5 ? "red" : ytd.trir !== null ? "green" : "gray"}
          />
          <StatCard
            label={t("cards.lti.title")}
            value={ytd.lostTimeIncidents.toString()}
            sub={t("cards.lti.subtitle", { count: ytd.lostWorkdays })}
            highlight={ytd.lostTimeIncidents > 0 ? "red" : "green"}
          />
          <StatCard
            label={t("cards.workedHours.title")}
            value={ytd.manHours > 0 ? ytd.manHours.toLocaleString(locale === "en" ? "en-US" : "nb-NO") : "—"}
            sub={t("cards.workedHours.subtitle")}
            highlight="gray"
          />
          <StatCard
            label={t("cards.recordable.title")}
            value={ytd.totalRecordable.toString()}
            sub={t("cards.recordable.subtitle")}
            highlight={ytd.totalRecordable > 0 ? "amber" : "green"}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("history.title")}</CardTitle>
          <CardDescription>{t("history.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <HseStatisticsTable data={yearData} />
        </CardContent>
      </Card>

      <Card className="border-blue-200 bg-blue-50/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="h-4 w-4 text-blue-600" />
            {t("trir.title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-900 space-y-3">
          <p>{t("trir.description")}</p>
          <div className="rounded-md bg-blue-100 border border-blue-200 px-4 py-3 font-mono text-xs">
            {t("trir.formula")}
          </div>
          <div className="grid sm:grid-cols-2 gap-3 text-xs">
            <div>
              <p className="font-semibold mb-1">{t("trir.incidentTypes")}</p>
              <ul className="space-y-0.5 list-disc list-inside text-blue-800">
                <li>{t("trir.incidents.fatalities")}</li>
                <li>{t("trir.incidents.lti")}</li>
                <li>{t("trir.incidents.restrictedWork")}</li>
                <li>{t("trir.incidents.medicalTreatment")}</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold mb-1">{t("trir.benchmarks")}</p>
              <ul className="space-y-0.5 list-disc list-inside text-blue-800">
                <li>{t("trir.benchmarkList.b1")}</li>
                <li>{t("trir.benchmarkList.b2")}</li>
                <li>{t("trir.benchmarkList.b3")}</li>
                <li>{t("trir.benchmarkList.b4")}</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
